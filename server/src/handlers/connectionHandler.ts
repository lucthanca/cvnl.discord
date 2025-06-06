import { Socket } from 'socket.io';
import { AuthenticatedClient } from '../services/websocket.js';

export class ConnectionHandler {
  constructor(
    private authenticatedClients: Map<string, AuthenticatedClient>,
    private cvnlUserToDiscord: Map<string, string>,
    private discordUserSockets: Map<string, Set<string>>
  ) {}

  handleDisconnection(socket: Socket): void {
    // Remove from authenticated clients
    for (const [key, client] of this.authenticatedClients.entries()) {
      if (client.socket.id === socket.id) {
        console.log(`Socket.IO client disconnected: ${client.cvnlUserName} (${socket.id})`);
        
        // Clean up mappings
        this.cvnlUserToDiscord.delete(client.cvnlUserId);
        const discordSockets = this.discordUserSockets.get(client.discordId);
        if (discordSockets) {
          discordSockets.delete(socket.id);
          if (discordSockets.size === 0) {
            this.discordUserSockets.delete(client.discordId);
          }
        }
        
        this.authenticatedClients.delete(key);
        break;
      }
    }
  }

  handleError(socket: Socket, error: any): void {
    console.error('Socket error:', socket.id, error);
  }
}
