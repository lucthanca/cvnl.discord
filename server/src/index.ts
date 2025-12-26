import { fileURLToPath } from "url";
import '~/config/env.js'; // Load .env first
import express from 'express';
import cors from 'cors';
import { DiscordBot } from '~/bot/index.js';
import discordRoutes from '~/routes/discord.js';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(globalThis as any).__dirname = __dirname;

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

    // Ensure data directory exists
    const dataDir = join(globalThis.__dirname, '../data');
    await mkdir(dataDir, { recursive: true });

    // Setup Express server
    const app = express();
    const port = parseInt(process.env.PORT || '3000');

    app.use(cors({
      origin: 'https://cvnl.app',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }));
    app.use(express.json());
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', "true");
      next();
    });
    app.options("*", cors());

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
    DiscordBot.getInstance();

    // Dynamically import WebSocket server
    const { default: WebSocketServer } = await import('~/ws/server.js');

    // Update health check to include connected users
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
      });
    });

    const host = process.env.WEB_HOST || '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`🚀 Express server running on ${host}:${port}`);
    });

    console.log('✅ CVNL Discord Bot, Web Server, and WebSocket Server started successfully!');
    console.log('✅ Listening for /login commands and WebSocket connections...');

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
