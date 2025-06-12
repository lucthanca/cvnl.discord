
import { Socket } from "socket.io";
import { User } from "@prisma/client";
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
  c4Locked?: boolean; // Indicates if the client is locked for C4
}

export const clients: Map<string, AuthenticatedClient> = new Map();

export const populateClientKey = (cvnlUserId: string, discordUserId?: string): string => {
  // for now we just use cvnlUserId first, discordUserId will be implemented later
  if (discordUserId) {
    return `cvnl://${cvnlUserId}-${discordUserId}`;
  }
  return `cvnl://${cvnlUserId}-`;
}
