import { InteractionBase } from './base/interaction_base.js';
import steamCommand from './SteamCommand.js';
import steamSetupCommand from './SteamSetupCommand.js';
import steamInviteCommand from './SteamInviteCommand.js';
import inviteButtonAction from './InviteButtonAction.js';

const commands: InteractionBase[] = [
  steamCommand,
  steamSetupCommand,
  steamInviteCommand,
  inviteButtonAction,
];

export default commands;
