import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { DatabaseService } from '../../services/database.js';

export class ChatInfoCommandHandler {
  constructor(private dbService: DatabaseService) {}

  async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const discordUserId = interaction.user.id;
      const channelId = interaction.channelId;
      console.log(`Chat info command from Discord user: ${discordUserId} in channel: ${channelId}`);

      // Get the channel-specific user info
      const channelUser = await this.getChannelUser(discordUserId, channelId);
      
      if (!channelUser) {
        await interaction.editReply({
          content: '❌ Không tìm thấy tài khoản CVNL cho kênh này. Sử dụng `/login` để bắt đầu.',
        });
        return;
      }

      console.log(`Found user for channel: ${channelUser.cvnlUserName} (${channelUser.cvnlUserId})`);

      // Check chat info for this specific user
      try {
        const chatInfo = await this.getChatInfo(channelUser.token);
        
        let responseMessage = `📊 **Thông tin Chat CVNL - ${channelUser.cvnlUserName}**\n\n`;
        
        if (chatInfo && chatInfo.status === 'ok' && chatInfo.data?.chat) {
          const chat = chatInfo.data.chat;
          
          if (chat.status === 'chatting') {
            responseMessage += `🟢 **Trạng thái:** Đang chat\n`;
            responseMessage += `👤 **Đang chat với:** ${chat.stranger?.name || 'Unknown'}\n`;
            responseMessage += `💬 **Chat ID:** \`${chat.id}\`\n`;
            responseMessage += `⏰ **Bắt đầu:** ${new Date(chat.createdAt).toLocaleString('vi-VN')}\n`;
            
            // Calculate duration
            const startTime = new Date(chat.createdAt);
            const now = new Date();
            const durationMs = now.getTime() - startTime.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            responseMessage += `⏱️ **Thời lượng:** ${durationMinutes} phút\n`;
            
            // Show message count if available
            if (chat.messages && Array.isArray(chat.messages)) {
              responseMessage += `💭 **Số tin nhắn:** ${chat.messages.length}\n`;
            }
            
            // Show stranger info if available
            if (chat.stranger) {
              responseMessage += `\n**Thông tin người chat:**\n`;
              if (chat.stranger.gender) responseMessage += `👥 Giới tính: ${chat.stranger.gender}\n`;
              if (chat.stranger.age) responseMessage += `🎂 Tuổi: ${chat.stranger.age}\n`;
              if (chat.stranger.job !== undefined) {
                const jobName = this.getJobName(chat.stranger.job);
                responseMessage += `💼 Nghề nghiệp: ${jobName}\n`;
              }
            }
          } else {
            responseMessage += `🔴 **Trạng thái:** ${chat.status}\n`;
          }
        } else {
          responseMessage += `🔴 **Trạng thái:** Không trong chat\n`;
        }

        await interaction.editReply({
          content: responseMessage,
        });

      } catch (error) {
        console.error(`Failed to get chat info for ${channelUser.cvnlUserName}:`, error);
        await interaction.editReply({
          content: `❌ **Lỗi:** ${error instanceof Error ? error.message : 'Không thể lấy thông tin chat'}\n`,
        });
      }

    } catch (error) {
      console.error('Chat info command error:', error);
      await interaction.editReply({
        content: '❌ Có lỗi xảy ra khi lấy thông tin chat. Vui lòng thử lại sau.',
      });
    }
  }

  private async getChannelUser(discordUserId: string, channelId: string): Promise<any> {
    try {
      // Get all user tokens for this Discord user
      const userTokens = await this.dbService.getUsersByDiscordId(discordUserId);
      
      // Find the user whose channel matches this channelId
      for (const user of userTokens) {
        const channelInfo = await this.dbService.getUserChannelByCvnlUser(discordUserId, user.cvnlUserId);
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

  private getJobName(jobCode: number): string {
    const jobMap: { [key: number]: string } = {
      0: "Bí mật",
      1: "Học sinh",
      2: "Sinh viên", 
      3: "Người đi làm"
      // Có thể thêm nhiều job codes khác trong tương lai
    };
    
    return jobMap[jobCode] || `Nghề nghiệp #${jobCode}`;
  }
}
