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
 * Database Client
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
  // Gateway Intents and Partials used by the bot
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
    logger.info(`Started as ${client.user?.username ?? 'Unknown'}!`);

    // Register commands for event handlers
    await commandHandler.registerCommands();

    logger.info(`Interaction registration completed`);
  }),
);
client.on(
  Events.InteractionCreate,
  nowait(commandHandler.onInteractionCreate.bind(commandHandler)),
);

// -----------------------------------------------------------------------------------------------------------
// Start the bot
// -----------------------------------------------------------------------------------------------------------

// Log in to Discord
await client.login(DISCORD_TOKEN);

// Start the daemon server
daemonServer.startListen(PORT);
