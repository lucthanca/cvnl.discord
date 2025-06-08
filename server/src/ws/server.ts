import { Server as SocketIOServer } from "socket.io";
import { createServer } from 'http';
import { onConnection } from '~/ws/handlers/onConnection.js';

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  allowEIO3: true, // Support Engine.IO v3
  transports: ['websocket', 'polling']
});

io.on('connection', onConnection);

const port = parseInt(process.env.WS_PORT || '3001');
httpServer.listen(port, () => {
  console.log(`🚀 WebSocket server running on port ${port} with EIO3 support`);
});
export default io;
