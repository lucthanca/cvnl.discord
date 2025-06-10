import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import commands from "./commands/index.js";
import { clients, populateClientKey } from "~/ws/clientStore.js";
import channelService from "~/services/channel.js";
import { EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD } from "~/shared/constants.js";
import { v4 as uuid } from "uuid";
import { waitForEventWithTimeout } from "~/utils/emitWithTimeout.js";
import dbService from "~/services/database.js";

class DiscordBot
{
  private readonly client: Client;
  private rest: REST;

  private static instance: DiscordBot;
  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }
    return DiscordBot.instance;
  }

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping
      ],
    });
    this.rest = new REST();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('ready', async () => {
      console.log(`🤖 Bot is online as ${this.client.user?.tag}!`);
      console.log(`🤖 Bot is in ${this.client.guilds.cache.size} guilds`);
      await this.registerSlashCommands();
    });
    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          const handler = commands.get(interaction.commandName);
          if (handler) {
            console.log(`Slash command received: ${interaction.commandName}`);
            await handler.handle(interaction);
          } else {
            await interaction.reply({ content: 'Unknown command!', ephemeral: true });
          }
        } else if (interaction.isModalSubmit()) {
          const modalHandler = commands.get(interaction.customId);
          if (modalHandler && modalHandler.handleModalSubmit) {
            console.log(`Modal submit received: ${interaction.customId}`);
            await modalHandler.handleModalSubmit(interaction);
          } else {
            await interaction.reply({ content: 'Unknown modal!', ephemeral: true });
          }
        } else if (interaction.isStringSelectMenu()) {
          const selectHandler = commands.get(interaction.customId);
          if (selectHandler && selectHandler.handleSelectMenu) {
            console.log(`Select menu interaction received: ${interaction.customId}`);
            await selectHandler.handleSelectMenu(interaction);
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
        const chatThread = await channelService.getUserChatThreadByThreadId(message.channel.id);
        if (!chatThread) {
          await message.reply({
            content: 'Không tìm thấy thông tin cuộc trò chuyện cho thread này. Dữ liệu có thể đã bị xóa hoặc không hợp lệ.',
          });
          return;
        }
        if (chatThread.status !== 0) {
          await message.reply({
            content: 'Cuộc trò chuyện này đã kết thúc hoặc không còn hoạt động. Vui lòng bắt đầu cuộc trò chuyện mới.',
          });
          return;
        }
        const socketClient = clients.get(populateClientKey(chatThread.cvnlUserId));
        if (!socketClient) {
          await message.reply({
            content: 'Không tìm thấy client CVNL đang hoạt động cho cuộc trò chuyện này. Vui lòng thử lại sau.',
          });
          return;
        }
        try {
          let replyId = undefined;
          if (message.reference?.messageId) {
            const threadMessage = await dbService.getResource().threadMessage.findUnique({
              where: { discordMsgId: message.reference.messageId },
            });
            console.log(`Found thread message for reply: ${JSON.stringify(threadMessage)}`);
            if (threadMessage) {
              replyId = threadMessage.cvnlMsgId;
            }
          }
          waitForEventWithTimeout<{
            status: 'success' | 'error';
            message: string;
            data: {
              id: string;
              uuid: string;
              status: 'delivered' | 'sent';
            }
          }>(socketClient.socket, `${EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD}_RESPONSE`, 10000).then(async (res) => {
            const { data } = res;
            const { id: cvnlMsgId } = data;
            await dbService.getResource().threadMessage.create({
              data: {
                discordMsgId: message.id,
                cvnlMsgId,
                threadId: message.channel.id
              }
            })
          }).catch(e => {
            console.error(`❌ Timeout waiting for ${EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD}_RESPONSE from client ${socketClient.cvnlUserId}`, e);
            message.reply({
              content: `❌ Tiến trình gửi tin nhắn đã hết thời gian chờ. Có thể Client đang bị mất kết nối, check lại trình duyệt mà cài Extension CVNL nhé!`,
            });
          });

          let messageContent = message.content;
          if (message.attachments.size > 0) {
            message.attachments.forEach(attachment => {
              if (attachment.contentType && !attachment.contentType.startsWith('image/')) {
                messageContent += `\n[File](${attachment.proxyURL})\n`;
              } else {
                messageContent += `\n[Ảnh](${attachment.proxyURL})\n`;
              }
            });
          }

          // Emit the message to the CVNL client
          socketClient.socket.emit(EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD, {
            content: messageContent,
            uuid: uuid(),
            replyId,
          });
        } catch (e) {
          await message.reply({
            content: `❌ Tiến trình gửi tin nhắn đã hết thời gian chờ. Có thể Client đang bị mất kết nối, check lại trình duyệt mà cài Extension CVNL nhé!`,
          })
        }
        return;
      }
    });
    this.client.on('typingStart', (typing) => {
      if (typing.channel.isThread()) {
        console.log(`${typing.user.tag} is typing in ${typing.channel.id}`);
        const client = Array.from(clients.values()).find(c => c.activeThread?.id === typing.channel.id);
        if (client) {
          client.socket.emit('discord_typing', {
            threadId: typing.channel.id,
            userId: typing.user.id,
            username: typing.user.username,
          });
        }
      }
    });
    this.client.on('error', console.error);
    this.client.on('warn', console.warn);
  }

  private async registerSlashCommands(): Promise<void> {
    const discordCommands = Array.from(commands).map(([key, command]) => new SlashCommandBuilder().setName(command.name).setDescription(command.description));

    try {
      const clientId = this.client.user?.id;
      if (!clientId) throw new Error('Client ID not found');

      this.rest.setToken(process.env.DISCORD_TOKEN!);

      console.log('🚀 Registering slash commands...');

      // Register globally
      await this.rest.put(Routes.applicationCommands(clientId), { body: discordCommands.map(command => command.toJSON()) });

      console.log('✅ Slash commands registered globally.');

      // Also register for each guild (faster update)
      // @ts-ignore
      for (const [guildId] of this.client.guilds.cache) {
        await this.rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: discordCommands.map(command => command.toJSON()) }
        );
      }

    } catch (error) {
      console.error('Failed to register slash commands:', error);
    }
  }

  async start(): Promise<void> {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }
    await this.client.login(process.env.DISCORD_TOKEN);
  }

  getClient(): Client {
    return this.client;
  }
}

const bot = DiscordBot.getInstance();
await bot.start();

const client = bot.getClient();

export default bot;
export { client, DiscordBot };