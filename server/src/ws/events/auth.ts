import { Socket } from "socket.io";
import cvnlApiService from "~/services/api.js";
import dbService from "~/services/database.js";
import { AuthenticatedClient, clients, populateClientKey } from "~/ws/clientStore.js";
import channelService from "~/services/channel.js";
import cvnlChatEvent from "~/ws/events/cvnlChatEvent.js";

export interface AuthMessage {
  token: string;
  discordUserId: string;
}

export const EVENT_AUTH_ERROR = 'auth_error';
export const EVENT_AUTH_SUCCESS = 'auth_success';

const restoreThreadChat = async (client: AuthenticatedClient) => {
  const activeChatInfo = await cvnlApiService.getUserActiveChatInfo(client.token);
  if (!activeChatInfo?.chatId) return;
  console.log(`🔄 Bắt đầu khôi phục cuộc trò chuyện đang hoạt động cho người dùng ${client.cvnlUserId}:`);
  client.activeChatId = activeChatInfo.chatId;

  // ensure chat thread exists
  const channel = await channelService.createChatThread(client.discordId, client.activeChatId, client.cvnlUserId);
  client.activeThread = channel;
  if (channel.is_recreated) {
    channel.send({
      embeds: [{
        title: '🔄 Cuộc trò chuyện đã được khôi phục',
        description: `Bạn đã được ghép lại với người lạ trong cuộc trò chuyện cũ.`,
        color: 0x00ff00,
        fields: [
          {
            name: '💬 Chat ID',
            value: `\`${client.activeChatId}\``,
            inline: true
          },
          {
            name: '👤 CVNL User',
            value: client.cvnlUserId,
            inline: true
          }
        ]
      }]
    });
  } else if (channel.is_new) {
    console.log('DEBUG: Cuộc trò chuyện mới, gửi tin nhắn chào mừng');
    channel.send({
      embeds: [{
        title: '🌟 Cuộc trò chuyện mới bắt đầu',
        description: `Bạn đã được ghép với một người lạ`,
        color: 0x00ff00,
        fields: [
          {
            name: '💬 Chat ID',
            value: `\`${client.activeChatId}\``,
            inline: true
          },
          {
            name: '👤 CVNL User',
            value: client.cvnlUserId,
            inline: true
          }
        ]
      }]
    })
  } else {
    console.log(`🔄 Cuộc trò chuyện đã tồn tại, không cần khôi phục: ${client.activeChatId}`);
  }

  // get last 10 message sent by stranger
  const lastMessages = activeChatInfo.messages
    .filter(msg => msg.from === 'stranger')
    .slice(-10);
  if (lastMessages.length === 0) return;
  // sync last messages to discord and db
  void channelService.syncMessages(client.activeThread, lastMessages);
}

const enqueuedAuthClients = {} as {[socketId: string]: boolean};

export default async function onAuth(socket: Socket, data: AuthMessage) {
  if (enqueuedAuthClients.hasOwnProperty(socket.id)) return;
  enqueuedAuthClients[socket.id] = true;
  console.log('🔐 Yêu cầu xác thực:', { socketId: socket.id, hasToken: !!data?.token });

  if (!data || !data.token || !data.discordUserId) {
    console.log('❌ Xác thực thất bại: Không có token được cung cấp');
    socket.emit(EVENT_AUTH_ERROR, { error: 'Token là bắt buộc để xác thực' });
    return;
  }
  console.log('🔍 Đang xác thực token với CVNL API...');

  const userInfo = await cvnlApiService.authenticateUser(data.token);
  if (!userInfo) {
    console.log('❌ Xác thực thất bại: Token không hợp lệ');
    socket.emit(EVENT_AUTH_ERROR, { error: 'Token không hợp lệ' });
    return;
  }

  console.log(`✅ [${userInfo.id}] Token hợp lệ.`);

  // Get user from database
  const user = await dbService.getUser(data.discordUserId, userInfo.id);
  if (!user) {
    console.log('❌ Xác thực thất bại: Người dùng không tìm thấy trong cơ sở dữ liệu cho cvnlUserId:', userInfo.id);
    socket.emit(EVENT_AUTH_ERROR, {
      error: 'Người dùng không tìm thấy trong bot Discord. Vui lòng đăng nhập trước.'
    });
    return;
  }

  // const dta = {
  //   discordId: user.discordId,
  //   cvnlUserId: user.cvnlUserId,
  //   name: user.cvnlUserName
  // };
  console.log('👤 Tìm thấy người dùng trong cơ sở dữ liệu !!!');

  const clientKey = populateClientKey(userInfo.id);
  // Remove existing connection for this user if any (but don't disconnect the socket)
  const existingClientKey = Array.from(clients.keys()).find(key => key === clientKey);
  if (existingClientKey) {
    console.log('🔄 Huỷ theo dõi kết nối đang tồn tại', existingClientKey);
    clients.delete(existingClientKey);
  }

  socket.on('cvnlChatEvent', (data: any) => cvnlChatEvent(socket, data));

  // Store authenticated client
  const authenticatedClient: AuthenticatedClient = {
    socket,
    user,
    token: data.token,
    discordId: user.discordId,
    cvnlUserId: user.cvnlUserId,
  };
  clients.set(clientKey, authenticatedClient);

  console.log(`✅ Đã xác thực thành công: ${user.cvnlUserName} (Discord: ${user.discordId}) Socket: ${socket.id}`);
  socket.emit(EVENT_AUTH_SUCCESS, {
    discordId: user.discordId,
    cvnlUserId: user.cvnlUserId,
    cvnlUserName: user.cvnlUserName,
    socketId: socket.id
  });
  void restoreThreadChat(authenticatedClient);
}