// 必要なパッケージをインポートする
import express, { Request, Response } from 'express';
import { sleep } from './utils/utils.js';
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { PUBLIC_KEY, PORT, APP_ID } from './env.js';
import { discordRequest } from './discord_utils.js';

// Create an express app
const app = express();

// Verify incoming requests from Discord and parse request body
app.use('/interactions', verifyKeyMiddleware(PUBLIC_KEY));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', (req: Request, res: Response): void => {
  // Interaction type and data
  const { type, data, token } = req.body as {
    type: InteractionType;
    data: {
      name: string;
      options: { name: string; value: string };
    };
    token: string;
  };

  // Log request bodies
  console.log(req.body);

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "steam_invite" command
    if (name === 'steam_invite') {
      const gameName = 'Dummy Game';
      const storeLink = 'https://store.steampowered.com/app/0';
      const headerImage =
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/728880/header.jpg?t=1718623620';
      const inviterId = '123456789';

      // Construct `data` for our interaction response. The profile embed will be included regardless of interaction context
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: `${gameName} を無料で一緒に遊びましょう！`,
              url: storeLink,
              description:
                '参加したい人はあらかじめ以下の参加手順に沿って部屋に入っておいてください。\n' +
                '(順番になったら、こっちで勝手にコントローラーを割り当てます)',
              fields: [
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
              ],
              image: {
                url: headerImage,
              },
              color: 3447003, // DarkBlue
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: '招待リンク取得',
                  style: 3, // Success
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  custom_id: `create_steam_invite_${inviterId}`,
                  emoji: {
                    name: '🔗',
                  },
                },
              ],
            },
          ],
        },
      });
    }
  }

  // handle button interaction
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // Defer the response
    res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64, // Ephemeral
      },
    });

    void sleep(1000)
      .then(async () => {
        // ボタンが押されたときの処理
        await discordRequest(
          `/webhooks/${APP_ID}/${token}/messages/@original`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              content: 'ボタンが押されました！',
            }),
          },
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
