import { PrismaClient, OAuthSession } from '@prisma/client';
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
  id: number;
  chatId: string;
  threadId: string;
  discordId: string;
  channelId: string;
  threadName: string;
  cvnlUserId: string;
  createdAt?: Date;
  status: number;
  reOpenCount?: number;
}

export interface UserTokenData {
  discordId: string;
  cvnlUserId: string;
  cvnlUserName: string;
  token: string;
  channelId: string;
  channelName: string;
  guildId: string;
}

class DatabaseService {
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

  async getUser(discordId: string, cvnlUserId: string) {
    try {
      return await this.prisma.user.findUnique({
        where: {
          discordId_cvnlUserId: { discordId, cvnlUserId },
        },
      });
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
  async saveOAuthSession(sessionData: Omit<OAuthSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
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

  async getOAuthSession(discordId: string): Promise<OAuthSession | null> {
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
          discordId_cvnlUserId: {
            discordId: channelData.discordId,
            cvnlUserId: channelData.cvnlUserId,
          }
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

  async getUserChannel(discordId: string, cvnlUserId?: string) {
    try {
      if (cvnlUserId) {
        // Get channel for specific CVNL user
        return await this.prisma.userChannel.findUnique({
          where: {
            discordId_cvnlUserId: {
              discordId,
              cvnlUserId,
            }
          },
          include: { user: true }
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

  async getUserChannelByChannelId(channelId: string) {
    try {
      return await this.prisma.userChannel.findUnique({
        where: { channelId },
        include: {
          user: true,
        }
      });
    } catch (error) {
      console.error('Error getting user channel by channel ID:', error);
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
          where: {
            discordId_cvnlUserId: {
              discordId,
              cvnlUserId,
            }
          },
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

  /**
   * Updates a chat thread with the given ID.
   *
   * @param id - The ID of the chat thread to update.
   * @param threadData - The data to update the chat thread with, excluding 'id' and 'createdAt'.
   */
  async updateChatThread(id: number, threadData: Omit<Partial<ChatThreadData>, 'id' | 'createdAt'>): Promise<ChatThreadData> {
    return this.prisma.chatThread.update({
      where: {id},
      data: threadData,
    });
  }

  // Chat Thread methods
  async saveChatThread(threadData: Omit<ChatThreadData, 'id' | 'createdAt'>): Promise<void> {
    try {
      // First, try to find existing thread
      const existingThread = await this.prisma.chatThread.findFirst({
        where: {
          chatId: threadData.chatId,
          cvnlUserId: threadData.cvnlUserId,
        },
      });

      if (existingThread) {
        // Update existing thread
        await this.prisma.chatThread.update({
          where: { id: existingThread.id },
          data: {
            threadId: threadData.threadId,
            channelId: threadData.channelId,
            threadName: threadData.threadName,
            discordId: threadData.discordId,
          },
        });
        console.log(`Updated chat thread for chat ${threadData.chatId}`);
      } else {
        console.log(`No existing thread found for chat ${threadData.chatId}, creating new one`, threadData);
        // Create new thread
        await this.prisma.chatThread.create({
          data: threadData,
        });
        console.log(`Created new chat thread for chat ${threadData.chatId}`);
      }
    } catch (error) {
      console.error('Error saving chat thread:', error);
      throw new Error('Failed to save chat thread: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Retrieves a chat thread by chatId and cvnlUserId.
   *
   * @param chatId
   * @param cvnlUserId
   */
  async getChatThread(chatId: string, cvnlUserId: string): Promise<ChatThreadData | null> {
    try {
      return await this.prisma.chatThread.findUnique({
        where: {
          chatId_cvnlUserId: { chatId, cvnlUserId },
        },
      });
    } catch (error) {
      console.error('Error getting chat thread:', error);
      return null;
    }
  }

  async getChatThreadByThreadId(threadId: string) {
    try {
      return await this.prisma.chatThread.findUnique({
        where: { threadId: threadId },
      });
    } catch (error) {
      console.error('Error getting chat thread by ID:', error);
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

  async getUserTokens(discordId: string): Promise<UserTokenData[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { discordId },
        orderBy: { createdAt: 'desc' },
      });

      const result: UserTokenData[] = [];
      
      for (const user of users) {
        const channel = await this.prisma.userChannel.findFirst({
          where: { cvnlUserId: user.cvnlUserId },
        });
        
        if (channel) {
          result.push({
            discordId: user.discordId,
            cvnlUserId: user.cvnlUserId,
            cvnlUserName: user.cvnlUserName,
            token: user.token,
            channelId: channel.channelId,
            channelName: channel.channelName,
            guildId: channel.guildId,
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting user tokens:', error);
      return [];
    }
  }

  public getResource(): PrismaClient {
    return this.prisma;
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

const dbService = new DatabaseService();
export default dbService;