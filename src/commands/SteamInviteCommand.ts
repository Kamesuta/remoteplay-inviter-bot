import {
  ActionRowBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  RepliableInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';
import { daemonManager } from '../index.js';
import InviteButtonAction from './InviteButtonAction.js';

class SteamInviteCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('invite')
    .setDescription(
      'Steam Remote Play Together を使用して起動中のゲームに招待します',
    );

  override async onCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    // Get the user ID
    const daemonId = daemonManager.getDaemonIdFromUser(interaction.user.id);
    if (!daemonId) {
      await interaction.reply({
        ephemeral: true,
        content:
          'まずは `/steam setup` コマンドでクライアントIDを登録してください。',
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
    await interaction.deferReply({ ephemeral: false });

    // Request a panel information
    const gameId = await daemon
      .requestGameId(interaction.user.id)
      .catch(async (error: Error) => {
        await interaction.editReply({
          content: `${error.message}`,
        });
        return;
      });
    if (!gameId) return; // TODO: しっかりとエラー処理をする

    // Steamからゲーム情報を取得
    // Webからゲームの情報を取得
    const url = `https://store.steampowered.com/api/appdetails?appids=${gameId}&l=japanese`;
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
    const storeLink = `https://store.steampowered.com/app/${gameId}?l=japanese`;

    if (
      !app.success ||
      typeof name !== 'string' ||
      typeof headerImage !== 'string' ||
      typeof storeLink !== 'string'
    ) {
      await interaction.editReply({
        content: 'ゲーム情報が取得できませんでした。',
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
    // Send the invite message
    // Create the embed message
    const embed = new EmbedBuilder()
      .setTitle(`${name} を無料で一緒に遊びましょう！`)
      .setURL(storeLink)
      .setDescription(
        '参加したい人はあらかじめ以下の参加手順に沿って部屋に入っておいてください。\n' +
          '(順番になったら、こっちで勝手にコントローラーを割り当てます)',
      )
      .addFields(
        {
          name: '特徴',
          value:
            '- ゲームを**持っていなくても**無料で参加できます\n' +
            '- PCだけでなく、**スマホでも**参加できます！\n' +
            '- Steamアカウントはなくてもプレイできます',
        },
        {
          name: '参加手順 (スマホの場合)',
          value:
            '1. ↓の「招待リンク取得」を押してリンクを踏んでください\n' +
            '2. ページ内の iOS/Android リンクを押してSteam Linkアプリをインストールしてください\n' +
            '3. ページ内の「ゲームに参加」ボタンを押して、アプリを開きます',
        },
        {
          name: '参加手順 (PCの場合)',
          value:
            '1. ↓の「招待リンク取得」を押してリンクを踏んでください\n' +
            '2. (Steamクライアントが入っていない人は) ページ内の Windows/macOS/Linux リンクを押してSteam Linkアプリをインストールしてください\n' +
            '3. コントローラー(Proコン、Joyコン、PlayStationコン、Xboxコンなど)をPCに接続してください\n' +
            '  ない人は [x360ceインストール手順](https://bit.ly/x360ce-tutorial) に沿ってコントローラーエミュレーターをインストールしてください\n' +
            '  x360ceがうまくいかない場合は、スマホでプレイできるので、そっちをお試しください\n' +
            '4. ページ内の「ゲームに参加」ボタンを押して、Steam Linkアプリを開きます',
        },
      )
      .setImage(headerImage)
      .setColor(3447003); // DarkBlue

    // Send the invite message
    await interaction.editReply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          InviteButtonAction.create(interaction.user.id, gameId),
        ),
      ],
    });
  }
}

export default new SteamInviteCommand(steamCommand);
