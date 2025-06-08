import { AuthenticatedClient } from '../services/websocket.js';
import { ChannelService } from '../services/channel.js';
import dbService from "../services/database.js";

export class CVNLEventHandlers {
  constructor(
    private channelService: ChannelService,
    private activeChatUsers?: Map<string, string> // cvnlUserId -> chatId
  ) {}

  async handleC1Event(client: AuthenticatedClient, data: any): Promise<void> {
    try {
      const chatId = data.data.id;
      
      if (!chatId) {
        console.error('No chat ID found in C1 event');
        return;
      }

      console.log(`Processing C1 (chat started) for user ${client.cvnlUserName}, chatId: ${chatId}`);

      // Check if user already has an active chat
      const existingChatId = this.activeChatUsers?.get(client.cvnlUserId);
      if (existingChatId && existingChatId !== chatId) {
        console.log(`User ${client.cvnlUserName} already has active chat ${existingChatId}, ending previous chat`);
        
        // Archive previous chat thread
        await this.archivePreviousChat(client, existingChatId);
      }

      // Set new active chat for this user
      client.activeChatId = chatId;
      this.activeChatUsers?.set(client.cvnlUserId, chatId);

      // Create new chat thread
      const thread = await this.channelService.createChatThread(client.discordId, chatId, client.cvnlUserId);

      if (!thread) {
        console.error(`Failed to create thread for chat ${chatId} and user ${client.cvnlUserName}`);
        return;
      }
      // Send initial message to thread
      await thread.send({
        embeds: [{
          title: '🌟 Cuộc trò chuyện mới bắt đầu',
          description: `Bạn đã được ghép với một người lạ`,
          color: 0x00ff00,
          fields: [
            {
              name: '💬 Chat ID',
              value: `\`${chatId}\``,
              inline: true
            },
            {
              name: '👤 CVNL User',
              value: client.cvnlUserName,
              inline: true
            },
            {
              name: '🧵 Thread',
              value: thread.name,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: `CVNL: ${client.cvnlUserId.slice(-8)} | Discord: ${client.discordId.slice(-8)}`
          }
        }]
      });
    } catch (error) {
      console.error('Error handling C1 event:', error);
    }
  }

  private async archivePreviousChat(client: AuthenticatedClient, previousChatId: string): Promise<void> {
    try {
      const chatThread = await dbService.getChatThread(previousChatId, client.cvnlUserId);
      if (!chatThread) {
        console.log(`No thread found for previous chat ${previousChatId}`);
        return;
      }

      // Get the thread
      const thread = await this.channelService.getChannelById(chatThread.threadId);
      if (thread && thread.isThread()) {
        // Send end message to previous thread
        await thread.send({
          embeds: [{
            title: '🔄 Cuộc trò chuyện trước đã kết thúc',
            description: 'Người dùng đã bắt đầu cuộc trò chuyện mới',
            color: 0xff9500,
            timestamp: new Date().toISOString(),
          }]
        });

        // Archive the thread
        await thread.setArchived(true, 'User started new chat');
        console.log(`Archived previous chat thread ${chatThread.threadId}`);
      }

      // Clean up database
      await dbService.deleteChatThreadById(chatThread.id);
    } catch (error) {
      console.error('Error archiving previous chat:', error);
    }
  }

  async handleC2Event(client: AuthenticatedClient, data: any): Promise<void> {
    try {
      const messageData = data.data as {
        id: string;
        content: string;
      };
      const chatId = client.activeChatId;
      const content = messageData.content;

      if (!chatId || !content) {
        console.error('Missing chatId or content in C2 event');
        return;
      }

      console.log(`Processing C2 (new message) for chat ${chatId}`);

      // Find thread for this chat
      const chatThread = await dbService.getChatThread(chatId, client.cvnlUserId);
      if (!chatThread) {
        console.log(`No thread found for chat ${chatId}, skipping message`);
        return;
      }

      // Get the thread
      const thread = await this.channelService.getChannelById(chatThread.threadId);
      if (!thread || !thread.isThread()) {
        console.log(`Thread ${chatThread.threadId} no longer exists`);
        // Clean up database
        await dbService.deleteChatThreadById(chatThread.id);
        return;
      }

      // Format message with sender info
      const senderIcon = '👥';
      const senderName = 'Người lạ';
      const messageColor = 0x57F287;

      // Send message to thread
      await thread.send({
        embeds: [{
          description: content,
          color: messageColor,
          author: {
            name: `${senderIcon} ${senderName}`,
          },
          timestamp: new Date().toISOString(),
          footer: {
            text: `Chat: ${chatId.slice(-8)}`
          }
        }]
      });

      console.log(`✅ Sent message to thread ${chatThread.threadId} for chat ${chatId}`);

    } catch (error) {
      console.error('Error handling C2 event:', error);
    }
  }

  async handleC5Event(client: AuthenticatedClient, data: any): Promise<void> {
    try {
      const chatId = client.activeChatId;
      
      if (!chatId) {
        console.log(`User ${client.cvnlUserName} received C5 but no active chat found`);
        return;
      }

      console.log(`Processing C5 (chat ended) for user ${client.cvnlUserName}, chatId: ${chatId}`);

      // Clear active chat for this user
      client.activeChatId = undefined;
      this.activeChatUsers?.delete(client.cvnlUserId);

      // log current active chats

      console.log(`Current active chats after C5:`, Array.from(this.activeChatUsers?.entries() || []).map(([cvnlUserId, chatId]) => ({
        cvnlUserId,
        chatId
      })));
      // Find and archive thread
      const chatThread = await dbService.getChatThread(chatId, client.cvnlUserId);
      if (chatThread) {
        const thread = await this.channelService.getChannelById(chatThread.threadId);
        if (thread && thread.isThread()) {
          // Send end message
          await thread.send({
            embeds: [{
              title: '🔴 Cuộc trò chuyện đã kết thúc',
              description: 'Cuộc trò chuyện đã được kết thúc',
              color: 0xff0000,
              timestamp: new Date().toISOString(),
            }]
          });

          // Archive the thread
          await thread.setArchived(true, 'Chat ended');
        }

        // Clean up database
        await dbService.deleteChatThreadById(chatThread.id);
      }

      console.log(`✅ Ended chat ${chatId} for user ${client.cvnlUserName}`);
    } catch (error) {
      console.error('Error handling C5 event:', error);
    }
  }

  async handleC17Event(client: AuthenticatedClient, data: any): Promise<void> {
    try {
      const { order } = data.data;
      
      // Only send notification if order > 0 (in queue)
      if (order <= 0) {
        console.log(`User ${client.cvnlUserName} found chat partner (order: ${order}), no notification sent`);
        return;
      }

      console.log(`🔍 C17 DEBUG - Processing queue order for:`, {
        eventCvnlUserId: data.cvnlUserId,
        eventUserName: data.userName,
        clientCvnlUserId: client.cvnlUserId,
        clientUserName: client.cvnlUserName,
        clientDiscordId: client.discordId,
        order: order,
        dataMatches: data.cvnlUserId === client.cvnlUserId
      });

      // Extra validation - make sure the event is for this specific client
      if (data.cvnlUserId !== client.cvnlUserId) {
        console.log(`❌ C17 Event mismatch! Event for ${data.cvnlUserId} but client is ${client.cvnlUserId}`);
        return;
      }

      // Get user-specific Discord channel using both discordId and cvnlUserId
      const channel = await this.channelService.getUserChannelByCvnlUser(client.discordId, client.cvnlUserId);
      if (!channel) {
        console.log(`No Discord channel found for user ${client.discordId} with CVNL user ${client.cvnlUserId}`);
        return;
      }

      console.log(`✅ Sending queue notification to channel ${channel.id} for Discord user ${client.discordId} / CVNL user ${client.cvnlUserId}`);

      // Send queue position update to Discord
      const description = `⏳ **${client.cvnlUserName}** đang ở vị trí **${order}** trong hàng đợi`;

      // await channel.send({
      //   embeds: [{
      //     title: '📊 Cập nhật hàng đợi',
      //     description: description,
      //     color: 0xffa500, // Orange
      //     fields: [
      //       {
      //         name: '👤 Người dùng',
      //         value: client.cvnlUserName,
      //         inline: true
      //       },
      //       {
      //         name: '🆔 CVNL User ID',
      //         value: client.cvnlUserId.slice(-8),
      //         inline: true
      //       },
      //       {
      //         name: '📍 Vị trí',
      //         value: `#${order}`,
      //         inline: true
      //       },
      //       {
      //         name: '🎭 Discord ID',
      //         value: client.discordId.slice(-8),
      //         inline: true
      //       }
      //     ],
      //     timestamp: new Date().toISOString(),
      //     footer: {
      //       text: `CVNL: ${client.cvnlUserId.slice(-8)} | Discord: ${client.discordId.slice(-8)}`
      //     }
      //   }]
      // });

      console.log(`✅ Sent queue order ${order} notification for ${client.cvnlUserName} (Discord: ${client.discordId})`);

    } catch (error) {
      console.error('Error handling C17 event:', error);
    }
  }
}
