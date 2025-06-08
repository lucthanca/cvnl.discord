import axios from 'axios';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

export class DiscordOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private isConfigured: boolean;

  constructor() {
    console.log('✅ Initializing Discord OAuth Service...');

    this.clientId = process.env.DISCORD_CLIENT_ID || '1380138485293256808';
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    this.redirectUri = process.env.DISCORD_REDIRECT_URI || '';
    this.isConfigured = !!this.clientSecret;
    
    if (!this.clientSecret) {
      console.warn('⚠️  Discord OAuth not configured - Discord login will not work');
      console.warn('   Add DISCORD_CLIENT_SECRET to .env file to enable Discord OAuth');
      console.warn('   Current working directory:', process.cwd());
      console.warn('   Looking for .env file at:', process.cwd() + '/.env');
    } else {
      console.log('✅ Discord OAuth configured successfully');
      console.log('   Client ID:', this.clientId);
      console.log('   Redirect URI:', this.redirectUri);
    }
  }

  private checkConfiguration(): void {
    if (!this.isConfigured) {
      throw new Error('Discord OAuth not configured. Please set DISCORD_CLIENT_SECRET in environment variables.');
    }
  }

  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<DiscordTokenResponse> {
    this.checkConfiguration();
    
    try {
      const response = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri || this.redirectUri,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Discord token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Discord user info error:', error.response?.data || error.message);
      throw new Error('Failed to get user info');
    }
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<DiscordTokenResponse> {
    this.checkConfiguration();
    
    try {
      const response = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Discord token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }

  isOAuthConfigured(): boolean {
    return this.isConfigured;
  }
}
