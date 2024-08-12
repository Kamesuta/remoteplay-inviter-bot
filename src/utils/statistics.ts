import { Routes } from 'discord.js';
import { client, daemonManager } from '../index.js';
import { logger } from './log.js';

/**
 * Log statistics
 */
export async function logStatistics(): Promise<void> {
  // 2024/08/13 Add: https://twitter.com/DiscordPreviews/status/1821998471789924487
  // Fetch aproximate install count from API
  const appInfo = (await client.rest.get(Routes.currentApplication())) as {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    approximate_guild_count: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    approximate_user_install_count: number;
  };

  // Other statistics
  const daemonCount = daemonManager.getDaemonCount();
  const linkedUserCount = await daemonManager.getUserCount();

  // Log the statistics
  logger.info(
    `Stats: guilds=${appInfo.approximate_guild_count}, users=${appInfo.approximate_user_install_count}, daemons=${daemonCount}, linked_users=${linkedUserCount}`,
  );
}
