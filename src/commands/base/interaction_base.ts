import { ApplicationCommandDataResolvable, Interaction } from 'discord.js';

/**
 * Base class for handling commands, buttons, context menus, etc.
 */
export abstract class InteractionBase {
  /**
   * Function for registering commands in the ApplicationCommandManager.
   * By pushing the commands to the commandList and registering them, all commands will be registered with Discord after all commands have been added.
   * @param _commandList The list of commands to register in the ApplicationCommandManager.
   */
  registerCommands(_commandList: ApplicationCommandDataResolvable[]): void {}

  /**
   * Function for registering subcommands to other InteractionBase (commands, etc.).
   * After registering all subcommands, registerCommands() will be called.
   */
  registerSubCommands(): void {}

  /**
   * Function called when the InteractionCreate event occurs.
   * It is called for all registered InteractionBase.
   * Use if statements to determine the necessary actions and perform them.
   * @param _interaction The Interaction when the InteractionCreate event occurs.
   */
  async onInteractionCreate(_interaction: Interaction): Promise<void> {}
}
