import { Socket } from 'socket.io';
import dbService from '../services/database.js';
import cvnlApiService from '../services/api.js';
import { AuthMessage, AuthenticatedClient } from '../services/websocket.js';
import {DiscordBot} from "./bot";

export class AuthHandler {
  constructor(
    private bot:DiscordBot,
    private authenticatedClients: Map<string, AuthenticatedClient>,
    private cvnlUserToDiscord: Map<string, string>,
    private discordUserSockets: Map<string, Set<string>>,
    private activeChatUsers: Map<string, string>,
  ) {
    console.log('🔧 AuthHandler initialized');
  }

  async handleAuth(socket: Socket, data: AuthMessage): Promise<void> {
    try {
      console.log('🔐 Auth attempt:', { socketId: socket.id, hasToken: !!data?.token });
      
      if (!data || !data.token || !data.discordUserId) {
        console.log('❌ Auth failed: No token provided');
        socket.emit('auth_error', { error: 'Token is required for authentication' });
        return;
      }

      console.log('🔍 Verifying token with CVNL API...');
      // Verify token with CVNL API
      const userInfo = await cvnlApiService.authenticateUser(data.token);
      if (!userInfo) {
        console.log('❌ Auth failed: Invalid token');
        socket.emit('auth_error', { error: 'Invalid token' });
        return;
      }

      console.log(`✅ [${userInfo.id}] Token valid.`);

      // Get user from database
      const user = await dbService.getUser(data.discordUserId, userInfo.id);
      
      if (!user) {
        console.log('❌ Auth failed: User not found in DB for cvnlUserId:', userInfo.id);
        socket.emit('auth_error', { 
          error: 'User not found in Discord bot. Please login first.' 
        });
        return;
      }

      console.log('👤 Found user in DB:', { discordId: user.discordId, cvnlUserId: user.cvnlUserId, name: user.cvnlUserName });

      // Remove existing connection for this user if any (but don't disconnect the socket)
      const existingClientKey = Array.from(this.authenticatedClients.keys())
        .find(key => key.includes(userInfo.id));
      if (existingClientKey) {
        console.log('🔄 Removing existing connection from map:', existingClientKey);
        this.authenticatedClients.delete(existingClientKey);
      }

      // Store authenticated client
      const clientKey = `${user.discordId}-${userInfo.id}-${socket.id}`;
      this.authenticatedClients.set(clientKey, {
        socket,
        discordId: user.discordId,
        cvnlUserId: userInfo.id,
        cvnlUserName: userInfo.name,
        token: data.token
      });

      // Update mapping for sendToUser method
      this.cvnlUserToDiscord.set(userInfo.id, user.discordId);
      
      // Update Discord user sockets mapping
      if (!this.discordUserSockets.has(user.discordId)) {
        this.discordUserSockets.set(user.discordId, new Set());
      }
      this.discordUserSockets.get(user.discordId)?.add(socket.id);

      console.log(`🎉 Socket.IO client authenticated: ${userInfo.name} (Discord: ${user.discordId}) Socket: ${socket.id}`);
      console.log(`📈 Total authenticated clients: ${this.authenticatedClients.size}`);

      socket.emit('auth_success', {
        discordId: user.discordId,
        cvnlUserId: userInfo.id,
        cvnlUserName: userInfo.name,
        socketId: socket.id
      });

      // Check for active chat after successful authentication
      const authenticatedClient = this.authenticatedClients.get(clientKey)!;
      await this.restoreChatThread(authenticatedClient);

    } catch (error) {
      console.error('💥 Auth error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
    }
  }

  /**
   * Restore chat thread for the authenticated user if they have an active chat.
   * This is called after successful authentication to ensure the user can continue their conversation.
   */
  private async restoreChatThread(client: AuthenticatedClient): Promise<void> {
    try {
      // Check for active chat immediately after authentication
      const activeChatInfo = await cvnlApiService.getUserActiveChatInfo(client.token);

      if (activeChatInfo && activeChatInfo.chatId) {
        console.log(`User ${client.cvnlUserName} (${client.cvnlUserId}) has active chat: ${activeChatInfo.chatId}`);

        // Set active chat for this user
        client.activeChatId = activeChatInfo.chatId;
        this.activeChatUsers.set(client.cvnlUserId, activeChatInfo.chatId);

        // Ensure thread exists
        await this.bot.getChannelService().createChatThread(client.discordId, activeChatInfo.chatId, client.cvnlUserId);
      }
    } catch (error) {
      console.error(`Error checking active chat for user ${client.cvnlUserName}:`, error);
    }
  }
}
