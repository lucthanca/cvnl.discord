import { CommandHandler } from "~/bot/commands/index.js";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import cvnlApiService from "~/services/api.js";
import channelService from "~/services/channel.js";
import { clients } from "~/ws/clientStore.js";
import { EVENT_DISCORD_END_CHAT } from "~/shared/constants.js";
import { waitForEventWithTimeout } from "~/utils/emitWithTimeout.js";
import dbService from "~/services/database.js";

export default {
  name: 'endchat',
  description: 'Kết thúc cuộc trò chuyện với người lạ',
  type: ['chat_input'],
  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
    const threadChannel = interaction.channel;
    const channelId = threadChannel?.isThread() ? threadChannel.parentId : threadChannel?.id;
    if (!threadChannel || !channelId) {
      await interaction.editReply({ content: 'Không tìm thấy kênh cuộc trò chuyện.' });
      return;
    }
    if (!threadChannel?.isThread()) {
      await interaction.editReply({
        content: `Lệnh này chỉ có thể được sử dụng trong cuộc trò chuyện. \n`,
      });
      return;
    }
    const activeClient = Array.from(clients.values()).find((client) => {
      // log status of each client
      console.log(`Client ${client.cvnlUserId} activeThread: ${client.activeThread?.id}, disconnected: ${client.socket.disconnected}`);
      return client.activeThread?.id === threadChannel.id && !client.socket.disconnected;
    });
    if (!activeClient) {
      await interaction.editReply({ content: '🚫 Client hiện đang offline. Không thể gửi lệnh endchat!' });
      return;
    }
    const chatInfo = await cvnlApiService.getUserActiveChatInfo(activeClient.user.token);
    if (!chatInfo || chatInfo.status !== 'chatting') {
      await interaction.editReply({ content: '🚫 Bạn không có cuộc trò chuyện nào đang diễn ra.' });
      return;
    }
    if (!activeClient.activeThread?.id) {
      await interaction.editReply({ content: '🚫 Không tìm thấy cuộc trò chuyện đang hoạt động.' });
      return;
    }
    try {
      waitForEventWithTimeout(activeClient.socket, `${EVENT_DISCORD_END_CHAT}_RESPONSE`, 10000).then(async (data: any) => {
        await threadChannel.setArchived(true, '🔚 End chat command issued by user');
        if (activeClient.activeThread?.id) {
          await channelService.archiveChatThread(activeClient.activeThread.id, 'threadId');
        }
        activeClient.activeChatId = undefined;
        activeClient.activeThread = undefined;
        activeClient.activeEphemeralMessage = undefined;
        await interaction.editReply({ content: '🔚 Đã kết thúc cuộc trò chuyện!' });
      });
      activeClient.socket.emit(EVENT_DISCORD_END_CHAT);
    } catch (e) {
      console.log(`❌ Timeout waiting for ${EVENT_DISCORD_END_CHAT}_RESPONSE from client ${activeClient.cvnlUserId}`);
      await interaction.editReply({
        content: `❌ Tiến trình kết thúc cuộc trò chuyện đã hết thời gian chờ. Có thể Client đang bị mất kết nối, check lại trình duyệt mà cài Extension CVNL nhé!`,
      });
    }
  }
} as CommandHandler;