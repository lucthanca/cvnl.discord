import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle, ActionRowBuilder, MessageFlags
} from "discord.js";
import { CommandHandler } from "./index.js";
import cvnlApiService from "../../services/api.js";
import dbService from "../../services/database.js";
import channelService from "../../services/channel.js";

export default {
  name: 'login',
  description: 'Đăng nhập vào bot Discord',
  type: ['chat_input', 'modal_submit'],
  handle: async (interaction: ChatInputCommandInteraction) => {
    // Hiển thị modal đăng nhập với token CVNL
    const modal = new ModalBuilder()
      .setCustomId('login')
      .setTitle('Đăng nhập CVNL');
    const tokenInput = new TextInputBuilder()
            .setCustomId('tokenInput')
            .setLabel('CVNL Token')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Nhập token CVNL bạn muốn thêm...')
            .setRequired(true)
            .setMaxLength(500);
    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);
  },
  handleModalSubmit: async (interaction: ModalSubmitInteraction) => {
    const token = interaction.fields.getTextInputValue('tokenInput');
    const discordId = interaction.user.id;
    await interaction.reply({
      content: 'Đang xác thực token...',
      flags: MessageFlags.Ephemeral,
    });
    try {
      if (!interaction.guild) {
        await interaction.editReply('Lệnh này chỉ có thể được sử dụng trong máy chủ.');
        return;
      }
      const cvnlUser = await cvnlApiService.authenticateUser(token);
      if (!cvnlUser) {
        await interaction.editReply('Token không hợp lệ.');
        return;
      }
      console.log('Thông tin người dùng nhận được:', cvnlUser);
      // Kiểm tra xem người dùng CVNL này đã được thêm cho người dùng Discord này chưa
      const dbUser = await dbService.getUser(discordId, cvnlUser.id);
      if (dbUser) {
        await interaction.editReply(`Tài khoản CVNL "${cvnlUser.name}" đã được thêm trước đó.`);
        return;
      }
      // Lưu vào cơ sở dữ liệu
      await dbService.saveUser({
        discordId,
        token,
        cvnlUserId: cvnlUser.id,
        cvnlUserName: cvnlUser.name,
        cvnlUserGender: cvnlUser.gender,
        cvnlUserJob: cvnlUser.job,
        cvnlUserAge: cvnlUser.age,
      });

      // Tạo kênh chat mới cho người dùng
      // kiểm tra xem người dùng đã có kênh chat nào chưa
      let textChannel = await channelService.getChannel(discordId, cvnlUser.id);
      if (!textChannel) {
        textChannel = await channelService.createUserChannel(
          interaction.guild,
          discordId,
          cvnlUser.name,
          cvnlUser.id
        );
      }
      if (!textChannel) {
        await interaction.editReply('Không thể tạo kênh chat cho người dùng này.');
        return;
      }
      await interaction.editReply(
        `✅ Đăng nhập thành công với tài khoản CVNL: **${cvnlUser.name}**\n\n` +
        `Kênh chat của bạn đã được tạo: <#${textChannel.id}>`
      );
      console.log(`Xác thực thành công: ${cvnlUser.name} (${cvnlUser.id}) Discord: ${discordId}`);
    } catch (e) {
      console.error('Lỗi khi xác thực token:', e);
      await interaction.editReply({
        content: 'Đã xảy ra lỗi khi xác thực token. Vui lòng thử lại sau.',
      });
      return;
    }
  },
} as CommandHandler;