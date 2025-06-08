import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import dbService from '../../services/database.js';
import { WebSocketService } from '../../services/websocket.js';
import { CommandHandler, DiscordBot } from "../bot";

export class StartChatCommandHandler implements CommandHandler {
  constructor(
    private bot: DiscordBot,
    private wsService: WebSocketService | null = null
  ) {}

  setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
  }

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const discordUserId = interaction.user.id;
      const channelId = interaction.channelId;
      console.log(`Start chat command from Discord user: ${discordUserId} in channel: ${channelId}`);

      // Get the channel-specific user info
      const channelUser = await this.getChannelUser(discordUserId, channelId);
      
      if (!channelUser) {
        await interaction.editReply({
          content: '❌ Không tìm thấy tài khoản CVNL cho kênh này. Sử dụng `/login` để bắt đầu.',
        });
        return;
      }

      console.log(`Found user for channel: ${channelUser.cvnlUserName} (${channelUser.cvnlUserId})`);

      // Check current chat status
      try {
        const chatInfo = await this.getChatInfo(channelUser.token);
        
        // Check if already in chat
        if (chatInfo && chatInfo.status === 'ok' && chatInfo.data?.chat) {
          const chat = chatInfo.data.chat;
          
          if (chat.status === 'chatting') {
            await interaction.editReply({
              content: `⚠️ **Bạn đang chat rồi!**\n\n` +
                      `👤 **Đang chat với:** ${chat.stranger?.name || 'Unknown'}\n` +
                      `💬 **Chat ID:** \`${chat.id}\`\n` +
                      `⏰ **Bắt đầu:** ${new Date(chat.createdAt).toLocaleString('vi-VN')}\n\n` +
                      `Hãy kết thúc cuộc trò chuyện hiện tại trước khi bắt đầu chat mới.`,
            });
            return;
          }
        }

        // User is not in chat, proceed to start chat
        await interaction.editReply({
          content: `🔍 **Đang tìm kiếm người chat cho ${channelUser.cvnlUserName}...**\n\n` +
                  `Vui lòng đợi trong giây lát...`,
        });

        // Emit event to client to start chat
        if (this.wsService) {
          const sent = this.wsService.sendToUser(channelUser.cvnlUserId, 'start_chat_from_discord', {
            discordUserId: discordUserId,
            channelId: channelId,
            cvnlUserId: channelUser.cvnlUserId,
            userName: channelUser.cvnlUserName,
            timestamp: new Date().toISOString()
          });

          if (sent) {
            console.log(`Sent start chat event to user ${channelUser.cvnlUserName}`);
          } else {
            await interaction.editReply({
              content: `❌ **Không thể kết nối với client CVNL**\n\n` +
                      `Vui lòng đảm bảo:\n` +
                      `• Client CVNL đang chạy\n` +
                      `• Tài khoản ${channelUser.cvnlUserName} đã đăng nhập\n` +
                      `• Kết nối WebSocket hoạt động bình thường`,
            });
            return;
          }
        } else {
          await interaction.editReply({
            content: `❌ **WebSocket service không khả dụng**\n\nVui lòng liên hệ admin để kiểm tra.`,
          });
        }

      } catch (error) {
        console.error(`Failed to get chat info for ${channelUser.cvnlUserName}:`, error);
        await interaction.editReply({
          content: `❌ **Lỗi khi kiểm tra trạng thái chat**\n\n${error instanceof Error ? error.message : 'Không thể lấy thông tin chat'}`,
        });
      }

    } catch (error) {
      console.error('Start chat command error:', error);
      await interaction.editReply({
        content: '❌ Có lỗi xảy ra khi bắt đầu chat. Vui lòng thử lại sau.',
      });
    }
  }

  private async getChannelUser(discordUserId: string, channelId: string): Promise<any> {
    try {
      // Get all user tokens for this Discord user
      const userTokens = await dbService.getUsersByDiscordId(discordUserId);
      
      // Find the user whose channel matches this channelId
      for (const user of userTokens) {
        const channelInfo = await dbService.getUserChannelByCvnlUser(discordUserId, user.cvnlUserId);
        if (channelInfo && channelInfo.channelId === channelId) {
          return user;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error getting channel user:', error);
      return null;
    }
  }

  private async getChatInfo(token: string): Promise<any> {
    try {
      const response = await fetch('https://rc.cvnl.app/api/chat/info', {
        method: 'GET',
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Chat info API response:', data);

      return data;
    } catch (error) {
      console.error('Error fetching chat info:', error);
      throw error;
    }
  }
}
