// import { Socket } from 'socket.io';
// import { DatabaseService } from '../services/database.js';
// import { ChannelService } from '../services/channel.js';
// import { NewChatMessage, NewMessageMessage, EndChatMessage, AuthenticatedClient } from '../services/websocket.js';
//
// export class ChatHandler {
//   constructor(
//     private dbService: DatabaseService,
//     private channelService: ChannelService,
//     private authenticatedClients: Map<string, AuthenticatedClient>
//   ) {}
//
//   async handleNewChat(socket: Socket, data: NewChatMessage): Promise<void> {
//     try {
//       // Find authenticated client
//       const client = Array.from(this.authenticatedClients.values())
//         .find(c => c.socket.id === socket.id);
//
//       if (!client) {
//         socket.emit('new_chat_error', { error: 'Not authenticated' });
//         return;
//       }
//
//       if (!data.chatId) {
//         socket.emit('new_chat_error', { error: 'Chat ID is required' });
//         return;
//       }
//
//       // Check if chat thread already exists
//       const existingThread = await this.dbService.getChatThread(data.chatId);
//       if (existingThread) {
//         socket.emit('new_chat_success', {
//           chatId: data.chatId,
//           threadId: existingThread.threadId,
//           threadName: existingThread.threadName,
//           channelId: existingThread.channelId,
//           existing: true
//         });
//         return;
//       }
//
//       // Get user's Discord channel
//       const channel = await this.channelService.getUserChannel(client.discordId);
//       if (!channel) {
//         socket.emit('new_chat_error', { error: 'Discord channel not found' });
//         return;
//       }
//
//       // Create thread in the channel
//       const threadName = `Chat-${data.chatId.slice(-8)}`;
//       const thread = await channel.threads.create({
//         name: threadName,
//         reason: `New CVNL chat session: ${data.chatId}`,
//       });
//
//       // Save thread mapping to database
//       await this.dbService.saveChatThread({
//         chatId: data.chatId,
//         threadId: thread.id,
//         discordId: client.discordId,
//         channelId: channel.id,
//         threadName: thread.name,
//         cvnlUserId: client.cvnlUserId
//       });
//
//       // Send initial message to thread
//       const strangerInfo = data.metadata?.stranger;
//       const strangerDesc = strangerInfo
//         ? `(${strangerInfo.gender === 'male' ? 'Nam' : strangerInfo.gender === 'female' ? 'Nữ' : 'Khác'}, Nghề nghiệp: ${strangerInfo.job})`
//         : '';
//
//       await thread.send({
//         embeds: [{
//           title: '🌟 Cuộc trò chuyện mới',
//           description: `Người lạ đã tham gia cuộc trò chuyện ${strangerDesc}`,
//           color: 0x00ff00,
//           fields: [
//             {
//               name: '💬 Chat ID',
//               value: `\`${data.chatId}\``,
//               inline: true
//             },
//             {
//               name: '🧵 Thread',
//               value: threadName,
//               inline: true
//             }
//           ],
//           timestamp: new Date().toISOString(),
//         }]
//       });
//
//       console.log(`Created thread ${threadName} for chat ${data.chatId} by user ${client.cvnlUserName}`);
//
//       // Send response back to client
//       socket.emit('new_chat_success', {
//         chatId: data.chatId,
//         threadId: thread.id,
//         threadName: thread.name,
//         channelId: channel.id,
//         existing: false
//       });
//
//     } catch (error) {
//       console.error('New chat error:', error);
//       socket.emit('new_chat_error', { error: 'Failed to create new chat thread' });
//     }
//   }
//
//   async handleNewMessage(socket: Socket, data: NewMessageMessage): Promise<void> {
//     try {
//       // Find authenticated client
//       const client = Array.from(this.authenticatedClients.values())
//         .find(c => c.socket.id === socket.id);
//
//       if (!client) {
//         socket.emit('new_message_error', { error: 'Not authenticated' });
//         return;
//       }
//
//       if (!data.chatId || !data.message?.content) {
//         socket.emit('new_message_error', { error: 'Chat ID and message content are required' });
//         return;
//       }
//
//       // Find thread for this chat from database
//       const chatThread = await this.dbService.getChatThread(data.chatId);
//       if (!chatThread) {
//         socket.emit('new_message_error', { error: 'Thread not found for this chat. Create a new chat first.' });
//         return;
//       }
//
//       // Get the thread
//       const thread = await this.channelService.getChannelById(chatThread.threadId);
//       if (!thread || !thread.isThread()) {
//         // Thread no longer exists, remove from database
//         this.dbService.deleteChatThread(data.chatId);
//         socket.emit('new_message_error', { error: 'Thread no longer exists. Please create a new chat.' });
//         return;
//       }
//
//       // Format message with sender info
//       const senderIcon = data.message.sender === 'user' ? '👤' : '👥';
//       const senderName = data.message.sender === 'user' ? 'Bạn' : 'Người lạ';
//       const timestamp = data.message.timestamp ? new Date(data.message.timestamp).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN');
//
//       // Send message to thread
//       await thread.send({
//         embeds: [{
//           description: data.message.content,
//           color: data.message.sender === 'user' ? 0x5865F2 : 0x57F287,
//           author: {
//             name: `${senderIcon} ${senderName}`,
//           },
//           timestamp: new Date().toISOString(),
//           footer: {
//             text: `Chat: ${data.chatId.slice(-8)} • ${timestamp}`
//           }
//         }]
//       });
//
//       console.log(`Message sent to thread ${chatThread.threadId} for chat ${data.chatId} by ${client.cvnlUserName}`);
//
//       // Send response back to client
//       socket.emit('new_message_success', {
//         chatId: data.chatId,
//         threadId: chatThread.threadId,
//         messageId: data.message.content.slice(0, 20) + '...',
//         timestamp: new Date().toISOString()
//       });
//
//     } catch (error) {
//       console.error('New message error:', error);
//       socket.emit('new_message_error', { error: 'Failed to send message to thread' });
//     }
//   }
//
//   async handleEndChat(socket: Socket, data: EndChatMessage): Promise<void> {
//     try {
//       // Find authenticated client
//       const client = Array.from(this.authenticatedClients.values())
//         .find(c => c.socket.id === socket.id);
//
//       if (!client) {
//         socket.emit('end_chat_error', { error: 'Not authenticated' });
//         return;
//       }
//
//       if (!data.chatId) {
//         socket.emit('end_chat_error', { error: 'Chat ID is required' });
//         return;
//       }
//
//       client.activeChatId = undefined;
//       // Find thread for this chat from database
//       const chatThread = await this.dbService.getChatThread(data.chatId, client.cvnlUserId);
//       if (!chatThread) {
//         socket.emit('end_chat_error', { error: 'Thread not found for this chat.' });
//         return;
//       }
//
//       // Verify the thread belongs to the authenticated user
//       if (chatThread.discordId !== client.discordId) {
//         socket.emit('end_chat_error', { error: 'Unauthorized access to this chat thread.' });
//         return;
//       }
//
//       // Get the thread
//       const thread = await this.channelService.getChannelById(chatThread.threadId);
//       if (!thread || !thread.isThread()) {
//         // Thread no longer exists, remove from database
//         socket.emit('end_chat_error', { error: 'Thread no longer exists.' });
//         return;
//       }
//
//       // Send end chat message to thread
//       await thread.send({
//         embeds: [{
//           title: '🔴 Cuộc trò chuyện đã kết thúc',
//           description: 'Người lạ đã kết thúc cuộc trò chuyện',
//           color: 0xff0000,
//           footer: {
//             text: `Chat: ${data.chatId.slice(-8)} • ${new Date().toLocaleTimeString('vi-VN')}`
//           },
//           timestamp: new Date().toISOString(),
//         }]
//       });
//
//       // Archive/close the thread
//       await thread.setArchived(true, 'Chat ended by user');
//
//       console.log(`Chat ${data.chatId} ended by user ${client.cvnlUserName} via client`);
//
//       // Send response back to client
//       socket.emit('end_chat_success', {
//         chatId: data.chatId,
//         threadId: chatThread.threadId,
//         endedBy: 'client',
//         timestamp: new Date().toISOString()
//       });
//
//     } catch (error) {
//       console.error('End chat error:', error);
//       socket.emit('end_chat_error', { error: 'Failed to end chat' });
//     }
//   }
// }
