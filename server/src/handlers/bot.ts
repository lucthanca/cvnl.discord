import { Client, Events, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction, ModalSubmitInteraction, MessageFlags, Message, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { DatabaseService, ChatThreadData } from '../services/database.js';
import { CVNLApiService } from '../services/api.js';
import { ChannelService } from '../services/channel.js';
import { WebSocketService } from '../services/websocket.js';
import { LoginCommandHandler } from './commands/login.js';
import { LogoutCommandHandler } from './commands/logout.js';
import { ChatInfoCommandHandler } from './commands/chatinfo.js';
import { StartChatCommandHandler } from './commands/startchat.js';

export class DiscordBotHandler {
  private client: Client;
  private dbService: DatabaseService;
  private channelService: ChannelService;
  private wsService: WebSocketService | null = null;
  private rest: REST;

  // Command handlers
  private loginHandler: LoginCommandHandler;
  private logoutHandler: LogoutCommandHandler;
  private chatInfoHandler: ChatInfoCommandHandler;
  private startChatHandler: StartChatCommandHandler;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping
      ],
    });

    // Initialize services
    const apiService = new CVNLApiService();
    this.dbService = new DatabaseService();
    this.channelService = new ChannelService(this.client, this.dbService);
    this.rest = new REST();

    // Initialize command handlers
    this.loginHandler = new LoginCommandHandler(this.dbService, apiService, this.channelService);
    this.logoutHandler = new LogoutCommandHandler(this.dbService);
    this.chatInfoHandler = new ChatInfoCommandHandler(this.dbService);
    this.startChatHandler = new StartChatCommandHandler(this.dbService);

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
      console.log('Interaction received:', interaction.type, interaction.isCommand?.() ? interaction.commandName : 'not a command');
      
      if (interaction.isChatInputCommand()) {
        console.log('Slash command received:', interaction.commandName);
        
        switch (interaction.commandName) {
          case 'login':
            await this.loginHandler.handleSlashCommand(interaction);
            break;
          case 'logout':
            await this.logoutHandler.handleSlashCommand(interaction);
            break;
          case 'chatinfo':
            await this.chatInfoHandler.handleSlashCommand(interaction);
            break;
          case 'startchat':
            await this.startChatHandler.handleSlashCommand(interaction);
            break;
          case 'channel':
            await this.handleChannelCommand(interaction);
            break;
          case 'endchat':
            await this.handleEndChatCommand(interaction);
            break;
          default:
            await interaction.reply({ content: 'Unknown command!', ephemeral: true });
        }
      } else if (interaction.isModalSubmit()) {
        console.log('Modal submit received:', interaction.customId);
        
        if (interaction.customId === 'loginModal') {
          await this.loginHandler.handleModalSubmit(interaction);
        }
      }
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      if (message.channel.isThread()) {
        console.log(`Thread message from ${message.author.tag}: ${message.content}`);
        return;
      }
    });

    this.client.on('error', console.error);
    this.client.on('warn', console.warn);

    process.on('SIGINT', () => {
      console.log('Shutting down bot...');
      this.dbService.close();
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

    try {
      const channel = await this.channelService.getUserChannel(discordId);
      if (!channel) {
        await interaction.reply({ 
          content: 'Bạn chưa có kênh chat. Hãy đăng nhập trước.', 
          flags: MessageFlags.Ephemeral 
        });
        return;
      }

      await interaction.reply({
        content: `Kênh chat của bạn: <#${channel.id}>`,
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
      const allChatThreads = await this.dbService.getAllChatThreads();
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
      await this.dbService.deleteChatThreadById(chatThread.id);

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
      const user = await this.dbService.getUser(discordId);
      if (user && this.wsService) {
        const sent = this.wsService.sendToUser(user.cvnlUserId, 'chat_ended_from_discord', {
          chatId: chatThread.chatId,
          reason: 'ended_by_user'
        });

        if (!sent) {
          console.log('User not connected to websocket, chat ended silently');
        }
      }

      await interaction.reply({ 
        content: 'Đã kết thúc cuộc trò chuyện.', 
        flags: MessageFlags.Ephemeral 
      });

      console.log(`Chat ${chatThread.chatId} ended by user ${user?.cvnlUserName} via Discord command`);

    } catch (error) {
      console.error('End chat command error:', error);
      await interaction.reply({ 
        content: 'Có lỗi xảy ra khi kết thúc cuộc trò chuyện.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  async start(token: string): Promise<void> {
    try {
      await this.client.login(token);
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }
}
