import { InteractionBase } from './interaction_base.js';
import {
  ApplicationCommandDataResolvable,
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

/**
 * Command-based interaction
 */
interface CommandBasedInteraction {
  /**
   * Function to determine if it is my interaction
   * @param interaction The interaction
   * @returns Whether it is my interaction or not
   */
  isMyInteraction(interaction: ChatInputCommandInteraction): boolean;
}

/**
 * Command group
 */
export abstract class CommandGroupInteraction
  extends InteractionBase
  implements CommandBasedInteraction
{
  abstract command: SlashCommandSubcommandsOnlyBuilder;

  /** @inheritdoc */
  override registerCommands(
    commandList: ApplicationCommandDataResolvable[],
  ): void {
    commandList.push(this.command);
  }

  /** @inheritdoc */
  isMyInteraction(interaction: ChatInputCommandInteraction): boolean {
    return interaction.commandName === this.command.name;
  }
}

/**
 * Subcommand group
 */
export abstract class SubcommandGroupInteraction
  extends InteractionBase
  implements CommandBasedInteraction
{
  abstract command: SlashCommandSubcommandGroupBuilder;

  /**
   * Constructor
   * @param _registry The destination to register the subcommand group
   */
  constructor(private _registry: CommandGroupInteraction) {
    super();
  }

  /** @inheritdoc */
  override registerSubCommands(): void {
    this._registry.command.addSubcommandGroup(this.command);
  }

  /** @inheritdoc */
  isMyInteraction(interaction: ChatInputCommandInteraction): boolean {
    return (
      interaction.options.getSubcommandGroup() === this.command.name &&
      this._registry.isMyInteraction(interaction)
    );
  }
}

/**
 * Command
 */
export abstract class CommandInteraction
  extends InteractionBase
  implements CommandBasedInteraction
{
  abstract command: SlashCommandOptionsOnlyBuilder;

  /** @inheritdoc */
  override registerCommands(
    commandList: ApplicationCommandDataResolvable[],
  ): void {
    commandList.push(this.command);
  }

  /** @inheritdoc */
  isMyInteraction(interaction: ChatInputCommandInteraction): boolean {
    return interaction.commandName === this.command.name;
  }

  /** @inheritdoc */
  override async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    if (!this.isMyInteraction(interaction)) return;
    await this.onCommand(interaction);
  }

  /**
   * Function called when the command is executed
   * @param interaction The interaction
   */
  abstract onCommand(interaction: ChatInputCommandInteraction): Promise<void>;
}

/**
 * Subcommand
 */
export abstract class SubcommandInteraction
  extends InteractionBase
  implements CommandBasedInteraction
{
  abstract command: SlashCommandSubcommandBuilder;

  /**
   * Constructor
   * @param _registry The destination to register the subcommand group
   */
  constructor(
    private _registry: CommandGroupInteraction | SubcommandGroupInteraction,
  ) {
    super();
  }

  /** @inheritdoc */
  override registerSubCommands(): void {
    this._registry.command.addSubcommand(this.command);
  }

  /** @inheritdoc */
  isMyInteraction(interaction: ChatInputCommandInteraction): boolean {
    return (
      interaction.options.getSubcommand() === this.command.name &&
      this._registry.isMyInteraction(interaction)
    );
  }

  /** @inheritdoc */
  override async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    if (!this.isMyInteraction(interaction)) return;
    await this.onCommand(interaction);
  }

  /**
   * Function called when the command is executed
   * @param interaction The interaction
   */
  abstract onCommand(interaction: ChatInputCommandInteraction): Promise<void>;
}
