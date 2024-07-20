import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';
import { daemonManager } from '../index.js';

class SteamSetupCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('setup')
    .setDescription('RemotePlayInviterクライアントUUIDを登録します')
    .addStringOption((option) =>
      option
        .setName('client_id')
        .setDescription('RemotePlayInviterクライアントのUUID')
        .setRequired(true),
    );

  async onCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    // クライアントIDを取得
    const clientId = interaction.options.getString('client_id');
    if (!clientId) {
      await interaction.editReply({
        content: 'クライアントIDが指定されていません',
      });
      return;
    }

    // クライアントIDを登録
    daemonManager.bindUser(interaction.user.id, clientId);

    // メッセージを送信
    await interaction.editReply({
      content: 'クライアントIDを登録しました',
    });
  }
}

export default new SteamSetupCommand(steamCommand);
