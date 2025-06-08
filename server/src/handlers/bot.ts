import { Client, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction, ModalSubmitInteraction, MessageFlags, Message, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import dbService , { ChatThreadData, UserTokenData } from '../services/database.js';
import { ChannelService } from '../services/channel.js';
import { WebSocketService } from '../services/websocket.js';
import { LoginCommandHandler } from './commands/login.js';
// import { LogoutCommandHandler } from './commands/logout.js';
import { ChatInfoCommandHandler } from './commands/chatinfo.js';
import { StartChatCommandHandler } from './commands/startchat.js';

export interface CommandHandler {
  handle(interaction: ChatInputCommandInteraction): Promise<void>;
}

export class DiscordBot {
  private readonly client: Client;
  private readonly channelService: ChannelService;
  private wsService: WebSocketService | null = null;
  private rest: REST;

  private commandHandlers: Map<string, CommandHandler>;
  private modalHandlers: Map<string, (interaction: ModalSubmitInteraction) => Promise<void>>;
  private selectMenuHandlers: Map<string, (interaction: StringSelectMenuInteraction) => Promise<void>>;

  private readonly startChatHandler: StartChatCommandHandler;
  private readonly token: string;

  constructor() {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }
    this.token = process.env.DISCORD_TOKEN;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping
      ],
    });

    // Initialize services
    this.channelService = new ChannelService();
    this.rest = new REST();
    const loginHandler = new LoginCommandHandler(this);
    this.startChatHandler = new StartChatCommandHandler(this);
    this.commandHandlers = new Map<string, CommandHandler>([
      ['login', loginHandler],
      // ['logout', new LogoutCommandHandler(this)],
      ['chatinfo', new ChatInfoCommandHandler(this)],
      ['startchat', this.startChatHandler],
      ['channel', { handle: this.handleChannelCommand.bind(this) }],
      ['endchat', { handle: this.handleEndChatCommand.bind(this) }],
    ]);
    this.modalHandlers = new Map<string, (interaction: ModalSubmitInteraction) => Promise<void>>([
      ['loginModal', loginHandler.handleModalSubmit.bind(loginHandler)],
    ]);
    
    this.selectMenuHandlers = new Map<string, (interaction: StringSelectMenuInteraction) => Promise<void>>([
      ['tokenSelection', this.handleTokenSelection.bind(this)],
    ]);

    this.setupEventHandlers();
  }

  setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
    this.startChatHandler.setWebSocketService(wsService);
  }

  private setupEventHandlers(): void {
    this.client.on('ready', async () => {
      console.log(`Bot is online as ${this.client.user?.tag}!`);
      console.log(`Bot is in ${this.client.guilds.cache.size} guilds`);
      await this.registerSlashCommands();
    });

    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          const handler = this.commandHandlers.get(interaction.commandName);
          if (handler) {
            console.log(`Slash command received: ${interaction.commandName}`);
            await handler.handle(interaction);
          } else {
            await interaction.reply({ content: 'Unknown command!', ephemeral: true });
          }
        } else if (interaction.isModalSubmit()) {
          const modalHandler = this.modalHandlers.get(interaction.customId);
          if (modalHandler) {
            console.log(`Modal submit received: ${interaction.customId}`);
            await modalHandler(interaction);
          }
        } else if (interaction.isStringSelectMenu()) {
          const selectHandler = this.selectMenuHandlers.get(interaction.customId);
          if (selectHandler) {
            console.log(`Select menu interaction received: ${interaction.customId}`);
            await selectHandler(interaction);
          }
        }
      } catch (error) {
        console.error('Interaction handler error:', error);
        if (interaction.isRepliable()) {
          await interaction.reply({ content: 'Đã xảy ra lỗi khi xử lý lệnh.', ephemeral: true });
        }
      }
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      if (message.channel.isThread()) {
        console.log(message.channel.id);
        return;
      }
    });

    this.client.on('error', console.error);
    this.client.on('warn', console.warn);

    process.on('SIGINT', () => {
      console.log('Shutting down bot...');
      dbService.close();
      this.client.destroy();
      process.exit(0);
    });
  }

  private async registerSlashCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName('login')
        .setDescription('Đăng nhập với CVNL token'),
      new SlashCommandBuilder()
        .setName('logout')
        .setDescription('Đăng xuất và xóa kênh chat'),
      new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Xem thông tin kênh chat của bạn'),
      new SlashCommandBuilder()
        .setName('chatinfo')
        .setDescription('Xem thông tin chat hiện tại của các tài khoản CVNL'),
      new SlashCommandBuilder()
        .setName('startchat')
        .setDescription('Bắt đầu tìm kiếm và chat với người lạ'),
      new SlashCommandBuilder()
        .setName('endchat')
        .setDescription('Kết thúc cuộc trò chuyện hiện tại trong thread này'),
    ];

    try {
      const clientId = this.client.user?.id;
      if (!clientId) throw new Error('Client ID not found');

      this.rest.setToken(process.env.DISCORD_TOKEN!);
      
      console.log('Registering slash commands...');
      
      // Register globally
      const result = await this.rest.put(
        Routes.applicationCommands(clientId),
        { body: commands.map(command => command.toJSON()) }
      );
      
      console.log('Slash commands registered successfully!');
      
      // Also register for each guild (faster update)
      for (const [guildId] of this.client.guilds.cache) {
        await this.rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands.map(command => command.toJSON()) }
        );
      }
      
    } catch (error) {
      console.error('Failed to register slash commands:', error);
    }
  }

  private async handleChannelCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const discordId = interaction.user.id;
    const channelId = interaction.channelId;
    
    try {
      // Get all user tokens/channels
      const userTokens: UserTokenData[] = await dbService.getUserTokens(discordId);
      console.log(userTokens);
      
      
      if (!userTokens || userTokens.length === 0) {
        await interaction.reply({
          content: 'Bạn chưa có token nào được đăng ký. Hãy sử dụng lệnh /login để đăng ký token.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Check if user is in one of their private channels
      const currentChannelToken = userTokens.find((token: UserTokenData) => token.channelId === channelId);
      
      if (currentChannelToken) {
        // User is in their private channel, show channel info directly
        // show thêm cả channel id của discord nữa

        await interaction.reply({
          content: `Kênh chat của bạn: <#${currentChannelToken.channelId}>\nCVNL User: ${currentChannelToken.cvnlUserName}\nDiscord Channel ID: ${channelId}`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // User is not in their private channel, show token selection dropdown
      if (userTokens.length === 1) {
        // Only one token, show info directly
        const token = userTokens[0];
        const channel = await this.channelService.getChannelById(token.channelId);
        if (channel) {
          await interaction.reply({
            content: `Kênh chat của bạn: <#${token.channelId}>\nCVNL User: ${token.cvnlUserName}`,
            flags: MessageFlags.Ephemeral
          });
        } else {
          await interaction.reply({
            content: 'Không thể tìm thấy kênh chat. Hãy thử đăng nhập lại.',
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      // Multiple tokens, show dropdown selection
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('tokenSelection')
        .setPlaceholder('Chọn tài khoản CVNL để xem thông tin kênh')
        .addOptions(
          userTokens.map((token: UserTokenData) => ({
            label: token.cvnlUserName,
            value: token.cvnlUserId,
            description: `Token: ${token.token.substring(0, 10)}...`
          }))
        );

      const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.reply({
        content: 'Chọn tài khoản CVNL để xem thông tin kênh:',
        components: [actionRow],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error('Channel command error:', error);
      await interaction.reply({ 
        content: 'Có lỗi xảy ra khi lấy thông tin kênh.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  private async handleTokenSelection(interaction: StringSelectMenuInteraction): Promise<void> {
    const selectedUserId = interaction.values[0];
    const discordId = interaction.user.id;

    try {
      const userTokens: UserTokenData[] = await dbService.getUserTokens(discordId);
      const selectedToken = userTokens.find((token: UserTokenData) => token.cvnlUserId === selectedUserId);

      if (!selectedToken) {
        await interaction.reply({
          content: 'Không tìm thấy token được chọn.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const channel = await this.channelService.getChannelById(selectedToken.channelId);
      if (channel) {
        await interaction.reply({
          content: `Kênh chat của **${selectedToken.cvnlUserName}**: <#${selectedToken.channelId}>`,
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: `Token của **${selectedToken.cvnlUserName}** hợp lệ nhưng không tìm thấy kênh chat. Hãy thử đăng nhập lại.`,
          flags: MessageFlags.Ephemeral
        });
      }

    } catch (error) {
      console.error('Token selection error:', error);
      await interaction.reply({
        content: 'Có lỗi xảy ra khi xử lý lựa chọn token.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  private async handleEndChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const discordId = interaction.user.id;
    const channelId = interaction.channelId;
    console.log(interaction);

    try {
      const remoteThread = await this.channelService.getChannelById(channelId);
      if (!remoteThread || !remoteThread.isThread()) {
        await interaction.reply({
          content: 'Bạn không ở trong một thread hợp lệ để kết thúc cuộc trò chuyện.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      const allChatThreads = await dbService.getAllChatThreads();
      const chatThread = allChatThreads.find((ct: ChatThreadData) =>
        ct.discordId === discordId
      );

      if (!chatThread) {
        await interaction.reply({ 
          content: 'Bạn hiện không có cuộc trò chuyện nào đang diễn ra.', 
          flags: MessageFlags.Ephemeral 
        });
        return;
      }

      // Delete thread and chat data
      await dbService.deleteChatThreadById(chatThread.id);

      try {
        const thread = await this.channelService.getChannelById(chatThread.threadId);
        if (thread && thread.isThread()) {
          await thread.setArchived(true);
          await thread.setLocked(true);
        }
      } catch (error) {
        console.error('Error archiving thread:', error);
      }

      // Notify the web client
      // const user = await dbService.getUser(discordId, );
      // if (user && this.wsService) {
      //   const sent = this.wsService.sendToUser(user.cvnlUserId, 'chat_ended_from_discord', {
      //     chatId: chatThread.chatId,
      //     reason: 'ended_by_user'
      //   });
      //
      //   if (!sent) {
      //     console.log('User not connected to websocket, chat ended silently');
      //   }
      // }
      //
      // await interaction.reply({
      //   content: 'Đã kết thúc cuộc trò chuyện.',
      //   flags: MessageFlags.Ephemeral
      // });
      //
      // console.log(`Chat ${chatThread.chatId} ended by user ${user?.cvnlUserName} via Discord command`);

    } catch (error) {
      console.error('End chat command error:', error);
      await interaction.reply({ 
        content: 'Có lỗi xảy ra khi kết thúc cuộc trò chuyện.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  async start(): Promise<void> {
    try {
      await this.client.login(this.token);
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  /**
   * Get the Discord client instance.
   * @returns {Client} The Discord client.
   * @throws {Error} If the client is not initialized.
   */
  getClient(): Client {
    if (!this.client) {
      throw new Error('Discord client is not initialized');
    }
    return this.client;
  }

  getChannelService(): ChannelService {
    return this.channelService;
  }
}
