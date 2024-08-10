import { ApplicationCommandDataResolvable, Interaction } from 'discord.js';
import { client } from '../index.js';
import { logger } from '../utils/log.js';
import { InteractionBase } from './base/interaction_base.js';
/**
 * Command Handler
 */
export default class CommandHandler {
  /**
   * Initializes the command handler
   * @param _commands Command list
   */
  constructor(private _commands: InteractionBase[]) {}

  /**
   * Registers the commands
   */
  async registerCommands(): Promise<void> {
    // List of commands to register
    const applicationCommands: ApplicationCommandDataResolvable[] = [];

    // Build subcommands
    this._commands.forEach((command) => command.registerSubCommands());

    // Build commands
    this._commands.forEach((command) =>
      command.registerCommands(applicationCommands),
    );

    // Register commands
    await client.application?.commands.set(applicationCommands);
  }

  /**
   * Handles the interaction create event
   * @param interaction Interaction
   */
  async onInteractionCreate(interaction: Interaction): Promise<void> {
    try {
      // Process all commands
      await Promise.all(
        this._commands.map((command) =>
          command.onInteractionCreate(interaction),
        ),
      );
    } catch (error) {
      logger.error('An error occurred during onInteractionCreate.', error);
    }
  }
}
