import { ChatInputCommandInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";

import LoginCommandHandler from './login.js';
import ChatInfoCommandHandler from "./chatinfo.js";
import StartChatCommandHandler from './startchat.js';
import EndchatCommandHandler from './endchat.js';

export type CommandType = 'chat_input' | 'modal_submit' | 'menu_select';

export interface CommandHandler {
  name: string;
  description: string;
  type: CommandType[];
  handle(interaction: ChatInputCommandInteraction): Promise<void>;
  handleModalSubmit?(interaction: ModalSubmitInteraction): Promise<void>;
  handleSelectMenu?(interaction: StringSelectMenuInteraction): Promise<void>;
}
export default new Map<string, CommandHandler>([
  ['login', LoginCommandHandler],
  ['chatinfo', ChatInfoCommandHandler],
  ['startchat', StartChatCommandHandler],
  ['endchat', EndchatCommandHandler]
]);
