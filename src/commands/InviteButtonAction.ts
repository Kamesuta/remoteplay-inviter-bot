import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { MessageComponentActionInteraction } from './base/action_base.js';
import { daemonManager } from '../index.js';
import { i18n } from '../utils/i18n.js';

class InviteButtonAction extends MessageComponentActionInteraction<ComponentType.Button> {
  /**
   * Creates an invite link button
   * @param userId User ID
   * @param gameId Game ID
   * @param locale Locale
   * @returns The created builder
   */
  override create(
    userId: string,
    gameId: number,
    locale: string,
  ): ButtonBuilder {
    // Generate custom ID
    const customId = this.createCustomId({
      user: `${userId}`,
      game: `${gameId}`,
    });

    // Create the button
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(
        i18n.__({
          phrase: 'invite_button.label',
          locale,
        }),
      )
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔗');
  }

  /** @inheritdoc */
  override async onCommand(
    interaction: ButtonInteraction,
    params: URLSearchParams,
  ): Promise<void> {
    const userId = params.get('user');
    const gameId = params.get('game');
    if (!userId || !gameId) return;

    // Get the user ID
    const daemonId = await daemonManager.getDaemonIdFromUser(userId);
    if (!daemonId) {
      await interaction.reply({
        ephemeral: true,
        content: i18n.__({
          phrase: 'invite_button.error.daemon_not_linked',
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
          phrase: 'invite_button.error.daemon_offline',
          locale: interaction.locale,
        }),
      });
      return;
    }

    // Defer the reply
    await interaction.deferReply({ ephemeral: true });

    // Request a invite link
    const link = await daemon
      .requestLink(interaction.user, Number(gameId))
      .catch(async (error: Error) => {
        await interaction.editReply({
          content: `${error.message}`,
        });
        return;
      });
    if (!link) return;

    // Send the invite
    await interaction.editReply({
      content: i18n.__(
        {
          phrase: 'invite_button.invite_message',
          locale: interaction.locale,
        },
        { link },
      ),
    });
  }
}

export default new InviteButtonAction('create_invite', ComponentType.Button);
