import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';
import { daemonManager } from '../index.js';
import { forDiscord, i18n } from '../utils/i18n.js';
import { DAEMON_DOWNLOAD_URL } from '../env.js';

class SteamSetupCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('setup')
    .setDescription(i18n.__('setup_command.description'))
    .setDescriptionLocalizations(forDiscord('setup_command.description'))
    .addStringOption((option) =>
      option
        .setName('client_id')
        .setDescription(i18n.__('setup_command.description_client_id'))
        .setDescriptionLocalizations(
          forDiscord('setup_command.description_client_id'),
        )
        .setRequired(true),
    );

  override async onCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    // Get the client ID
    const clientId = interaction.options.getString('client_id');
    if (!clientId) return;

    // Send bind message if the daemon is connected
    const daemon = daemonManager.getDaemonFromId(clientId);
    if (!daemon) {
      await interaction.editReply({
        content: i18n.__(
          {
            phrase: 'setup_command.error.daemon_offline',
            locale: interaction.locale,
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          { daemon_download_url: DAEMON_DOWNLOAD_URL },
        ),
      });
      return;
    }

    // Register the client ID
    await daemonManager.bindUser(
      interaction.user,
      clientId,
      interaction.locale,
    );

    // Send bind message to the daemon
    daemon.sendBindMessage(interaction.locale, interaction.user.username);

    // Send the setup message
    await interaction.editReply({
      content: i18n.__({
        phrase: 'setup_command.setup_message',
        locale: interaction.locale,
      }),
    });
  }
}

export default new SteamSetupCommand(steamCommand);
