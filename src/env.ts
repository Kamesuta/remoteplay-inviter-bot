import 'dotenv/config';
import assert from 'assert';

/**
 * The port number for the server.
 * If the `PORT` environment variable is set, it will be used as the port number.
 * Otherwise, the default port number is 3000.
 */
export const PORT: number = parseInt(process.env.PORT || '3000');

assert(process.env.DISCORD_TOKEN, 'DISCORD_TOKEN is not set');
/**
 * The Discord bot token.
 */
export const DISCORD_TOKEN: string = process.env.DISCORD_TOKEN;
