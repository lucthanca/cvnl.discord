import { Socket } from "socket.io";
import { clients } from "~/ws/clientStore.js";
import dbService from "~/services/database.js";

export default async function onDisconnect(socket: Socket) {
  const sockId = socket.id;

  for (const [cl, sock] of clients.entries()) {
    if (sock.socket.id === sockId) {
      console.log(`🔌 Socket disconnected: ${sockId} for client ${cl}`);
      clients.delete(cl);
      await dbService.getResource().user.update({
        where: { id: sock.user.id },
        data: { isOnline: false },
      })
      break;
    }
  }
}