import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';
import { CommandGroupInteraction } from './base/command_base.js';
import { forDiscord, i18n } from '../utils/i18n.js';

class SteamCommand extends CommandGroupInteraction {
  command = new SlashCommandBuilder()
    .setName('steam')
    .setDescription(i18n.__('steam_command.description'))
    .setDescriptionLocalizations(forDiscord('steam_command.description'))
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]);
}

export default new SteamCommand();
