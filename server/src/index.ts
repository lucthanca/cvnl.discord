import './config/env.js'; // Load .env first
import express from 'express';
import cors from 'cors';
import { DiscordBotHandler } from './handlers/bot.js';
import { DatabaseService } from './services/database.js';
import { CVNLApiService } from './services/api.js';
import { ChannelService } from './services/channel.js';
import { WebSocketService } from './services/websocket.js';
import discordRoutes from './routes/discord.js';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Debug environment variables
    console.log('Environment variables loaded:');
    console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '***configured***' : 'missing');
    console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
    console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '***configured***' : 'missing');
    console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);
    console.log('WS_PORT:', process.env.WS_PORT);
    console.log('PORT:', process.env.PORT);

    // Validate required environment variables
    const discordToken = process.env.DISCORD_TOKEN;
    if (!discordToken) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }

    // Ensure data directory exists
    const dataDir = join(__dirname, '../data');
    await mkdir(dataDir, { recursive: true });

    // Initialize services
    const dbService = new DatabaseService();
    const apiService = new CVNLApiService();

    // Setup Express server
    const app = express();
    const port = parseInt(process.env.PORT || '3000');

    app.use(cors());
    app.use(express.json());

    // Make services available to routes
    app.locals.dbService = dbService;
    app.locals.apiService = apiService;

    // Add Discord OAuth routes
    app.use('/api/discord', discordRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString()
      });
    });

    // Start the bot
    const bot = new DiscordBotHandler();
    await bot.start(discordToken);

    // Initialize channel service with bot client
    const channelService = new ChannelService(bot.getClient(), dbService);

    // After client is ready and guild is available
    bot.getClient().once('ready', async () => {
      console.log(`Logged in as ${bot.getClient().user?.tag}!`);
      
      const guild = bot.getClient().guilds.cache.first();
      if (guild) {
        channelService.setGuild(guild);
        console.log(`Guild set for ChannelService: ${guild.name}`);
      }
    });

    // Start WebSocket server
    const wsService = new WebSocketService(dbService, apiService, channelService);

    // Set WebSocket service in bot handler
    bot.setWebSocketService(wsService);

    // Make services available to routes
    app.locals.dbService = dbService;
    app.locals.apiService = apiService;
    app.locals.botHandler = bot;
    app.locals.channelService = channelService;

    // Update health check to include connected users
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        connectedUsers: wsService.getConnectedClients().size
      });
    });

    app.listen(port, () => {
      console.log(`Express server running on port ${port}`);
    });

    console.log('CVNL Discord Bot, Web Server, and WebSocket Server started successfully!');
    console.log('Listening for /login commands and WebSocket connections...');

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
