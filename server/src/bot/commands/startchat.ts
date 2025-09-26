import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import dbService from '~/services/database.js';
import { CommandHandler } from "./index.js";
import channelService from '~/services/channel.js';
import { clients, populateClientKey } from '~/ws/clientStore.js';
import cvnlApiService from "~/services/api.js";
import { waitForEventWithTimeout } from "~/utils/emitWithTimeout.js";

export const EVENT_DISCORD_START_CHAT = 'start_chat';
export default {
  name: "startchat",
  description: "Bắt đầu tìm kiếm và chat với người lạ",
  type: ['chat_input'],
  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const discordUserId = interaction.user.id;
    const channelId = interaction.channelId;
    try {
      // const oauthUser = await dbService.getResource().oAuthSession.findUnique({
      //   where: {
      //     discordId: interaction.user.id,
      //   }
      // });
      // if (!oauthUser) {
      //   await interaction.editReply({
      //     content: '❌ Tài khoản Discord chưa được liên kết.',
      //   });
      //   return;
      // }
      console.log(`🟢 Nhận lệnh bắt đầu chat từ người dùng Discord: ${discordUserId} trong kênh: ${channelId}`);

      // Get remote channel của user
      const remoteChannel = await channelService.getChannelById(channelId);
      if (remoteChannel?.isThread()) {
        console.log(`🔍 Kênh là thread, không thể bắt đầu chat mới.`);
        await interaction.editReply({
          content: `❌ Không thể bắt đầu chat trong thread. Vui lòng sử dụng kênh chính <#${remoteChannel.parentId}> để bắt đầu chat mới.`,
        });
        return;
      }

      const dbChannel = await dbService.getUserChannelByChannelId(channelId);
      if (!dbChannel) {
        console.log(`❌ Không tìm thấy kênh trong cơ sở dữ liệu cho channelId: ${channelId}`);
        await interaction.editReply({
          content: '❌ Không tìm thấy kênh trong cơ sở dữ liệu. Vui lòng sử dụng lệnh `/login` để đăng nhập.',
        });
        return;
      }

      const clientSocket = clients.get(populateClientKey(dbChannel.cvnlUserId));
      if (!clientSocket) {
        console.log(`❌ Không tìm thấy kết nối WebSocket cho người dùng CVNL: ${dbChannel.cvnlUserId}`);
        await interaction.editReply({
          content: '❌ Không thể kết nối với client CVNL. Vui lòng đảm bảo client đang chạy và đã đăng nhập.',
        });
        return;
      }
      // Check user chat info
      const activeChatInfo = await cvnlApiService.getUserActiveChatInfo(clientSocket.token);
      if (!activeChatInfo) {
        console.log(`❌ Không tìm thấy thông tin chat đang hoạt động cho người dùng CVNL: ${dbChannel.cvnlUserId}`);
        await interaction.editReply({
          content: '❌ Không thể lấy thông tin chat đang hoạt động. Vui lòng thử lại sau.',
        });
        return;
      } else if (activeChatInfo.chatId) {
        console.log(`❌ Người dùng CVNL ${dbChannel.user.cvnlUserName} đang có chat hoạt động: ${activeChatInfo.chatId}`);

        // get chat thread
        const threadChat = await dbService.getChatThread(activeChatInfo.chatId, dbChannel.user.cvnlUserId);
        if (!threadChat) {
          console.log(`❌ Không tìm thấy thread chat cho chatId: ${activeChatInfo.chatId}`);
          return;
        }
        await interaction.editReply({
          content: `❌ **Bạn đang có một cuộc trò chuyện đang hoạt động:**\n\n` +
                   `Chat ID: \`${activeChatInfo.chatId}\`\n` +
                   `Vui lòng kết thúc cuộc trò chuyện hiện tại trước khi bắt đầu mới.\n` +
                  `Đoạn chat trong thread: <#${threadChat.threadId}>`,
        });
        return;
      }


      try {
        waitForEventWithTimeout<{ status: 'success' | 'error', message: string }>(clientSocket.socket, `${EVENT_DISCORD_START_CHAT}_RESPONSE`, 10000).then((data) => {
          if (data.status === 'error') {
            console.error(`❌ Lỗi khi gửi yêu cầu bắt đầu chat: ${data.message}`);
            interaction.editReply({
              content: `❌ **Lỗi khi bắt đầu chat:** ${data.message}\n\n` +
                      `Vui lòng đảm bảo client CVNL đang chạy và đã đăng nhập.`,
            });
            return;
          }
          console.log(`✅ Đã gửi yêu cầu bắt đầu chat đến client CVNL: ${dbChannel.user.cvnlUserName}`);
          interaction.editReply({
            content: `🔍 **Đang tìm kiếm người chat cho ${dbChannel.user.cvnlUserName}...**\n\n` +
                    `Vui lòng đợi trong giây lát...`,
          });
        }).catch(e => {
          console.error(`❌ Timeout waiting for ${EVENT_DISCORD_START_CHAT}_RESPONSE from client ${clientSocket.cvnlUserId}`, e);
          interaction.editReply({
            content: `❌ Tiến trình bắt đầu chat đã hết thời gian chờ. Có thể Client đang bị mất kết nối, check lại trình duyệt mà cài Extension CVNL nhé!`,
          });
          return;
        });
        clientSocket.socket.emit(EVENT_DISCORD_START_CHAT);
      } catch (e) {
        console.log(`❌ Lỗi khi gửi yêu cầu bắt đầu chat: ${e}`);
      }
    } catch (e) {

    }
  }
} as CommandHandler;
