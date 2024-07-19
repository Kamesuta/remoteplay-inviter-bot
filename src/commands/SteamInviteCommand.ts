import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { SubcommandInteraction } from './base/command_base.js';
import steamCommand from './SteamCommand.js';

class SteamInviteCommand extends SubcommandInteraction {
  command = new SlashCommandSubcommandBuilder()
    .setName('invite')
    .setDescription(
      'Steam Remote Play Together を使用して起動中のゲームに招待します',
    );

  async onCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
  }
}

export default new SteamInviteCommand(steamCommand);
