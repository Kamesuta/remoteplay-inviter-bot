import 'dotenv/config';
import assert from 'assert';

assert(process.env.DISCORD_TOKEN, 'DISCORD_TOKEN is not set');
/**
 * The Discord bot token.
 */
export const DISCORD_TOKEN: string = process.env.DISCORD_TOKEN;

/**
 * The port number for the server.
 * If the `PORT` environment variable is set, it will be used as the port number.
 * Otherwise, the default port number is 3000.
 */
export const PORT: number = parseInt(process.env.PORT || '3000');

assert(
  process.env.DAEMON_REQUIRED_VERSION,
  'DAEMON_REQUIRED_VERSION is not set',
);
/**
 * Required version of the daemon client.
 */
export const DAEMON_REQUIRED_VERSION: string =
  process.env.DAEMON_REQUIRED_VERSION;

assert(process.env.DAEMON_DOWNLOAD_URL, 'DAEMON_DOWNLOAD_URL is not set');
/**
 * URL to guide downloading when the daemon client is outdated.
 */
export const DAEMON_DOWNLOAD_URL: string = process.env.DAEMON_DOWNLOAD_URL;
