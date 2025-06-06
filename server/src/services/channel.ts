import { Client, Guild, TextChannel, ChannelType, PermissionFlagsBits, ThreadChannel, Channel } from 'discord.js';
import { DatabaseService } from './database.js';
import { getThreadName } from '../utils/channelUtils.js';

export interface UserChannel {
  discordId: string;
  channelId: string;
  channelName: string;
  guildId: string;
  createdAt: string;
}

export class ChannelService {
  private client: Client;
  private dbService: DatabaseService;
  private guild: Guild | null = null;

  constructor(client: Client, dbService: DatabaseService) {
    this.client = client;
    this.dbService = dbService;
  }

  // Add method to set guild reference
  setGuild(guild: Guild): void {
    this.guild = guild;
  }

  async createUserChannel(
    guild: Guild,
    discordId: string,
    cvnlUserName: string,
    cvnlUserId: string
  ): Promise<TextChannel | null> {
    try {
      // Always use the provided user info for channel naming
      const channelName = `cvnl-${this.sanitizeChannelName(cvnlUserName)}-${cvnlUserId.slice(-6)}`;
      
      console.log(`Creating channel with name: ${channelName} for user: ${cvnlUserName} (${cvnlUserId})`);
      
      // Check if THIS SPECIFIC channel already exists (by exact name)
      const existingChannel = guild.channels.cache.find(
        channel => channel.name === channelName && channel.type === ChannelType.GuildText
      ) as TextChannel;

      if (existingChannel) {
        console.log(`Channel already exists: ${channelName}`);
        // Update database to ensure this specific channel is saved for this user
        await this.dbService.saveUserChannel({
          discordId,
          cvnlUserId,
          channelId: existingChannel.id,
          channelName: existingChannel.name,
          guildId: guild.id,
        });
        return existingChannel;
      }

      // Fetch the Discord user to ensure they're in cache
      let discordUser;
      try {
        discordUser = await this.client.users.fetch(discordId);
      } catch (userFetchError) {
        console.error(`Failed to fetch Discord user ${discordId}:`, userFetchError);
        // Continue without user-specific permissions
      }

      // Create permission overwrites
      const permissionOverwrites: any[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        }
      ];

      // Add user permissions if user was successfully fetched
      if (discordUser) {
        permissionOverwrites.push({
          id: discordUser.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      // Create new text channel
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Private channel for CVNL user: ${cvnlUserName} (ID: ${cvnlUserId})`,
        permissionOverwrites: permissionOverwrites,
      });

      // Save channel info to database
      await this.dbService.saveUserChannel({
        discordId,
        cvnlUserId,
        channelId: channel.id,
        channelName: channel.name,
        guildId: guild.id,
      });

      // Send welcome message
      await channel.send({
        embeds: [{
          title: '🎉 Chào mừng đến kênh CVNL của bạn!',
          description: `Xin chào **${cvnlUserName}**!\n\nĐây là kênh chat riêng tư của bạn với hệ thống CVNL.`,
          color: 0x00ff00,
          fields: [
            {
              name: '👤 Thông tin tài khoản',
              value: `**Tên:** ${cvnlUserName}\n**ID:** ${cvnlUserId}`,
              inline: true
            },
            {
              name: '💬 Hướng dẫn sử dụng',
              value: 'Bạn có thể sử dụng các lệnh CVNL trong kênh này.',
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
        }]
      });

      // If user was fetched successfully, try to add them to channel permissions after creation
      if (discordUser) {
        try {
          await channel.permissionOverwrites.edit(discordUser, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
          console.log(`Added permissions for user ${discordUser.tag} to channel ${channelName}`);
        } catch (permissionError) {
          console.error(`Failed to add user permissions after channel creation:`, permissionError);
        }
      }

      console.log(`Created channel for user ${cvnlUserName}: ${channel.name}`);
      return channel;

    } catch (error) {
      console.error('Failed to create user channel:', error);
      return null;
    }
  }

  async getUserChannel(discordId: string, cvnlUserId?: string): Promise<TextChannel | null> {
    try {
      const channelInfo = await this.dbService.getUserChannel(discordId, cvnlUserId);
      if (!channelInfo) {
        return null;
      }

      // Verify channel still exists on Discord
      try {
        const channel = await this.client.channels.fetch(channelInfo.channelId) as TextChannel;
        if (channel && channel.type === ChannelType.GuildText) {
          return channel;
        } else {
          // Channel doesn't exist or wrong type, clean up database
          console.log(`Channel ${channelInfo.channelName} not found on Discord, cleaning up database`);
          await this.dbService.deleteUserChannel(discordId, channelInfo.cvnlUserId);
          return null;
        }
      } catch (fetchError) {
        // Channel was deleted, clean up database
        console.log(`Channel ${channelInfo.channelName} fetch failed, cleaning up database`);
        await this.dbService.deleteUserChannel(discordId, channelInfo.cvnlUserId);
        return null;
      }
    } catch (error) {
      console.error('Failed to get user channel:', error);
      return null;
    }
  }

  async deleteUserChannel(discordId: string, cvnlUserId?: string): Promise<boolean> {
    try {
      const channelInfo = await this.dbService.getUserChannel(discordId, cvnlUserId);
      if (!channelInfo) {
        return false;
      }

      // Try to delete channel from Discord
      try {
        const channel = await this.client.channels.fetch(channelInfo.channelId) as TextChannel;
        if (channel) {
          await channel.delete('User logged out');
          console.log(`Deleted Discord channel: ${channelInfo.channelName}`);
        }
      } catch (deleteError) {
        console.log(`Channel ${channelInfo.channelName} already deleted from Discord`);
      }

      // Always clean up database record
      await this.dbService.deleteUserChannel(discordId, cvnlUserId);
      return true;
    } catch (error) {
      console.error('Failed to delete user channel:', error);
      return false;
    }
  }

  async getChannelById(channelId: string): Promise<Channel | null> {
    try {
      return await this.client.channels.fetch(channelId);
    } catch (error) {
      console.error('Failed to fetch channel:', error);
      return null;
    }
  }

  async createChatThread(discordId: string, chatId: string, cvnlUserId: string): Promise<ThreadChannel | null> {
    try {
      const channelInfo = await this.dbService.getUserChannel(discordId, cvnlUserId);
      if (!channelInfo) {
        console.error(`No channel found for user ${discordId}`);
        return null;
      }

      const channel = await this.client.channels.fetch(channelInfo.channelId) as TextChannel;
      
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.error('Invalid channel type for creating thread');
        return null;
      }
      
      const thread = await channel.threads.create({
        name: getThreadName(chatId),
        autoArchiveDuration: 4320, // 24 hours
        type: ChannelType.PrivateThread,
        reason: `New CVNL chat session: ${chatId}`,
      });

      await this.dbService.saveChatThread({
        chatId: chatId,
        threadId: thread.id,
        discordId: discordId,
        channelId: channel.id,
        threadName: thread.name,
        cvnlUserId: cvnlUserId
      });

      console.log(`✅ Created chat thread: ${thread.name} (${thread.id}) for chat ${chatId} by user ${cvnlUserId}`);
      return thread;
    } catch (error) {
      console.error('Error creating chat thread:', error);
      return null;
    }
  }

  async ensureChatThread(discordId: string, chatId: string, cvnlUserId: string): Promise<void> {
    const existingThread = await this.dbService.getChatThread(chatId, cvnlUserId);
    if (existingThread) {
      console.log(`Thread already exists for chat ${chatId}: ${existingThread.threadId}`);
      const remoteThread = await this.getChannelById(existingThread.threadId);
      if (remoteThread && remoteThread.isThread()) {
        await remoteThread.setArchived(false); // Unarchive if needed
        console.log(`Thread ${existingThread.threadId} is active for chat ${chatId}`);
        return;
      }
    }
    await this.createChatThread(discordId, chatId, cvnlUserId);
  }

  async sendMessageToThread(threadId: string, content: string, embed?: any): Promise<void> {
    try {
      const thread = await this.getChannelById(threadId);
      if (!thread || !thread.isThread()) {
        console.error('Thread not found or invalid');
        return;
      }

      const messageOptions: any = { content };
      if (embed) {
        messageOptions.embeds = [embed];
      }

      await thread.send(messageOptions);
      console.log(`Message sent to thread ${threadId}`);

    } catch (error) {
      console.error('Error sending message to thread:', error);
    }
  }

  async getUserChannelByCvnlUser(discordId: string, cvnlUserId: string): Promise<TextChannel | null> {
    try {
      // Get all users to find the specific CVNL user mapping
      const users = await this.dbService.getAllUsers();
      const user = users.find(u => u.discordId === discordId && u.cvnlUserId === cvnlUserId);
      
      if (!user) {
        console.log(`No user found for Discord ID ${discordId} and CVNL User ID ${cvnlUserId}`);
        return null;
      }

      // Check if guild is available
      if (!this.guild) {
        console.error('Guild not set in ChannelService');
        return null;
      }

      // Get or create channel for this specific CVNL user
      const channelName = `cvnl-${this.sanitizeChannelName(user.cvnlUserName)}-${cvnlUserId.slice(-6)}`;
      
      console.log(`Looking for channel: ${channelName} for user ${user.cvnlUserName} (${cvnlUserId})`);

      // Try to find existing channel
      const existingChannel = this.guild.channels.cache.find(
        (channel: any) => channel.name === channelName && channel.type === ChannelType.GuildText
      ) as TextChannel;

      if (existingChannel) {
        console.log(`Found existing channel: ${existingChannel.id} for CVNL user ${cvnlUserId}`);
        return existingChannel;
      }

      // Create new channel if it doesn't exist
      console.log(`Creating new channel: ${channelName} for CVNL user ${cvnlUserId}`);
      
      const newChannel = await this.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `CVNL Chat channel for ${user.cvnlUserName} (${cvnlUserId})`,
        reason: `Auto-created for CVNL user ${user.cvnlUserName}`,
      });

      // Save channel info to database
      await this.dbService.saveUserChannel({
        discordId,
        cvnlUserId,
        channelId: newChannel.id,
        channelName: newChannel.name,
        guildId: this.guild.id,
      });

      console.log(`✅ Created new channel ${newChannel.id} for CVNL user ${cvnlUserId}`);
      return newChannel;

    } catch (error) {
      console.error(`Error getting/creating channel for Discord ${discordId} / CVNL ${cvnlUserId}:`, error);
      return null;
    }
  }

  private sanitizeChannelName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
  }
}
