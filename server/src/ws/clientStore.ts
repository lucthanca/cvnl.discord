
import { Socket } from "socket.io";
import { User, OAuthSession } from "@prisma/client";
import { Message, ThreadChannel } from "discord.js";

export interface AuthenticatedClient {
  socket: Socket;
  user: User;
  discordId: string; // Deprecated, will be removed in future versions
  cvnlUserId: string; // Deprecated, will be removed in future versions
  token: string; // Deprecated, will be removed in future versions
  activeChatId?: string;
  activeEphemeralMessage?: Message;
  activeThread?: ThreadChannel;
}

export const clients: Map<string, AuthenticatedClient> = new Map();
export const discordClients: Map<string, OAuthSession> = new Map();

export const populateClientKey = (cvnlUserId: string, discordUserId?: string): string => {
  // for now we just use cvnlUserId first, discordUserId will be implemented later
  if (discordUserId) {
    return `cvnl://${cvnlUserId}-${discordUserId}`;
  }
  return `cvnl://${cvnlUserId}-`;
}
