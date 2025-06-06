export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  access_token?: string;
}

export class DiscordService {
  private static readonly CLIENT_ID = '1380138485293256808';
  private static readonly API_BASE = 'https://discord.com/api';

  static async getAuthUrl(): Promise<string> {
    const redirectUri = chrome.identity.getRedirectURL('oauth');
    const scope = 'identify';
    
    return `${this.API_BASE}/oauth2/authorize?` +
      `client_id=${this.CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scope}`;
  }

  static async exchangeCodeForToken(code: string): Promise<any> {
    const redirectUri = chrome.identity.getRedirectURL('oauth');
    
    // In production, this should go through your backend to keep client_secret secure
    const response = await fetch(`${this.API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  static async getUserInfo(accessToken: string): Promise<DiscordUser> {
    const response = await fetch(`${this.API_BASE}/users/@me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await response.json();
    return {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0000',
      avatar: userData.avatar,
      access_token: accessToken
    };
  }

  static async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/users/@me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
