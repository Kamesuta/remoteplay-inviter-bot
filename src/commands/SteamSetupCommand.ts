import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';

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
    }
  }
}

export default new SteamSetupCommand(steamCommand);
