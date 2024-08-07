// 必要なパッケージをインポートする
import { Client, Events } from 'discord.js';
import 'dotenv/config';

import { logger } from './utils/log.js';
import CommandHandler from './commands/CommandHandler.js';
import { nowait } from './utils/utils.js';
import commands from './commands/commands.js';
import { DaemonServer } from './daemon/DaemonServer.js';
import { DaemonManager } from './daemon/DaemonManager.js';
import { DISCORD_TOKEN, PORT } from './env.js';
import { PrismaClient } from '@prisma/client';

// -----------------------------------------------------------------------------------------------------------
// Setup
// -----------------------------------------------------------------------------------------------------------

/**
 * データベースのインスタンス
 */
export const prisma = new PrismaClient();

/**
 * Daemon Manager
 */
export const daemonManager = new DaemonManager();

/**
 * Daemon Server
 */
export const daemonServer = new DaemonServer(daemonManager);

/**
 * Discord Client
 */
export const client: Client = new Client({
  // Botで使うGetwayIntents、partials
  intents: [],
});

/**
 * Command Handler
 */
const commandHandler = new CommandHandler(commands);

// -----------------------------------------------------------------------------------------------------------
// Register interaction handlers
// -----------------------------------------------------------------------------------------------------------
client.on(
  Events.ClientReady,
  nowait(async () => {
    logger.info(`${client.user?.username ?? 'Unknown'} として起動しました!`);

    // イベント管理者用のコマンドを登録
    await commandHandler.registerCommands();

    logger.info(`インタラクションの登録が完了しました`);
  }),
);
client.on(
  Events.InteractionCreate,
  nowait(commandHandler.onInteractionCreate.bind(commandHandler)),
);

// -----------------------------------------------------------------------------------------------------------
// Start the bot
// -----------------------------------------------------------------------------------------------------------

// Discordにログインする
await client.login(DISCORD_TOKEN);

// Start the daemon server
daemonServer.startListen(PORT);
