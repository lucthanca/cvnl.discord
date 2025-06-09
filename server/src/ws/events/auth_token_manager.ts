import { Socket } from "socket.io";
import dbService from "~/services/database.js";
import { discordClients } from "~/ws/clientStore.js";

export default async function onAuthTokenMgr(socket: Socket, data: any) {
  const discordId = data.discordUserId;
  const oauthUser = await dbService.getResource().oAuthSession.findUnique({
    where: {discordId}
  });
  if (!oauthUser) {
    socket.emit('tk_mgr_auth_error', { message: 'OAuth user not found' });
    return;
  }
  discordClients.set(discordId, oauthUser);
}