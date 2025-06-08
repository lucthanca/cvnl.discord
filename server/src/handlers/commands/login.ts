import { ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import dbService, { UserData } from '../../services/database.js';
import cvnlApiService from '../../services/api.js';
import { CommandHandler, DiscordBot } from "../bot";

export class LoginCommandHandler implements CommandHandler {
  constructor(
    private bot: DiscordBot
  ) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId('loginModal')
      .setTitle('Đăng nhập CVNL');

    const tokenInput = new TextInputBuilder()
      .setCustomId('tokenInput')
      .setLabel('CVNL Token')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Nhập token CVNL của bạn...')
      .setRequired(true)
      .setMaxLength(500);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }

  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const token = interaction.fields.getTextInputValue('tokenInput');
    const discordId = interaction.user.id;

    try {
      await interaction.reply({ 
        content: 'Đang xác thực token...', 
        flags: MessageFlags.Ephemeral 
      });

      const userInfo = await cvnlApiService.authenticateUser(token);
      
      if (!userInfo) {
        await interaction.editReply('Token không hợp lệ.');
        return;
      }

      console.log('User info received:', userInfo);

      // Check if this CVNL user is already added for this Discord user
      const existingUsers = await dbService.getUsersByDiscordId(discordId);
      const existingUser = existingUsers.find((user: UserData) => user.cvnlUserId === userInfo.id);

      if (existingUser) {
        await interaction.editReply(`Tài khoản CVNL "${userInfo.name}" đã được thêm trước đó.`);
        return;
      }

      // Save to database
      await dbService.saveUser({
        discordId,
        token,
        cvnlUserId: userInfo.id,
        cvnlUserName: userInfo.name,
        cvnlUserGender: userInfo.gender,
        cvnlUserJob: userInfo.job,
        cvnlUserAge: userInfo.age,
      });

      // Create user channel (only if first token)
      let channelMessage = '';
      if (existingUsers.length === 0) {
        const guild = interaction.guild;
        if (guild) {
          const channel = await this.bot.getChannelService().createUserChannel(
            guild,
            discordId,
            userInfo.name,
            userInfo.id
          );

          if (channel) {
            channelMessage = `\nKênh chat của bạn: <#${channel.id}>`;
          }
        }
      }

      await interaction.editReply(
        `Xác thực thành công! Chào mừng ${userInfo.name}!` + channelMessage
      );

      console.log(`User authenticated: ${userInfo.name} (Discord: ${interaction.user.tag})`);

    } catch (error) {
      console.error('Login command error:', error);
      await interaction.editReply('Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.');
    }
  }
}
