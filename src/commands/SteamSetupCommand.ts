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

  override async onCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    // クライアントIDを取得
    const clientId = interaction.options.getString('client_id');
    if (!clientId) {
      await interaction.editReply({
        content: 'クライアントIDが指定されていません',
      });
      return;
    }

    // Send bind message if the daemon is connected
    const daemon = daemonManager.getDaemonFromId(clientId);
    if (!daemon) {
      await interaction.editReply({
        content:
          'そのクライアントIDはオンラインではありません。クライアントを起動してから再度お試しください。',
      });
      return;
    }

    // クライアントIDを登録
    await daemonManager.bindUser(interaction.user, clientId);

    // デーモンにバインドメッセージを送信
    daemon.sendBindMessage(interaction.user.username);

    // メッセージを送信
    await interaction.editReply({
      content: 'クライアントIDを登録しました',
    });
  }
}

export default new SteamSetupCommand(steamCommand);
