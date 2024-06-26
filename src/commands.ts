import { installGlobalCommands } from './discord_utils.js';
import { APP_ID } from './env.js';

// Define the command
const command = {
  name: 'steam_invite',
  description:
    'Steam Remote Play Together を使用して起動中のゲームに招待します',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  integration_types: [0, 1],
};

await installGlobalCommands(APP_ID, [command]);
