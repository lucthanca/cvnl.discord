import axios, { AxiosInstance } from 'axios';

export interface CVNLUserInfo {
  id: string;
  name: string;
  gender: string;
  job: number;
  birthday: string;
  age: number;
  phoneIsRequired: boolean;
  linkAccountIsRequired: boolean;
}

export interface CVNLVerifyResponse {
  data: CVNLUserInfo;
  status: string;
  id: string;
  name: string;
  gender: string;
  job: number;
  birthday: string;
  age: number;
  phoneIsRequired: boolean;
  linkAccountIsRequired: boolean;
}

export class CVNLApiService {
  private client: AxiosInstance;

  constructor(baseURL: string = 'https://rc.cvnl.app/api') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  async verifyToken(token: string): Promise<CVNLUserInfo | null> {
    try {
      const response = await this.client.post('/auth/verifyToken', {
        token
      });
      
      console.log('API Response:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200 && response.data.status === 'ok') {
        // Return the user info from the data field
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async authenticateUser(token: string): Promise<CVNLUserInfo | null> {
    return await this.verifyToken(token);
  }

  async getUserActiveChatInfo(token: string): Promise<any> {
    try {
      const response = await fetch('https://rc.cvnl.app/api/chat/info', {
        method: 'GET',
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to get user active chat info:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('Chat info API response:', data);
      
      // Check if user has active conversation
      if (data.status === 'ok' && data.data?.chat && data.data.chat.status === 'chatting') {
        return {
          chatId: data.data.chat.id,
          status: data.data.chat.status,
          partnerId: data.data.chat.stranger?.id,
          partnerName: data.data.chat.stranger?.name,
          createdAt: data.data.chat.createdAt
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user active chat info:', error);
      return null;
    }
  }
}
