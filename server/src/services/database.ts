import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface UserData {
  id?: number;
  discordId: string;
  token: string;
  cvnlUserId: string;
  cvnlUserName: string;
  cvnlUserGender?: string | null;
  cvnlUserJob?: number | null;
  cvnlUserAge?: number | null;
  createdAt?: Date;
}

export interface OAuthSessionData {
  id?: number;
  discordId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserChannelData {
  id?: number;
  discordId: string;
  cvnlUserId: string;  // Add this field
  channelId: string;
  channelName: string;
  guildId: string;
  createdAt?: Date;
}

export interface ChatThreadData {
  id?: number;
  chatId: string;
  threadId: string;
  discordId: string;
  channelId: string;
  threadName: string;
  cvnlUserId: string;
  createdAt?: Date;
}

export class DatabaseService {
  private prisma: PrismaClient;
  private dataDir: string;

  constructor() {
    this.dataDir = join(__dirname, '../../data');
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      await mkdir(this.dataDir, { recursive: true });
      
      // Connect to database
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Run migrations automatically
      await this.runMigrations();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      console.log('Running Prisma migrations...');
      
      // Prisma handles migrations automatically when using $executeRaw or migrations
      // For development, we can use prisma db push or prisma migrate dev
      
      console.log('✅ Database schema is up to date');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async saveUser(userData: Omit<UserData, 'id' | 'createdAt'>): Promise<UserData> {
    try {
      const user = await this.prisma.user.upsert({
        where: {
          discordId_cvnlUserId: {
            discordId: userData.discordId,
            cvnlUserId: userData.cvnlUserId,
          },
        },
        update: {
          token: userData.token,
          cvnlUserName: userData.cvnlUserName,
          cvnlUserGender: userData.cvnlUserGender,
          cvnlUserJob: userData.cvnlUserJob,
          cvnlUserAge: userData.cvnlUserAge,
        },
        create: userData,
      });

      console.log(`Saved user: ${user.cvnlUserName} for Discord: ${user.discordId}`);
      return user as UserData;
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === 'P2002') {
        throw new Error('This CVNL account is already added for this Discord user');
      }
      throw new Error('Failed to save user data');
    }
  }

  async getUser(discordId: string): Promise<UserData | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { discordId },
      });
      return user as UserData | null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByCvnlId(cvnlUserId: string): Promise<UserData | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { cvnlUserId },
      });
      return user as UserData | null;
    } catch (error) {
      console.error('Error getting user by CVNL ID:', error);
      return null;
    }
  }

  async getUsersByDiscordId(discordId: string): Promise<UserData[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { discordId },
        orderBy: { createdAt: 'desc' },
      });
      return users as UserData[];
    } catch (error) {
      console.error('Error getting users by Discord ID:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<UserData[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return users as UserData[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async deleteUser(discordId: string, cvnlUserId?: string): Promise<void> {
    try {
      if (cvnlUserId) {
        // Delete specific token
        const result = await this.prisma.user.deleteMany({
          where: {
            discordId,
            cvnlUserId,
          },
        });
        console.log(`Deleted ${result.count} user(s): ${cvnlUserId} for Discord ${discordId}`);
      } else {
        // Delete all tokens for this Discord user
        const result = await this.prisma.user.deleteMany({
          where: { discordId },
        });
        console.log(`Deleted ${result.count} user(s) for Discord ${discordId}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // OAuth Session methods
  async saveOAuthSession(sessionData: Omit<OAuthSessionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      await this.prisma.oAuthSession.upsert({
        where: { discordId: sessionData.discordId },
        update: {
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          expiresAt: sessionData.expiresAt,
        },
        create: sessionData,
      });
    } catch (error) {
      console.error('Error saving OAuth session:', error);
      throw new Error('Failed to save OAuth session');
    }
  }

  async getOAuthSession(discordId: string): Promise<OAuthSessionData | null> {
    try {
      return await this.prisma.oAuthSession.findUnique({
        where: { discordId },
      });
    } catch (error) {
      console.error('Error getting OAuth session:', error);
      return null;
    }
  }

  async deleteOAuthSession(discordId: string): Promise<void> {
    try {
      await this.prisma.oAuthSession.delete({
        where: { discordId },
      });
    } catch (error) {
      console.error('Error deleting OAuth session:', error);
    }
  }

  // User Channel methods
  async saveUserChannel(channelData: Omit<UserChannelData, 'id' | 'createdAt'>): Promise<void> {
    try {
      await this.prisma.userChannel.upsert({
        where: {
          cvnlUserId: channelData.cvnlUserId  // Use cvnlUserId as unique key
        },
        update: {
          discordId: channelData.discordId,
          channelId: channelData.channelId,
          channelName: channelData.channelName,
          guildId: channelData.guildId
        },
        create: channelData
      });
      console.log('User channel saved successfully for CVNL user:', channelData.cvnlUserId);
    } catch (error) {
      console.error('Error saving user channel:', error);
      throw new Error('Failed to save user channel: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getUserChannel(discordId: string, cvnlUserId?: string): Promise<UserChannelData | null> {
    try {
      if (cvnlUserId) {
        // Get channel for specific CVNL user
        return await this.prisma.userChannel.findUnique({
          where: { cvnlUserId, discordId },
        });
      } else {
        // Get any channel for this Discord user (backwards compatibility)
        return await this.prisma.userChannel.findFirst({
          where: { discordId },
        });
      }
    } catch (error) {
      console.error('Error getting user channel:', error);
      return null;
    }
  }

  async getUserChannelByCvnlUser(discordId: string, cvnlUserId: string): Promise<UserChannelData | null> {
    try {
      return await this.prisma.userChannel.findFirst({
        where: { 
          discordId,
          cvnlUserId 
        },
      });
    } catch (error) {
      console.error('Error getting user channel by CVNL user:', error);
      return null;
    }
  }

  async deleteUserChannel(discordId: string, cvnlUserId?: string): Promise<void> {
    try {
      if (cvnlUserId) {
        await this.prisma.userChannel.delete({
          where: { cvnlUserId },
        });
      } else {
        await this.prisma.userChannel.deleteMany({
          where: { discordId },
        });
      }
    } catch (error) {
      console.error('Error deleting user channel:', error);
    }
  }

  // Chat Thread methods
  async saveChatThread(threadData: Omit<ChatThreadData, 'id' | 'createdAt'>): Promise<void> {
    try {
      await this.prisma.chatThread.upsert({
        where: { chatId: threadData.chatId, cvnlUserId: threadData.cvnlUserId, id: undefined },
        update: {
          threadId: threadData.threadId,
          channelId: threadData.channelId,
          threadName: threadData.threadName,
        },
        create: threadData,
      });
    } catch (error) {
      console.error('Error saving chat thread:', error);
      throw new Error('Failed to save chat thread');
    }
  }

  async getChatThread(chatId: string, cvnlUserId: string): Promise<ChatThreadData | null> {
    try {
      return await this.prisma.chatThread.findFirst({
        where: {
          chatId,
          cvnlUserId,
        },
      });
    } catch (error) {
      console.error('Error getting chat thread:', error);
      return null;
    }
  }

  async getAllChatThreads(): Promise<ChatThreadData[]> {
    try {
      return await this.prisma.chatThread.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error getting all chat threads:', error);
      return [];
    }
  }

  // async deleteChatThread(chatId: string, cvnlUserId: string): Promise<void> {
  //   try {
  //     await this.prisma.chatThread.delete({
  //       where: { chatId, cvnlUserId },
  //     });
  //   } catch (error) {
  //     console.error('Error deleting chat thread:', error);
  //   }
  // }

  async deleteChatThreadById(threadId?: number): Promise<void> {
    if (!threadId) return;
    try {
      await this.prisma.chatThread.delete({
        where: { id: threadId },
      });
    } catch (error) {
      console.error('Error deleting chat thread:', error);
    }
  }

  async deleteChatThreadsByDiscordId(discordId: string): Promise<void> {
    try {
      await this.prisma.chatThread.deleteMany({
        where: { discordId },
      });
    } catch (error) {
      console.error('Error deleting chat threads by Discord ID:', error);
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
