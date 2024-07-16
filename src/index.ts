// 必要なパッケージをインポートする
import express, { Request, Response } from 'express';
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { PUBLIC_KEY, PORT, APP_ID } from './env.js';
import { discordRequest } from './discord_utils.js';
import WebSocket, { WebSocketServer } from 'ws';
import { resolve } from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import { Socket } from 'net';

// Create an express app
const app = express();
// Create a socket.io server
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// UserID to Token mapping
const userTokens: Record<string, string> = {};

// WebSocket Clients
interface ClientData {
  token: string;
  ws: WebSocket;
  requests: ((link: string) => void)[];
}

// WebSocket Clients
const clients: Record<string, ClientData> = {};

// Verify incoming requests from Discord and parse request body
app.use('/interactions', verifyKeyMiddleware(PUBLIC_KEY));

app.get('/', (_req: Request, res: Response): void => {
  res.sendFile(resolve('./index.html'));
});

// Intercept upgrade requests to validate the token
server.on('upgrade', (request: Request, socket: Socket, head) => {
  const { query } = parse(request.url, true);
  const token = query.token;

  if (!token || typeof token !== 'string') {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Upgrade the connection to WebSocket
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Add client to clients object
    clients[token] = { token, ws, requests: [] };

    // Handle WebSocket connection
    wss.emit('connection', ws, request);
  });
});

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, request: Request) => {
  const { query } = parse(request.url, true);
  const token = query.token;
  if (!token || typeof token !== 'string') {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Handle messages
  ws.on('message', (msg: Buffer, isBinary: boolean) => {
    if (isBinary) return;
    const message = msg.toString();

    const clientData = clients[token];
    if (clientData) {
      // Process the message
      console.log(`Received message from ${token}: ${message}`);
      // Example: Echo the message back
      ws.send(`Echo: ${message}`);

      // Parse target token
      const targetToken = message.split(' ')[0];

      // Send message to another client
      const targetClient = clients[targetToken];
      if (targetClient) {
        targetClient.ws.send(`Message from ${token}: ${message}`);
      } else {
        console.log(`Target client not found: ${targetToken}`);
      }

      // Process requests
      const requestHandler = clientData.requests.shift();
      if (requestHandler) {
        requestHandler(message);
      }
    }
  });

  // Implement keep-alive mechanism
  let hasPongBeenReceived = true; // Flag to track pong response
  const pingInterval = setInterval(() => {
    if (!hasPongBeenReceived) {
      console.log(
        `No pong received from token: ${token}. Terminating connection.`,
      );
      ws.terminate(); // Terminate the connection
      clearInterval(pingInterval);
      return;
    }

    if (ws.readyState === WebSocket.OPEN) {
      hasPongBeenReceived = false; // Reset the flag before sending ping
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Send a ping every 30 seconds

  ws.on('pong', () => {
    hasPongBeenReceived = true; // Set the flag when pong is received
    console.log(`Pong received from token: ${token}`);
  });

  // Handle connection close
  ws.on('close', () => {
    delete clients[token];
    clearInterval(pingInterval);
    console.log(`Connection closed for token: ${token}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`Error for token ${token}:`, error);
    ws.close(1006, 'Internal Server Error');
    clearInterval(pingInterval);
    delete clients[token];
  });
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', (req: Request, res: Response): void => {
  // Interaction type and data
  const {
    type,
    data,
    token,
    member: { user },
  } = req.body as {
    type: InteractionType;
    data: {
      name: string;
      options: { name: string; value: string }[];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      custom_id?: string;
    };
    token: string;
    member: {
      user: { id: string; username: string };
    };
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
      const inviterId = user.id;

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
    } else if (name === 'register') {
      // "steam_register" command
      const { options } = data;
      const clientId = options?.[0]?.value;
      if (!clientId) {
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'クライアントIDを指定してください。',
            flags: 64, // Ephemeral
          },
        });
        return;
      }

      // Store the client ID
      userTokens[user.id] = clientId;

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `クライアントID ${clientId} を登録しました。`,
          flags: 64, // Ephemeral
        },
      });
    }
  }

  // handle button interaction
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { custom_id } = data;

    // Get the inviter ID from the custom ID
    const inviterId = custom_id?.match(/create_steam_invite_(\d+)/)?.[1];
    if (!inviterId) {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '無効なボタンです。',
          flags: 64, // Ephemeral
        },
      });
      return;
    }

    // Convert user ID to token
    const uuid = userTokens[inviterId];
    if (!uuid) {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            'まずは `/register` コマンドでクライアントIDを登録してください。',
          flags: 64, // Ephemeral
        },
      });
      return;
    }

    // Get the client data
    const clientData = clients[uuid];
    if (!clientData) {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'クライアントがオフラインです。',
          flags: 64, // Ephemeral
        },
      });
      return;
    }

    // Defer the response
    res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64, // Ephemeral
      },
    });

    // Register callback
    clientData.requests.push((link) => {
      void discordRequest(`/webhooks/${APP_ID}/${token}/messages/@original`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: `招待リンクを作成しました！\n${link}\nリンクを踏んでゲームに参加してください～`,
        }),
      });
    });

    // Send message to client
    clientData.ws.send(
      JSON.stringify({
        request: 'generate',
        invitee: { id: token },
        from: { id: user.id, username: user.username },
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
