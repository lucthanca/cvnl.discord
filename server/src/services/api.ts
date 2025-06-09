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

export type ChatInfoStatus = 'ok' | 'error';
export type ChatDataStatus = 'chatting' | 'empty' | 'stranger_closed';
export type CVNLChatMessage = {
  id: string;
  content: string;
  from: 'stranger' | 'me';
  status: 'delivered' | 'sent';
  createdAt: string;
};
export type CVNLChatData = {
  chat: {
    status: ChatDataStatus;
    id: string;
    createdAt: string;
    messages: CVNLChatMessage[],
    metadata: {
      liked: boolean;
      beLiked: boolean;
      didBlock: boolean;
      didRate: boolean;
      didReport: boolean;
    },
    stranger: {
      "gender": string;
      "job": number;
    }
  }
}
export interface ChatInfoResponse {
  data: CVNLChatData,
  status: ChatInfoStatus;
  error_message?: string;
}
export type CVNLChatInfo = {
  chatId: string;
  status: ChatDataStatus;
  partnerGender: string;
  partnerJob: string;
  createdAt: string;
};

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

  /**
   * Verify the provided token with the CVNL API.
   *
   * @param token - The JWT token to verify.
   */
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

  /**
   * Authenticate a user by verifying their token.
   *
   * @param token
   */
  async authenticateUser(token: string): Promise<CVNLUserInfo | null> {
    return await this.verifyToken(token);
  }

  /**
   * Get the active chat information for the user.
   *
   * @param token - The JWT token of the user.
   */
  async getUserActiveChatInfo(token: string): Promise<CVNLChatInfo | null> {
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

      const data = await response.json() as ChatInfoResponse;
      console.log('Chat info API response:', data);
      
      // Check if user has active conversation
      if (data.status === "ok" && data.data?.chat && data.data.chat.status === 'chatting') {
        return {
          chatId: data.data.chat.id,
          status: data.data.chat.status,
          partnerGender: this.getGenderName(data.data.chat.stranger.gender),
          partnerJob: this.getJobName(data.data.chat.stranger.job),
          createdAt: data.data.chat.createdAt
        };
      } else {
        return {
          status: data.data.chat.status,
          chatId: '',
          partnerGender: '',
          partnerJob: '',
          createdAt: ''
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting user active chat info:', error);
      return null;
    }
  }

  /**
   * Get Gender name based on the gender code.
   */
  public getGenderName(genderCode: string): string {
    const gender = genderCode.toLowerCase();
    const genderMap: { [key: string]: string } = {
      'other': 'Bí mật',
      'male': 'Nam',
      'female': 'Nữ'
    };
    return genderMap[gender] || 'Không xác định';
  }

  /**
   * Get the job name based on the job ID.
   *
   * @param jobId
   * @private
   */
  private getJobName(jobId: number): string {
    const jobMap: { [key: number]: string } = {
      0: "Bí mật",
      1: "Học sinh",
      2: "Sinh viên",
      3: "Người đi làm"
      // Có thể thêm nhiều job codes khác trong tương lai
    };
    return jobMap[jobId] || "Không xác định";
  }
}

const cvnlApiService = new CVNLApiService();
export default cvnlApiService;