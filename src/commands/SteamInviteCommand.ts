import {
  ActionRowBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  RepliableInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';
import { daemonManager } from '../index.js';
import InviteButtonAction from './InviteButtonAction.js';
import { forDiscord, i18n } from '../utils/i18n.js';

class SteamInviteCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('invite')
    .setDescription(i18n.__('invite_command.description'))
    .setDescriptionLocalizations(forDiscord('invite_command.description'));

  override async onCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    // Get the user ID
    const daemonId = await daemonManager.getDaemonIdFromUser(
      interaction.user.id,
    );
    if (!daemonId) {
      await interaction.reply({
        ephemeral: true,
        content: i18n.__({
          phrase: 'invite_command.error.daemon_not_linked',
          locale: interaction.locale,
        }),
      });
      return;
    }

    // Get the daemon client
    const daemon = daemonManager.getDaemonFromId(daemonId);
    if (!daemon) {
      await interaction.reply({
        ephemeral: true,
        content: i18n.__({
          phrase: 'invite_command.error.daemon_offline',
          locale: interaction.locale,
        }),
      });
      return;
    }

    // Defer the reply
    await interaction.deferReply({ ephemeral: false });

    // Request a panel information
    const gameId = await daemon
      .requestGameId(interaction.user)
      .catch(async (error: Error) => {
        await interaction.editReply({
          content: `${error.message}`,
        });
        return;
      });
    if (!gameId) return;

    // Steam Language Key
    const steamLanguage = i18n.__({
      phrase: 'invite_panel.steam_language',
      locale: interaction.locale,
    });

    // Fetch game information from Steam
    // Fetch game information from the web
    const url = `https://store.steampowered.com/api/appdetails?appids=${gameId}&l=${steamLanguage}`;
    const response = await fetch(url);
    const json = (await response.json()) as {
      [gameId: string]: {
        success: boolean;
        data: {
          name: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          header_image: string;
        };
      };
    };
    const app = json[`${gameId}`];
    const name = app?.data?.name;
    const headerImage = app?.data?.header_image;
    const storeLink = `https://store.steampowered.com/app/${gameId}?l=${steamLanguage}`;

    if (
      !app.success ||
      typeof name !== 'string' ||
      typeof headerImage !== 'string' ||
      typeof storeLink !== 'string'
    ) {
      await interaction.editReply({
        content: i18n.__({
          phrase: 'invite_command.error.game_info_failed',
          locale: interaction.locale,
        }),
      });
      return;
    }

    // Send the invite
    await this.sendInviteMessage(
      interaction,
      gameId,
      name,
      headerImage,
      storeLink,
    );
  }

  /**
   * Send the invite message
   * @param interaction interaction to reply
   * @param gameId game id
   * @param name game name
   * @param headerImage game header image
   * @param storeLink game store link
   */
  async sendInviteMessage(
    interaction: RepliableInteraction,
    gameId: number,
    name: string,
    headerImage: string,
    storeLink: string,
  ): Promise<void> {
    // Get display name
    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : undefined;
    const displayName = member?.displayName ?? interaction.user.displayName;
    const avatarURL =
      member?.user.displayAvatarURL() ?? interaction.user.displayAvatarURL();

    // Send the invite message
    // Create the embed message
    const embed = new EmbedBuilder()
      .setAuthor({
        name: displayName,
        iconURL: avatarURL,
      })
      .setTitle(
        i18n.__(
          {
            phrase: 'invite_panel.title',
            locale: interaction.locale,
          },
          { name },
        ),
      )
      .setURL(storeLink)
      .setDescription(
        i18n.__({
          phrase: 'invite_panel.description',
          locale: interaction.locale,
        }),
      )
      .addFields({
        name: i18n.__({
          phrase: 'invite_panel.features.name',
          locale: interaction.locale,
        }),
        value: i18n.__({
          phrase: 'invite_panel.features.value',
          locale: interaction.locale,
        }),
      })
      .setImage(headerImage)
      .setColor(3447003); // DarkBlue

    // Send the invite message
    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          InviteButtonAction.create(
            interaction.user.id,
            gameId,
            interaction.locale,
          ),
        ),
      ],
    });
  }
}

export default new SteamInviteCommand(steamCommand);
