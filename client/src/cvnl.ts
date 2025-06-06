import * as io from 'socket.io-client';

interface TokenData {
  id: string;
  token: string;
  userName: string;
  userId: string;
  addedAt: string;
  status: string;
  userInfo: {
    gender: string;
    job: number;
    age: number;
  };
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
}

class CVNLManager {
  private sockets: Map<string, SocketIOClient.Socket> = new Map();
  private tokens: TokenData[] = [];
  private discordUser: DiscordUser | null = null;
  private discordSockets: Map<string, SocketIOClient.Socket> = new Map(); // cvnlUserId -> discord server socket

  constructor() {
    this.init();
  }

  async init() {
    try {
      // Load Discord user from shared storage
      await this.loadDiscordUser();
      
      if (!this.discordUser) {
        console.log('No Discord user found, waiting for authentication...');
        // Listen for changes in storage
        this.watchForAuthChanges();
        return;
      }

      // Load tokens for this Discord user
      await this.loadTokens();
      
      // Create socket connections for each token
      this.createSocketConnections();
      
      // Create Discord server connections for each CVNL user
      this.createDiscordServerConnections();
      
    } catch (error) {
      console.error('Failed to initialize CVNL Manager:', error);
    }
  }

  private createDiscordServerConnections(): void {
    if (!this.discordUser) return;

    console.log('Creating Discord server connections for each CVNL user...');

    this.tokens.forEach((tokenData) => {
      this.createDiscordServerConnection(tokenData);
    });
  }

  private createDiscordServerConnection(tokenData: TokenData): void {
    if (!this.discordUser) return;

    console.log(`Creating Discord server connection for: ${tokenData.userName} (${tokenData.userId})`);

    const socket: SocketIOClient.Socket = io.connect('http://localhost:3001', {
      forceNew: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      timeout: 20000
    });

    // Store socket reference
    this.discordSockets.set(tokenData.userId, socket);

    socket.on('connect', () => {
      console.log(`[Discord-${tokenData.userName}] Connected to Discord server:`, socket.id);
      
      // Authenticate immediately after connection
      console.log(`[Discord-${tokenData.userName}] Sending auth with token...`);
      socket.emit('auth', {
        token: tokenData.token
      });
    });

    socket.on('auth_success', (data: any) => {
      console.log(`[Discord-${tokenData.userName}] ✅ Authentication successful:`, data);
    });

    socket.on('auth_error', (data: any) => {
      console.error(`[Discord-${tokenData.userName}] ❌ Authentication failed:`, data);
      // Don't reconnect if auth failed due to invalid token
      if (data.error?.includes('Invalid token') || data.error?.includes('not found')) {
        console.log(`[Discord-${tokenData.userName}] Stopping reconnection due to auth error`);
        socket.disconnect();
      }
    });

    socket.on('connected', (data: any) => {
      console.log(`[Discord-${tokenData.userName}] Received connected event:`, data);
    });

    socket.on('connect_error', (error: any) => {
      console.error(`[Discord-${tokenData.userName}] Connection error:`, error);
    });

    // Single disconnect handler
    socket.on('disconnect', (reason: string) => {
      console.log(`[Discord-${tokenData.userName}] Disconnected from Discord server. Reason:`, reason);
      
      // Log additional info about the disconnection
      if (reason === 'io server disconnect') {
        console.log(`[Discord-${tokenData.userName}] Server forcibly disconnected - likely auth timeout or error`);
      } else if (reason === 'io client disconnect') {
        console.log(`[Discord-${tokenData.userName}] Client disconnected`);
      } else if (reason === 'ping timeout') {
        console.log(`[Discord-${tokenData.userName}] Connection timed out`);
      } else {
        console.log(`[Discord-${tokenData.userName}] Other reason: ${reason}`);
      }
    });

    socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[Discord-${tokenData.userName}] Reconnected after ${attemptNumber} attempts`);
      // Re-authenticate after reconnection
      socket.emit('auth', {
        token: tokenData.token
      });
    });

    socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`[Discord-${tokenData.userName}] Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect_error', (error: any) => {
      console.error(`[Discord-${tokenData.userName}] Reconnection error:`, error);
    });

    socket.on('reconnect_failed', () => {
      console.error(`[Discord-${tokenData.userName}] Failed to reconnect after all attempts`);
    });

    socket.on('start_chat_from_discord', (data: any) => {
      console.log(`[Discord-${tokenData.userName}] Received start chat command:`, data);
      this.handleStartChatFromDiscord(data, tokenData);
    });

    socket.on('chat_ended_from_discord', (data: any) => {
      console.log(`[Discord-${tokenData.userName}] Received end chat command:`, data);
      this.handleEndChatFromDiscord(data, tokenData);
    });
  }

  private handleStartChatFromDiscord(data: any, tokenData: TokenData): void {
    console.log(`[Discord Command] Start chat for user: ${tokenData.userName} (${tokenData.userId})`);
    
    // Find the corresponding CVNL socket
    const cvnlSocket = this.sockets.get(tokenData.userId);
    if (!cvnlSocket) {
      console.error(`No CVNL socket found for user: ${tokenData.userId}`);
      return;
    }

    // Emit start chat event to CVNL using the send function
    console.log(`[${tokenData.userName}] Starting chat via Discord command...`);
    this.sendToCVNL(cvnlSocket, 'c1', { action: 'start_chat' });
    
    // Notify Discord server about the action
    const discordSocket = this.discordSockets.get(tokenData.userId);
    if (discordSocket) {
      discordSocket.emit('cvnl_action_result', {
        discordUserId: data.discordUserId,
        channelId: data.channelId,
        cvnlUserId: tokenData.userId,
        action: 'start_chat',
        status: 'initiated',
        message: `Đã gửi lệnh tìm kiếm chat cho ${tokenData.userName}`
      });
    }
  }

  private handleEndChatFromDiscord(data: any, tokenData: TokenData): void {
    console.log(`[Discord Command] End chat for user: ${tokenData.userId}`);
    
    // Find the corresponding CVNL socket
    const cvnlSocket = this.sockets.get(tokenData.userId);
    if (!cvnlSocket) {
      console.error(`No CVNL socket found for user: ${tokenData.userId}`);
      return;
    }

    // Emit end chat event to CVNL using the send function
    console.log(`[${tokenData.userName}] Ending chat via Discord command...`);
    this.sendToCVNL(cvnlSocket, 'c5', { chatId: data.chatId, reason: 'ended_by_discord' });
  }

  // Add the send function for CVNL communication
  private sendToCVNL(socket: SocketIOClient.Socket, type: string, data: any, callback?: Function): void {
    if (!socket || !socket.connected) {
      console.error('Cannot send to CVNL: socket not connected');
      return;
    }

    console.log(`Sending to CVNL: type=${type}, data=`, data);
    
    socket.emit(
      'message',
      {
        type: type,
        data: data,
      },
      callback,
    );
  }

  async loadDiscordUser(): Promise<void> {
    try {
      // Try chrome.storage first (for extension context)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['discordUser']);
        if (result.discordUser) {
          this.discordUser = result.discordUser;
          console.log('CVNLManager: Loaded Discord user from chrome storage:', this.discordUser.username);
          return;
        }
      }

      // Fallback to localStorage (for web context)
      const stored = localStorage.getItem('discordUser');
      if (stored) {
        this.discordUser = JSON.parse(stored);
        console.log('CVNLManager: Loaded Discord user from localStorage:', this.discordUser.username);
      }
    } catch (error) {
      console.error('CVNLManager: Error loading Discord user:', error);
    }
  }

  async loadTokens(): Promise<void> {
    if (!this.discordUser) return;

    try {
      const SERVER_URL = 'http://localhost:3000';
      const response = await fetch(`${SERVER_URL}/api/discord/tokens/${this.discordUser.id}`);
      
      if (response.ok) {
        const data = await response.json();
        this.tokens = data.tokens || [];
        console.log(`Loaded ${this.tokens.length} tokens for Discord user ${this.discordUser.username}`);
      } else {
        console.error('Failed to load tokens:', response.status);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  createSocketConnections(): void {
    console.log(`Creating socket connections for ${this.tokens.length} tokens...`);

    this.tokens.forEach((tokenData) => {
      this.createSocketConnection(tokenData);
    });
  }

  createSocketConnection(tokenData: TokenData): void {
    const CLIENT_ID = 'web-v1.13.0';
    const socketUrl = 'https://rc.cvnl.app';
    
    console.log(`Creating socket connection for user: ${tokenData.userName} (${tokenData.userId})`);

    const socket: SocketIOClient.Socket = io.connect(socketUrl, {
      forceNew: true,
      query: {
        token: tokenData.token,
        client: CLIENT_ID,
      },
    });

    // Store socket reference
    this.sockets.set(tokenData.userId, socket);

    // Socket event handlers with user identification
    socket.on('connect', () => {
      console.log(`[${tokenData.userName}] Connected to CVNL server`);
      
      // Authenticate with Discord server WebSocket for this user
      const discordSocket = this.discordSockets.get(tokenData.userId);
      if (discordSocket && discordSocket.connected) {
        console.log(`[${tokenData.userName}] Authenticating with Discord server...`);
        discordSocket.emit('auth', {
          token: tokenData.token
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[${tokenData.userName}] Disconnected from CVNL server`);
      
      // Notify Discord server about connection status
      if (this.discordUser) {
        this.discordSockets.get(tokenData.userId)?.emit('cvnl_user_status', {
          discordUserId: this.discordUser.id,
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          status: 'disconnected'
        });
      }
    });

    socket.on('connect_error', (error: string) => {
      console.error(`[${tokenData.userName}] Connection error:`, error);
    });

    socket.on('error', (error: string) => {
      console.error(`[${tokenData.userName}] Error:`, error);
    });

    socket.on('system', (data: any) => {
      console.log(`[${tokenData.userName}] Received system event:`, data);
    });

    // Add Discord event forwarding
    socket.on('c1', (data: any) => {
      console.log(`[${tokenData.userName}] Received c1 event (chat started):`, data);
      
      // Forward to Discord server with chat ID for thread creation
      const discordSocket = this.discordSockets.get(tokenData.userId);
      if (discordSocket) {
        discordSocket.emit('cvnl_chat_event', {
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          event: 'c1',
          data: data
        });
      }
    });

    socket.on('c2', (data: any) => {
      console.log(`[${tokenData.userName}] [New Message] Received c2 event:`, data);
      
      // Forward to Discord server for message display
      const discordSocket = this.discordSockets.get(tokenData.userId);
      if (discordSocket) {
        discordSocket.emit('cvnl_chat_event', {
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          event: 'c2',
          data: data
        });
      }
    });

    socket.on('c3', (data: any) => {
      console.log(`[${tokenData.userName}] Received c3 event:`, data);
      
      // Notify Discord about chat started
      if (this.discordUser) {
        this.discordSockets.get(tokenData.userId)?.emit('cvnl_chat_event', {
          discordUserId: this.discordUser.id,
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          event: 'c3',
          data: data
        });
      }
    });

    socket.on('c5', (data: any) => {
      console.log(`[${tokenData.userName}] [End chat] Received c5 event:`, data);
      
      // Notify Discord about chat ended
      if (this.discordUser) {
        this.discordSockets.get(tokenData.userId)?.emit('cvnl_chat_event', {
          discordUserId: this.discordUser.id,
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          event: 'c5',
          data: data
        });
      }
    });

    socket.on('c17', (data: any) => {
      console.log(`🔍 C17 CLIENT DEBUG - Received c17 event:`, {
        data: data,
        tokenUserId: tokenData.userId,
        tokenUserName: tokenData.userName,
        discordUserId: this.discordUser?.id,
        socketId: socket.id
      });
      
      // Forward queue order to Discord server
      const discordSocket = this.discordSockets.get(tokenData.userId);
      if (discordSocket) {
        const eventData = {
          cvnlUserId: tokenData.userId,
          userName: tokenData.userName,
          event: 'c17',
          data: data
        };
        
        console.log(`🚀 Forwarding C17 to Discord server:`, {
          eventData,
          discordSocketId: discordSocket.id,
          targetUserId: tokenData.userId
        });
        
        discordSocket.emit('cvnl_chat_event', eventData);
      } else {
        console.error(`❌ No Discord socket found for user ${tokenData.userId} (${tokenData.userName})`);
      }
    });

    socket.on('c12', (data: any) => {
      console.log(`[${tokenData.userName}] Received c12 event:`, data);
    });

    socket.on('c4', (data: any) => {
      console.log(`[${tokenData.userName}] Received c4 event:`, data);
    });

    socket.on('c10', (data: any) => {
      console.log(`[${tokenData.userName}] Received c10 event:`, data);
    });

    socket.on('c6', (data: any) => {
      console.log(`[${tokenData.userName}] Received c6 event:`, data);
    });

    socket.on('c7', (data: any) => {
      console.log(`[${tokenData.userName}] [Block response] Received c7 event:`, data);
    });

    socket.on('c18', (data: any) => {
      console.log(`[${tokenData.userName}] Received c18 event:`, data);
    });

    socket.on('c20', (data: any) => {
      console.log(`[${tokenData.userName}] Received c20 event:`, data);
    });

    socket.on('c24', (data: any) => {
      console.log(`[${tokenData.userName}] Received c24 event:`, data);
    });

    socket.on('c23', (data: any) => {
      console.log(`[${tokenData.userName}] Received c23 event:`, data);
    });

    socket.on('c25', (data: any) => {
      console.log(`[${tokenData.userName}] Received c25 event:`, data);
    });
  }

  watchForAuthChanges(): void {
    // Watch for changes in chrome storage (extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.discordUser) {
          console.log('CVNLManager: Discord user updated in chrome storage, reinitializing...');
          this.disconnectAll();
          this.init();
        }
      });
    }

    // Watch for localStorage changes (web context)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'discordUser' && event.newValue) {
          console.log('CVNLManager: Discord user updated in localStorage, reinitializing...');
          this.disconnectAll();
          this.init();
        }
      });
    }
  }

  // Public methods for managing connections
  async refreshConnections(): Promise<void> {
    console.log('Refreshing all connections...');
    this.disconnectAll();
    await this.init();
  }

  disconnectAll(): void {
    console.log('Disconnecting all socket connections...');
    
    // Disconnect CVNL sockets
    this.sockets.forEach((socket, userId) => {
      socket.disconnect();
      console.log(`Disconnected CVNL socket for user: ${userId}`);
    });
    this.sockets.clear();
    
    // Disconnect Discord server sockets
    this.discordSockets.forEach((socket, userId) => {
      socket.disconnect();
      console.log(`Disconnected Discord server socket for user: ${userId}`);
    });
    this.discordSockets.clear();
  }

  getSocketByUserId(userId: string): SocketIOClient.Socket | undefined {
    return this.sockets.get(userId);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.sockets.keys());
  }

  // Public method to send messages to CVNL for a specific user
  sendMessageToCVNL(userId: string, type: string, data: any, callback?: Function): boolean {
    const socket = this.sockets.get(userId);
    if (!socket) {
      console.error(`No CVNL socket found for user: ${userId}`);
      return false;
    }

    this.sendToCVNL(socket, type, data, callback);
    return true;
  }
}

// Initialize the manager
const cvnlManager = new CVNLManager();

// Expose to global scope for debugging
(window as any).cvnlManager = cvnlManager;