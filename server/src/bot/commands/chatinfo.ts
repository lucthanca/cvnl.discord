import { CommandHandler } from "./index.js";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import channelService, { ChannelNotFoundError } from "~/services/channel.js";
import dbService from "~/services/database.js";
import cvnlApiService from "~/services/api.js";

const ensureChannelUser = async (channelId: string) => {
  const channel = await channelService.getChannelById(channelId);
  if (!channel) {
    throw new ChannelNotFoundError('❌ Kênh không tồn tại hoặc không được quản lý.');
  }
  let userChannelId = channel.id;
  if (channel.isThread()) {
    const textChannel = channel.parent;
    if (!textChannel) {
      throw new ChannelNotFoundError('❌ Kênh không phải là một thread hợp lệ.');
    }
    userChannelId = textChannel.id;
  }
  // Verify this text channel is exist in database
  const userChannel = await dbService.getUserChannelByChannelId(userChannelId);
  if (!userChannel) {
    throw new ChannelNotFoundError('❌ Không tìm thấy kênh người dùng hoặc lệnh này không thể thực thi ở đây.');
  }
  return {
    remoteChannel: channel,
    userChannel,
  };
}

export default {
  name: 'chatinfo',
  description: 'Xem thông tin chat hiện tại của các tài khoản CVNL',
  type: ["chat_input"],
  handle: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const oauthUser = await dbService.getResource().oAuthSession.findUnique({
        where: {
          discordId: interaction.user.id,
        }
      });
      if (!oauthUser) {
        await interaction.editReply({
          content: '❌ Tài khoản Discord chưa được liên kết.',
        });
        return;
      }

      const discordId = interaction.user.id;
      const channelId = interaction.channelId;

      console.log(`Nhận lệnh chatinfo từ người dùng Discord: ${discordId} trong kênh: ${channelId}`);

      // Check if command come from own-created channel
      const {
        userChannel,
        remoteChannel,
      } = await ensureChannelUser(channelId);
      // Fetch user chat info
      const userChatInfo = await cvnlApiService.getUserActiveChatInfo(userChannel.user.token);
      let responseMessage = `📊 **Thông tin Chat CVNL - ${userChannel.user.cvnlUserName}**\n\n`;
      if (!userChatInfo) {
        responseMessage += `🔴 **Trạng thái:** Không trong chat\n`;
      } else {
        if (userChatInfo.status === 'chatting') {
          responseMessage += `🟢 **Trạng thái:** Đang trong chat\n`;
          // Add chat partner gender and age only
          responseMessage += `👤 Đối phương là: ${userChatInfo.partnerGender} - ${userChatInfo.partnerJob}\n`;
          responseMessage += `💬 **Chat ID:** \`${userChatInfo.chatId}\`\n`;
          responseMessage += `⏰ **Bắt đầu:** ${new Date(userChatInfo.createdAt).toLocaleString('vi-VN')}\n`;

          // Calculate duration
          const startTime = new Date(userChatInfo.createdAt);
          const now = new Date();
          const durationMs = now.getTime() - startTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          responseMessage += `⏱️ **Thời lượng:** ${durationMinutes} phút\n`;

          // Thêm thông tin về thread nếu là thực thi lệnh ở channel text
          if (!remoteChannel.isThread()) {
            // fetch thread chat by chat id and cvnl user id
            const threadChat = await dbService.getChatThread(userChatInfo.chatId, userChannel.user.cvnlUserId);
            if (threadChat) {
              responseMessage += `** Cuộc trò chuyện này đang diễn ra trong thread: <#${threadChat.threadId}> **\n`;
            } else {
              responseMessage += `** Cuộc trò chuyện này không có thread nào liên kết. **\n`;
            }
          }
        } else {
          responseMessage += `🔴 **Trạng thái:** ${userChatInfo.status}\n`;
        }
      }
      await interaction.editReply({
        content: responseMessage,
      });
    } catch (e) {
      if (e instanceof ChannelNotFoundError) {
        await interaction.editReply({
          content: e.message,
        });
        return;
      }
      console.error('Lỗi khi xử lý lệnh chatinfo:', e);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi lấy thông tin chat. Vui lòng thử lại sau.',
      });
    }
  }
} as CommandHandler;