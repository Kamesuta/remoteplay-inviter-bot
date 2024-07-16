import { installGlobalCommands } from './discord_utils.js';
import { APP_ID } from './env.js';

// Define the command
const commands = [
  {
    name: 'steam_invite',
    description:
      'Steam Remote Play Together を使用して起動中のゲームに招待します',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    integration_types: [0, 1],
  },
  {
    name: 'register',
    description: 'RemotePlayInviterクライアントUUIDを登録します',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    integration_types: [0, 1],
    options: [
      {
        type: 3,
        name: 'client_id',
        description: 'RemotePlayInviterクライアントのUUID',
        required: true,
      },
    ],
  },
];

await installGlobalCommands(APP_ID, commands);
