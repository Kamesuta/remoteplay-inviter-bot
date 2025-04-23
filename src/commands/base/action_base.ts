import { InteractionBase } from './interaction_base.js';
import {
  Interaction,
  MappedComponentTypes,
  MappedInteractionTypes,
  ModalBuilder,
  ModalSubmitInteraction,
} from 'discord.js';

/**
 * Action Interaction
 */
abstract class ActionInteraction<
  MenuInteraction extends Interaction & { customId: string },
> extends InteractionBase {
  /**
   * Constructor
   * @param _id ID to identify the action
   */
  constructor(private _id: string) {
    super();
  }

  /**
   * Create a custom ID
   * @param data Data to include in the custom ID
   * @returns Custom ID
   */
  protected createCustomId(data?: Record<string, string>): string {
    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      _: this._id,
      ...data,
    });
    return params.toString();
  }

  /**
   * Check if the custom ID belongs to this action
   * @param params Custom ID parameters
   * @returns Whether it belongs to this action or not
   */
  protected isMyCustomId(params: URLSearchParams): boolean {
    if (params.get('_') !== this._id) return false;
    return true;
  }

  /**
   * Check if the interaction type matches
   * @param interaction Interaction
   * @returns Whether it matches or not
   */
  protected abstract isType(
    interaction: Interaction,
  ): interaction is MenuInteraction;

  /** @inheritdoc */
  override async onInteractionCreate(interaction: Interaction): Promise<void> {
    // Ignore if the type does not match
    if (!this.isType(interaction)) return;

    // Parse the custom ID and check if it belongs to this action
    const params = new URLSearchParams(interaction.customId);
    if (!this.isMyCustomId(params)) return;

    await this.onCommand(interaction, params);
  }

  /**
   * Function called when the command is executed
   * @param interaction Interaction
   * @param params Custom ID parameters
   */
  abstract onCommand(
    interaction: MenuInteraction,
    params: URLSearchParams,
  ): Promise<void>;
}

/**
 * Message Component Action Interaction
 */
export abstract class MessageComponentActionInteraction<
  MenuComponentType extends keyof MappedInteractionTypes,
> extends ActionInteraction<MappedInteractionTypes[MenuComponentType]> {
  /**
   * Constructor
   * @param id ID to identify the action
   * @param _type Component type
   */
  constructor(
    id: string,
    private _type: MenuComponentType,
  ) {
    super(id);
  }

  /**
   * Create a builder
   * @returns Created builder
   */
  abstract create(...args: unknown[]): MappedComponentTypes[MenuComponentType];

  /** @inheritdoc */
  protected override createCustomId(data?: Record<string, string>): string {
    return super.createCustomId({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      _t: `${this._type}`,
      ...data,
    });
  }

  /** @inheritdoc */
  protected override isMyCustomId(params: URLSearchParams): boolean {
    if (!super.isMyCustomId(params)) return false;
    if (params.get('_t') !== `${this._type}`) return false;
    return true;
  }

  /** @inheritdoc */
  protected override isType(
    interaction: Interaction,
  ): interaction is MappedInteractionTypes[MenuComponentType] {
    return (
      interaction.isMessageComponent() &&
      interaction.componentType === this._type
    );
  }
}

/**
 * Modal Action Interaction
 */
export abstract class ModalActionInteraction extends ActionInteraction<ModalSubmitInteraction> {
  /**
   * Constructor
   * @param id ID to identify the action
   */
  constructor(id: string) {
    super(id);
  }

  /**
   * Create a builder
   * @returns Created builder
   */
  abstract create(...args: unknown[]): ModalBuilder;

  /** @inheritdoc */
  protected override createCustomId(data?: Record<string, string>): string {
    return super.createCustomId({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      _t: 'm',
      ...data,
    });
  }

  /** @inheritdoc */
  protected override isMyCustomId(params: URLSearchParams): boolean {
    if (!super.isMyCustomId(params)) return false;
    if (params.get('_t') !== 'm') return false;
    return true;
  }

  /** @inheritdoc */
  protected override isType(
    interaction: Interaction,
  ): interaction is ModalSubmitInteraction {
    return interaction.isModalSubmit();
  }
}
