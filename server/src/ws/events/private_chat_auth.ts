import { Socket } from "socket.io";
import jwt from 'jsonwebtoken';
import { clients } from "../clientStore.js";

type AuthData = {
  token: string;
}

export default function onPrivateChatAuth(socket: Socket, data: AuthData) {
  const jwtToken = data?.token;
  if (!jwtToken) {
    console.log('❌ Xác thực thất bại: Không có token được cung cấp');
    socket.emit('private_chat_auth_error', { error: 'Token là bắt buộc để xác thực' });
    socket.disconnect();
    return;
  }

  if (process.env.PRIVATE_CHAT_SECRET_KEY === undefined) {
    throw new Error('PRIVATE_CHAT_SECRET_KEY is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(jwtToken, process.env.PRIVATE_CHAT_SECRET_KEY);
    const chatId = (decoded as any).chatId;
    if (!chatId) {
      console.log('❌ Xác thực thất bại: Token không chứa chatId');
      socket.emit('private_chat_auth_error', { error: 'Token không hợp lệ' });
      socket.disconnect();
    }
    const client = Array.from(clients.values()).find(c => c?.activeChatId === chatId);
    if (!client) {
      console.log(`❌ Không tìm thấy client cho chatId: ${chatId}`);
      socket.emit('private_chat_auth_error', { error: 'Ê có lỗi rồi, hic, cậu thử load lại trang giúp mình nhó!' });
      socket.disconnect();
      return;
    }
    // Attach the client to the socket for further use
    client.privateChatSocket = socket;
    console.log(`✅ Xác thực thành công cho chatId: ${chatId}, socketId: ${socket.id}`);
  } catch (err: any) {
    console.error('Token sai hoặc hết hạn:', err.message);
    socket.emit('private_chat_auth_error', { error: 'Token không hợp lệ hoặc đã hết hạn' });
    socket.disconnect();
  }
}
