
import { Socket } from "socket.io";

export interface AuthenticatedClient {
  socket: Socket;
  discordId: string;
  cvnlUserId: string;
  token: string;
  activeChatId?: string;
}

export const clients: Map<string, AuthenticatedClient> = new Map();

export const populateClientKey = (cvnlUserId: string, discordUserId?: string): string => {
  // for now we just use cvnlUserId first, discordUserId will be implemented later
  if (discordUserId) {
    return `cvnl://${cvnlUserId}-${discordUserId}`;
  }
  return `cvnl://${cvnlUserId}-`;
}
