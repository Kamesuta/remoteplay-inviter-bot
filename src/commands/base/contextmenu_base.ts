import { InteractionBase } from './interaction_base.js';
import {
  ApplicationCommandDataResolvable,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  Interaction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js';

/**
 * User Context Menu Interaction
 */
export abstract class UserContextMenuInteraction extends InteractionBase {
  abstract command: ContextMenuCommandBuilder;

  /** @inheritdoc */
  override registerCommands(
    commandList: ApplicationCommandDataResolvable[],
  ): void {
    commandList.push(this.command.setType(ApplicationCommandType.User));
  }

  /** @inheritdoc */
  override async onInteractionCreate(interaction: Interaction): Promise<void> {
    // Context menu when right-clicking on a user
    if (!interaction.isUserContextMenuCommand()) return;
    if (interaction.commandName !== this.command.name) return;
    await this.onCommand(interaction);
  }

  /**
   * Function called when the command is executed
   * @param interaction The interaction
   */
  abstract onCommand(
    interaction: UserContextMenuCommandInteraction,
  ): Promise<void>;
}

/**
 * Message Context Menu Interaction
 */
export abstract class MessageContextMenuInteraction extends InteractionBase {
  abstract command: ContextMenuCommandBuilder;

  /** @inheritdoc */
  override registerCommands(
    commandList: ApplicationCommandDataResolvable[],
  ): void {
    commandList.push(this.command.setType(ApplicationCommandType.Message));
  }

  /** @inheritdoc */
  override async onInteractionCreate(interaction: Interaction): Promise<void> {
    // Context menu when right-clicking on a message
    if (!interaction.isMessageContextMenuCommand()) return;
    if (interaction.commandName !== this.command.name) return;
    await this.onCommand(interaction);
  }

  /**
   * Function called when the command is executed
   * @param interaction The interaction
   */
  abstract onCommand(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<void>;
}
