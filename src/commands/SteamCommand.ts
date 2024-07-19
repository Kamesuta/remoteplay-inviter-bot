import { ApplicationIntegrationType, SlashCommandBuilder } from 'discord.js';
import { CommandGroupInteraction } from './base/command_base.js';

class SteamCommand extends CommandGroupInteraction {
  command = new SlashCommandBuilder()
    .setName('steam')
    .setDescription('Steam Remote Play Together 招待リンク作成コマンド')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ]);
}

export default new SteamCommand();
