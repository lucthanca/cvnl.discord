export type MessageType = 'text' | 'image' | 'voice' | 'gif';

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  sender: User;
  isOwn: boolean;
}
