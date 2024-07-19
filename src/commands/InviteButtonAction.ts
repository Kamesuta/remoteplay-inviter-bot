import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { MessageComponentActionInteraction } from './base/action_base.js';

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
    const eventId = params.get('event');
    if (!eventId) return; // 必要なパラメータがない場合は旧形式の可能性があるため無視

    await interaction.deferReply({ ephemeral: true });
  }
}

export default new InviteButtonAction('create_invite', ComponentType.Button);
