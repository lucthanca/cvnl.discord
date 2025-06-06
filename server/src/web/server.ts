import express, { Request, Response } from 'express';
import cors from 'cors';
import { DiscordOAuthService } from '../services/oauth.js';
import { DatabaseService } from '../services/database.js';

export class WebServer {
  private app: express.Application;
  private oauthService: DiscordOAuthService;
  private dbService: DatabaseService;
  private port: number;
  private host: string;

  constructor() {
    this.app = express();
    this.oauthService = new DiscordOAuthService();
    this.dbService = new DatabaseService();
    this.port = parseInt(process.env.WEB_PORT || '3000');
    this.host = process.env.WEB_HOST || 'localhost';

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // OAuth2 authorization endpoint
    this.app.get('/auth/discord', (req: Request, res: Response) => {
      const state = Math.random().toString(36).substring(7);
      const authUrl = this.oauthService.getAuthorizationUrl(state);
      
      // Store state in session/memory for validation (simple implementation)
      res.redirect(authUrl);
    });

    // OAuth2 callback endpoint
    this.app.get('/auth/discord/callback', async (req: Request, res: Response) => {
      try {
        const { code, state } = req.query;

        if (!code) {
          return res.status(400).send('Authorization code not provided');
        }

        // Just get basic user info to verify identity
        const tokenData = await this.oauthService.exchangeCodeForToken(code as string);
        if (!tokenData) {
          return res.status(400).send('Failed to verify Discord identity');
        }

        const userInfo = await this.oauthService.getUserInfo(tokenData.access_token);
        if (!userInfo) {
          return res.status(400).send('Failed to get Discord user information');
        }

        console.log(`Discord user verified: ${userInfo.username}#${userInfo.discriminator} (ID: ${userInfo.id})`);

        res.send(`
          <html>
            <body>
              <h2>Discord Identity Verified!</h2>
              <p>Hello, ${userInfo.username}#${userInfo.discriminator}!</p>
              <p>Your Discord ID: <code>${userInfo.id}</code></p>
              <p>You can now close this window and use the <strong>/login</strong> command in Discord.</p>
              <script>
                setTimeout(() => window.close(), 5000);
              </script>
            </body>
          </html>
        `);

      } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('Internal server error during Discord verification');
      }
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Simple info endpoint
    this.app.get('/info', (req: Request, res: Response) => {
      res.json({
        service: 'CVNL Discord Bot',
        version: '1.0.0',
        endpoints: {
          discord_auth: '/auth/discord',
          health: '/health'
        }
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, this.host, () => {
        console.log(`Web server running on http://${this.host}:${this.port}`);
        console.log(`OAuth2 redirect URI: http://${this.host}:${this.port}/auth/discord/callback`);
        resolve();
      });
    });
  }
}
