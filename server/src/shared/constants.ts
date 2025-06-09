export type MessageFromDiscord = {
  content: string;
  uuid: string;
};
export const EVENT_DISCORD_START_CHAT = 'start_chat';
export const EVENT_DISCORD_END_CHAT = 'end_chat';
export const EVENT_CVNL_CHAT_EVENT = 'cvnlChatEvent';
export const EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD = 'discord_msg';
