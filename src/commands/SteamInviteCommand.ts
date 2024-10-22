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
import { TranslatableError } from '../utils/error.js';

class SteamInviteCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('invite')
    .setDescription(i18n.__('invite_command.description'))
    .setDescriptionLocalizations(forDiscord('invite_command.description'))
    .addNumberOption((option) =>
      option
        .setName('game_id')
        .setDescription(i18n.__('invite_command.description_game_id'))
        .setDescriptionLocalizations(
          forDiscord('invite_command.description_game_id'),
        )
        .setRequired(false),
    );

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

    // Get the game ID
    const optionGameId = interaction.options.getNumber('game_id');

    // Request a panel information
    const gameId =
      optionGameId ??
      (await daemon
        .requestGameId(interaction.user)
        .catch(async (error: TranslatableError) => {
          // Delete the message first to prevent it from being visible and then send the follow-up message
          await interaction.deleteReply();
          await interaction.followUp({
            ephemeral: true,
            content: `${error.getMessage?.(interaction.locale) ?? error.message}`,
          });
          return;
        }));
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
      // Delete the message first to prevent it from being visible and then send the follow-up message
      await interaction.deleteReply();
      await interaction.followUp({
        ephemeral: true,
        content: i18n.__({
          phrase: 'invite_command.error.game_info_failed',
          locale: interaction.locale,
        }),
      });
      return;
    }

    // Create the invite message
    const embed = this._createInviteMessage(
      interaction,
      name,
      headerImage,
      storeLink,
    );

    // Send the invite message
    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          InviteButtonAction.create(
            interaction.user.id,
            gameId,
            daemon.sessionId,
            interaction.locale,
          ),
        ),
      ],
    });
  }

  /**
   * Create the invite message
   * @param interaction interaction to reply
   * @param name game name
   * @param headerImage game header image
   * @param storeLink game store link
   * @returns Invite message
   */
  private _createInviteMessage(
    interaction: RepliableInteraction,
    name: string,
    headerImage: string,
    storeLink: string,
  ): EmbedBuilder {
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

    return embed;
  }
}

export default new SteamInviteCommand(steamCommand);
