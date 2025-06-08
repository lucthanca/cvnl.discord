import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { CVNLEventHandlers } from '../handlers/cvnlEventHandlers.js';
import { AuthHandler } from '../handlers/authHandler.js';
import { ConnectionHandler } from '../handlers/connectionHandler.js';
import { DiscordBot } from "../handlers/bot";
// import { ChatHandler } from '../handlers/chatHandler.js';

interface SocketData {
  socketId: string;
  socket: Socket;
  discordId: string;
  cvnlUserId: string;
  cvnlUserName: string;
  isAuthenticated: boolean;
}

export interface AuthMessage {
  token: string;
  discordUserId: string;
}

export interface NewChatMessage {
  chatId: string;
  metadata?: {
    stranger?: {
      gender: string;
      job: number;
    };
  };
}

export interface NewMessageMessage {
  chatId: string;
  message: {
    content: string;
    sender: 'user' | 'stranger';
    timestamp?: string;
  };
  metadata?: any;
}

export interface AuthenticatedClient {
  socket: Socket;
  discordId: string;
  cvnlUserId: string;
  cvnlUserName: string;
  token: string;
  activeChatId?: string; // Track active chat for this user
}

export interface EndChatMessage {
  chatId: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private httpServer: ReturnType<typeof createServer>;
  private authenticatedClients: Map<string, AuthenticatedClient> = new Map();
  private port: number;

  private connectedClients = new Map<string, SocketData>();
  private discordUserSockets = new Map<string, Set<string>>(); // discordUserId -> Set of socketIds
  private cvnlUserToDiscord = new Map<string, string>(); // cvnlUserId -> discordUserId
  private cvnlEventHandlers: CVNLEventHandlers;

  private authHandler: AuthHandler;
  private connectionHandler: ConnectionHandler;

  private activeChatUsers: Map<string, string> = new Map(); // cvnlUserId -> chatId

  constructor(bot: DiscordBot) {
    console.log('Initializing WebSocketService...');
    this.port = parseInt(process.env.WS_PORT || '3001');
    
    // Initialize handlers with activeChatUsers map
    this.cvnlEventHandlers = new CVNLEventHandlers(bot.getChannelService(), this.activeChatUsers);
    this.authHandler = new AuthHandler(
      bot,
      this.authenticatedClients, 
      this.cvnlUserToDiscord, 
      this.discordUserSockets,
      this.activeChatUsers
    );
    this.connectionHandler = new ConnectionHandler(
      this.authenticatedClients, 
      this.cvnlUserToDiscord, 
      this.discordUserSockets
    );
    
    // Create HTTP server for socket.io
    this.httpServer = createServer();
    
    // Initialize socket.io with EIO 3 support
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      allowEIO3: true, // Support Engine.IO v3
      transports: ['websocket', 'polling']
    });
    
    this.setupSocketServer();
  }

  private setupSocketServer(): void {
    this.io.on('connection', (socket: Socket) => {
      // Setup all event handlers
      this.setupSocketEventHandlers(socket);

      // Send welcome message
      socket.emit('connected', {
        message: 'Socket.IO connected. Please authenticate.',
        socketId: socket.id
      });
    });

    // Start the server
    this.httpServer.listen(this.port, () => {
      console.log(`Socket.IO server running on port ${this.port} with EIO3 support`);
    });
  }

  private setupSocketEventHandlers(socket: Socket): void {
    console.log(`>>>>>>>Setting up event handlers for socket: ${socket.id}`);
    // Authentication
    socket.on('auth', async (data: AuthMessage) => {
      console.log('🔐 Auth event received:', data);
      await this.authHandler.handleAuth(socket, data);
    });

    // CVNL events forwarding
    socket.on('cvnl_chat_event', async (data: any) => {
      await this.handleCVNLChatEvent(socket, data);
    });

    // Connection management
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'reason:', reason);
      this.connectionHandler.handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      this.connectionHandler.handleError(socket, error);
    });
  }

  private async handleCVNLChatEvent(socket: Socket, data: any): Promise<void> {
    try {
      // Find authenticated client
      const client = Array.from(this.authenticatedClients.values())
        .find(c => c.socket.id === socket.id);

      if (!client) {
        console.log('CVNL chat event from unauthenticated client');
        return;
      }

      console.log(`Received CVNL event ${data.event} from ${data.userName} (${data.cvnlUserId})`);

      switch (data.event) {
        case 'c1':
          await this.cvnlEventHandlers.handleC1Event(client, data);
          break;
        case 'c2':
          await this.cvnlEventHandlers.handleC2Event(client, data);
          break;
        case 'c5':
          await this.cvnlEventHandlers.handleC5Event(client, data);
          break;
        case 'c17':
          await this.cvnlEventHandlers.handleC17Event(client, data);
          break;
        default:
          console.log(`Unhandled CVNL event: ${data.event}`);
      }

    } catch (error) {
      console.error('Error handling CVNL chat event:', error);
    }
  }

  // Enhanced sendToUser method
  sendToUser(cvnlUserId: string, event: string, data: any): boolean {
    console.log(`\n🔍 sendToUser attempt for cvnlUserId: ${cvnlUserId}`);
    console.log(`Total authenticated clients: ${this.authenticatedClients.size}`);
    
    // List all authenticated clients for debugging
    const allClients = Array.from(this.authenticatedClients.values());
    allClients.forEach((client, index) => {
      console.log(`Client ${index + 1}: ${client.cvnlUserName} (ID: ${client.cvnlUserId})`);
    });

    // Find client by cvnlUserId directly from authenticatedClients
    const client = allClients.find(c => c.cvnlUserId === cvnlUserId);

    if (!client) {
      console.log(`❌ No authenticated client found for CVNL user: ${cvnlUserId}`);
      return false;
    }

    try {
      client.socket.emit(event, data);
      console.log(`✅ Sent ${event} to ${client.cvnlUserName} (${cvnlUserId})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send ${event} to ${cvnlUserId}:`, error);
      return false;
    }
  }

  // Send to all CVNL users of a Discord user
  sendToDiscordUser(discordUserId: string, event: string, data: any): boolean {
    const clients = Array.from(this.authenticatedClients.values())
      .filter(c => c.discordId === discordUserId);

    if (clients.length === 0) {
      console.log(`No authenticated clients found for Discord user: ${discordUserId}`);
      return false;
    }

    let sent = false;
    clients.forEach(client => {
      try {
        client.socket.emit(event, data);
        console.log(`Sent ${event} to ${client.cvnlUserName} (Discord: ${discordUserId})`);
        sent = true;
      } catch (error) {
        console.error(`Failed to send ${event} to ${client.cvnlUserId}:`, error);
      }
    });

    return sent;
  }

  getConnectedClients(): Map<string, AuthenticatedClient> {
    return this.authenticatedClients;
  }

  getClientBySocketId(socketId: string): AuthenticatedClient | undefined {
    return Array.from(this.authenticatedClients.values())
      .find(client => client.socket.id === socketId);
  }

  getClientByCvnlUserId(cvnlUserId: string): AuthenticatedClient | undefined {
    return Array.from(this.authenticatedClients.values())
      .find(client => client.cvnlUserId === cvnlUserId);
  }

  isUserConnected(cvnlUserId: string): boolean {
    return this.getClientByCvnlUserId(cvnlUserId) !== undefined;
  }

  close(): void {
    console.log('Closing WebSocket service...');
    this.io.close();
    this.httpServer.close();
  }
}
