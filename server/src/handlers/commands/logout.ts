import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import dbService from '../../services/database.js';
import {CommandHandler, DiscordBot} from "../bot";

export class LogoutCommandHandler implements CommandHandler {
  constructor(private bot: DiscordBot) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const discordId = interaction.user.id;

    try {
      // const user = await dbService.getUser(discordId);
      
      // if (!user) {
      //   await interaction.reply({
      //     content: 'Bạn chưa đăng nhập.',
      //     flags: MessageFlags.Ephemeral
      //   });
      //   return;
      // }

      // Delete user data
      // await dbService.deleteUser(discordId);
      // await dbService.deleteChatThreadsByDiscordId(discordId);

      // await interaction.reply({
      //   content: 'Đã đăng xuất thành công!',
      //   flags: MessageFlags.Ephemeral
      // });
      //
      // console.log(`User logged out: ${user.cvnlUserName} (Discord: ${interaction.user.tag})`);

    } catch (error) {
      console.error('Logout command error:', error);
      await interaction.reply({ 
        content: 'Có lỗi xảy ra khi đăng xuất.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }
}
