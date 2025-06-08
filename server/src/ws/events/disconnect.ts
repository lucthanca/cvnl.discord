import { Socket } from "socket.io";
import { clients } from "~/ws/clientStore.js";

export default async function onDisconnect(socket: Socket) {
  const sockId = socket.id;

  for (const [cl, sock] of clients.entries()) {
    if (sock.socket.id === sockId) {
      console.log(`🔌 Socket disconnected: ${sockId} for client ${cl}`);
      clients.delete(cl);
      break;
    }
  }
}