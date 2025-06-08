import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import commands from "./commands/index.js";

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