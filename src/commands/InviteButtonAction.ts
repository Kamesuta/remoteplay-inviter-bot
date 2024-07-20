import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { MessageComponentActionInteraction } from './base/action_base.js';
import { daemonManager } from '../index.js';

class InviteButtonAction extends MessageComponentActionInteraction<ComponentType.Button> {
  /**
   * 招待リンク取得ボタンを作成します
   * @param userId ユーザーID
   * @returns 作成したビルダー
   */
  override create(userId: string): ButtonBuilder {
    // カスタムIDを生成
    const customId = this.createCustomId({
      user: `${userId}`,
    });

    // ダイアログを作成
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('招待リンク取得')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔗');
  }

  /** @inheritdoc */
  async onCommand(
    interaction: ButtonInteraction,
    params: URLSearchParams,
  ): Promise<void> {
    const userId = params.get('user');
    if (!userId) return; // 必要なパラメータがない場合は旧形式の可能性があるため無視

    // Get the user ID
    const daemonId = daemonManager.getDaemonIdFromUser(userId);
    if (!daemonId) {
      await interaction.reply({
        ephemeral: true,
        content:
          'まずは `/register` コマンドでクライアントIDを登録してください。',
      });
      return;
    }

    // Get the daemon client
    const daemon = daemonManager.getDaemonFromId(daemonId);
    if (!daemon) {
      await interaction.reply({
        ephemeral: true,
        content: 'クライアントがオフラインです。',
      });
      return;
    }

    // Defer the reply
    await interaction.deferReply({ ephemeral: true });

    // Request a invite link
    const link = await daemon.requestLink(userId);
    if (!link) {
      await interaction.editReply({
        content: 'ゲームが起動していません。',
      });
      return;
    }

    // Send the invite
    await interaction.editReply({
      content: `招待リンクを作成しました！\n${link}\nリンクを踏んでゲームに参加してください～`,
    });
  }
}

export default new InviteButtonAction('create_invite', ComponentType.Button);
