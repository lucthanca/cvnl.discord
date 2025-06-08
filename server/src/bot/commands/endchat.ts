import { CommandHandler } from "~/bot/commands/index.js";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import cvnlApiService from "~/services/api.js";
import channelService from "~/services/channel.js";
import { clients, populateClientKey } from "~/ws/clientStore.js";
import { EVENT_DISCORD_END_CHAT } from "~/shared/constants.js";
import { Socket } from "socket.io";

function waitForEventWithTimeout<T = any>(
  socket: Socket,
  event: string,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeListener(event, onEvent); // xoá listener nếu timeout
      reject(new Error(`Timeout waiting for event '${event}'`));
    }, timeoutMs);

    const onEvent = (data: T) => {
      clearTimeout(timer); // nhận được event thì huỷ timeout
      resolve(data);
    };

    socket.once(event, onEvent);
  });
}

export default {
  name: 'endchat',
  description: 'Kết thúc cuộc trò chuyện với người lạ',
  type: ['chat_input'],
  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const threadChannel = interaction.channel;
    const channelId = threadChannel?.isThread() ? threadChannel.parentId : threadChannel?.id;
    if (!threadChannel || !channelId) {
      await interaction.editReply({ content: 'Không tìm thấy kênh cuộc trò chuyện.' });
      return;
    }

    const userChannel = await channelService.getUserChannelById(channelId);
    if (!userChannel) {
      await interaction.editReply({ content: 'Không tìm thấy kênh @@.' });
      return;
    }
    const chatInfo = await cvnlApiService.getUserActiveChatInfo(userChannel.user.token);
    if (!chatInfo || chatInfo.status !== 'chatting') {
      await interaction.editReply({ content: 'Bạn không có cuộc trò chuyện nào đang diễn ra.' });
      return;
    }

    // Kiểm tra xem người dùng có đang trong cuộc trò chuyện không
    const chatThread = await channelService.getUserChatThread(chatInfo.chatId, userChannel.user.cvnlUserId);
    if (!chatThread) {
      await interaction.reply({
        content: 'Bạn không có cuộc trò chuyện nào đang diễn ra.',
        ephemeral: true,
      });
      return;
    }

    if (!threadChannel?.isThread()) {
      const currentThreadId = chatThread.threadId;

      await interaction.editReply({
        content: `Lệnh này chỉ có thể được sử dụng trong cuộc trò chuyện. \n` +
                `Bạn đang có một cuộc trò chuyện ở đây: <#${currentThreadId}>.`,
      });
      return;
    }

    // check if status is chatting (=0)
    const client = clients.get(populateClientKey(userChannel.user.cvnlUserId));
    console.log(`Socket key ${populateClientKey(chatInfo.chatId)}`);
    // Log All clients
    console.log('Current clients:', Array.from(clients.keys()));
    if (!client) {
      await interaction.editReply({ content: '🚫 Client hiện đang offline. Không thể gửi lệnh endchat!' });
      return;
    }
    client.socket.emit(EVENT_DISCORD_END_CHAT);
    try {
      await waitForEventWithTimeout(client.socket, `${EVENT_DISCORD_END_CHAT}_RESPONSE`, 10000).then(async (data: any) => {
        await threadChannel.setArchived(true, '🔚 End chat command issued by user');
        await channelService.archiveChatThread(chatThread.id);
        await interaction.editReply({ content: '🔚 Đã gửi lệnh kết thúc cuộc trò chuyện đến người dùng' });
      });
    } catch (e) {
      console.log(`❌ Timeout waiting for ${EVENT_DISCORD_END_CHAT}_RESPONSE from client ${client.cvnlUserId}`);
      await interaction.editReply({
        content: `❌ Tiến trình kết thúc cuộc trò chuyện đã hết thời gian chờ. Vui lòng thử lại sau.`,
      })
    }
    return;
  }
} as CommandHandler;