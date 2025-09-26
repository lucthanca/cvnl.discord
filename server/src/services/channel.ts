import { Guild, TextChannel, ChannelType, PermissionFlagsBits, ThreadChannel, Channel } from 'discord.js';
import dbService from './database.js';
import { getThreadName, sanitizeChannelName } from '../utils/channelUtils.js';
import { client } from "../bot/index.js";

export const THREAD_CHAT_STATUS_ACTIVE = 0;
export const THREAD_CHAT_STATUS_ARCHIVED = 1;

export type ThreadChannelWithNewFlag = ThreadChannel & { is_new?: boolean; is_recreated?: boolean };

export class ChannelNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChannelNotFoundError';
  }
}

export class InvalidChannelTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidChannelTypeError';
  }
}

export class ChannelService {
  private guild: Guild | null = null;

  /**
   * Generate a sanitized channel name based on CVNL user name and ID.
   *
   * @param cvnlUserName
   * @param cvnlUserId
   * @private
   */
  private getChannelName(cvnlUserName: string, cvnlUserId: string): string {
    return `cvnl-${sanitizeChannelName(cvnlUserName)}-${cvnlUserId.slice(-6)}`;
  }

  /**
   * Create a new user channel for CVNL users.
   * If the channel already exists, it will return the existing channel.
   *
   * @param guild - The Discord guild where the channel will be created.
   * @param discordId - The Discord user ID.
   * @param cvnlUserName - The CVNL user name.
   * @param cvnlUserId - The CVNL user ID.
   * @return The created or existing text channel, or null if creation failed.
   */
  async createUserChannel(
    guild: Guild,
    discordId: string,
    cvnlUserName: string,
    cvnlUserId: string
  ): Promise<TextChannel | null> {
    try {
      // Always use the provided user info for channel naming
      const channelName = this.getChannelName(cvnlUserName, cvnlUserId);
      console.log(`Tạo kênh cho người dùng: ${cvnlUserName} (${cvnlUserId}) với tên kênh: ${channelName}`);
      
      // Check if THIS SPECIFIC channel already exists (by exact name)
      const existingChannel = guild.channels.cache.find(
        channel => channel.name === channelName && channel.type === ChannelType.GuildText
      ) as TextChannel;

      if (existingChannel) {
        console.log(`Kênh đã tồn tại: ${existingChannel.id} cho người dùng ${cvnlUserName}`);
        // Update database to ensure this specific channel is saved for this user
        await dbService.saveUserChannel({
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
        if (client.users.cache.has(discordId)) {
          discordUser = client.users.cache.get(discordId);
        } else {
          discordUser = await client.users.fetch(discordId);
        }
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
      await dbService.saveUserChannel({
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
          console.log(`Thêm quyền cho người dùng ${discordUser.tag} vào kênh ${channel.name}`);
        } catch (permissionError) {
          console.error(`Failed to add user permissions after channel creation:`, permissionError);
        }
      }

      console.log(`✅ Đã tạo kênh mới ${channel.id} cho người dùng CVNL ${cvnlUserId}`);
      return channel;
    } catch (error) {
      console.error('Failed to create user channel:', error);
      return null;
    }
  }

  /**
   * Get the user's channel by Discord ID and CVNL user ID.
   * Returns null if no channel is found or if the channel is deleted.
   *
   * @param discordId - The Discord user ID.
   * @param cvnlUserId - The CVNL user ID.
   * @return The user's channel or null if not found.
   */
  async getChannel(discordId: string, cvnlUserId: string): Promise<TextChannel | null> {
    try {
      const channelInfo = await dbService.getUserChannel(discordId, cvnlUserId);
      if (!channelInfo) {
        return null;
      }

      // Verify channel still exists on Discord
      try {
        const channel = await this.getChannelById(channelInfo.channelId);
        if (channel && channel.type === ChannelType.GuildText) {
          return channel;
        } else {
          // Channel doesn't exist or wrong type, clean up database
          console.log(`Channel ${channelInfo.channelName} not found on Discord, cleaning up database`);
          await dbService.deleteUserChannel(discordId, channelInfo.cvnlUserId);
          return null;
        }
      } catch (fetchError) {
        // Channel was deleted, clean up database
        console.log(`Channel ${channelInfo.channelName} fetch failed, cleaning up database`);
        await dbService.deleteUserChannel(discordId, channelInfo.cvnlUserId);
        return null;
      }
    } catch (error) {
      console.error('Failed to get user channel:', error);
      return null;
    }
  }
  async getUserChannelById(channelId: string) {
    return await dbService.getUserChannelByChannelId(channelId);
  }
  async getUserChatThread(chatId: string, cvnlUserId: string) {
    return await dbService.getChatThread(chatId, cvnlUserId);
  }
  async getUserChatThreadByThreadId(threadId: string) {
    return await dbService.getChatThreadByThreadId(threadId);
  }
  async archiveChatThread(id: number | string, uniqueField: string = 'id') {
    if (uniqueField !== 'id') {
      await dbService.getResource().chatThread.update({
        where: { threadId: id + "" },
        data: {
          status: THREAD_CHAT_STATUS_ARCHIVED,
        },
      });
      return;
    }
    await dbService.updateChatThread(parseInt(id + ""), {
      status: THREAD_CHAT_STATUS_ARCHIVED,
    });
  }
  async deleteUserChannel(discordId: string, cvnlUserId?: string): Promise<boolean> {
    try {
      const channelInfo = await dbService.getUserChannel(discordId, cvnlUserId);
      if (!channelInfo) {
        return false;
      }

      // Try to delete channel from Discord
      try {
        const channel = await this.getChannelById(channelInfo.channelId) as TextChannel;
        if (channel) {
          await channel.delete('User logged out');
          console.log(`Deleted Discord channel: ${channelInfo.channelName}`);
        }
      } catch (deleteError) {
        console.log(`Channel ${channelInfo.channelName} already deleted from Discord`);
      }

      // Always clean up database record
      await dbService.deleteUserChannel(discordId, cvnlUserId);
      return true;
    } catch (error) {
      console.error('Failed to delete user channel:', error);
      return false;
    }
  }

  async getChannelById(channelId: string): Promise<Channel | null> {
    try {
      if (client.channels.cache.has(channelId)) {
        const channel = client.channels.cache.get(channelId) || null;
        if (channel) return channel;
      }
      return await client.channels.fetch(channelId);
    } catch (error) {
      console.error('Failed to fetch channel:', error);
      return null;
    }
  }

  private async createDiscordThread(channel: TextChannel, chatId: string) {
    return await channel.threads.create({
      name: getThreadName(chatId),
      autoArchiveDuration: 10080, // 1 week
      type: ChannelType.PrivateThread,
      reason: `New CVNL chat session: ${chatId}`,
    });
  }

  /**
   * Create a new chat thread for a CVNL user.
   * Unarchives the thread if it already exists.
   *
   * @param discordId - The Discord user ID.
   * @param chatId - The CVNL chat ID.
   * @param cvnlUserId - The CVNL user ID.
   * @return The created or existing thread channel.
   * @throws ChannelNotFoundError if no channel is found for the user.
   * @throws InvalidChannelTypeError if the channel type is not valid for creating a thread.
   * @description This method checks if a thread already exists for the given chatId and cvnlUserId.
   */
  public async createChatThread(discordId: string, chatId: string, cvnlUserId: string): Promise<ThreadChannelWithNewFlag> {
    const channelInfo = await dbService.getUserChannel(discordId, cvnlUserId);
    if (!channelInfo) {
      throw new ChannelNotFoundError(`No channel found for user ${discordId}`);
    }
    const channel = await this.getChannelById(channelInfo.channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new InvalidChannelTypeError('Invalid channel type for creating thread');
    }
    const existingThread = await this.getUserChatThread(chatId, cvnlUserId);
    if (!existingThread) {
      const remoteThread = await this.createDiscordThread(channel, chatId) as ThreadChannelWithNewFlag;
      remoteThread.is_new = true;
      await dbService.saveChatThread({
        chatId: chatId,
        threadId: remoteThread.id,
        discordId: discordId,
        channelId: channel.id,
        threadName: remoteThread.name,
        cvnlUserId: cvnlUserId,
        status: THREAD_CHAT_STATUS_ACTIVE,
      });
      return remoteThread;
    }
    const thread = await this.getChannelById(existingThread.threadId);


    let reOpenCount = existingThread?.reOpenCount || 0;
    if (existingThread.status === THREAD_CHAT_STATUS_ARCHIVED) {
      reOpenCount += 1;
    }

    if (!thread || !thread.isThread()) {
      const remoteThread = await this.createDiscordThread(channel, chatId) as ThreadChannelWithNewFlag;
      remoteThread.is_recreated = true; // Mark as recreated
      await dbService.updateChatThread(existingThread.id, {
        threadId: remoteThread.id,
        threadName: remoteThread.name,
        status: THREAD_CHAT_STATUS_ACTIVE,
        reOpenCount,
      });
      return remoteThread;
    }
    await thread.setArchived(false);
    if (existingThread.status === THREAD_CHAT_STATUS_ARCHIVED) {
      await dbService.updateChatThread(existingThread.id, {
        status: THREAD_CHAT_STATUS_ACTIVE,
        reOpenCount,
      });
    }
    return thread;
  }
  async deleteChatThread(threadId: number) {
    return await dbService.deleteChatThreadById(threadId);
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
      const users = await dbService.getAllUsers();
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
      const channelName = `cvnl-${sanitizeChannelName(user.cvnlUserName)}-${cvnlUserId.slice(-6)}`;
      
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
      await dbService.saveUserChannel({
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
}

export default new ChannelService();
