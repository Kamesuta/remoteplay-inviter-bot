import WebSocket from 'ws';
import { DaemonClient } from './DaemonClient.js';
import { prisma } from '../index.js';
import { User } from 'discord.js';

/**
 * Daemon Manager
 */
export class DaemonManager {
  /** Daemon ID to WebSocket Daemon mapping */
  private _daemons: Record<string, DaemonClient> = {};

  /**
   * Register a daemon
   * @param daemonId daemon ID
   * @param daemonVersion daemon version
   * @param daemonSessionId daemon session ID
   * @param ws WebSocket connection to the daemon
   * @returns DaemonClient instance
   */
  registerDaemon(
    daemonId: string,
    daemonVersion: string,
    daemonSessionId: number,
    ws: WebSocket,
  ): DaemonClient {
    return (this._daemons[daemonId] = new DaemonClient(
      daemonId,
      daemonVersion,
      daemonSessionId,
      ws,
    ));
  }

  /**
   * Unregister a daemon
   * @param daemonId daemon ID
   */
  unregisterDaemon(daemonId: string): void {
    delete this._daemons[daemonId];
  }

  /**
   * Get a daemon by ID
   * @param daemonId daemon ID
   * @returns DaemonClient instance
   */
  getDaemonFromId(daemonId: string): DaemonClient | undefined {
    return this._daemons[daemonId];
  }

  /**
   * Get the number of daemons
   * @returns number of daemons
   */
  getDaemonCount(): number {
    return Object.keys(this._daemons).length;
  }

  /**
   * Bind a user to a daemon
   * @param user user
   * @param daemonId daemon ID
   * @param locale user locale
   */
  async bindUser(user: User, daemonId: string, locale: string): Promise<void> {
    const daemonVersion = this.getDaemonFromId(daemonId)?.version ?? null;
    await prisma.userData.upsert({
      where: {
        userId: user.id,
      },
      update: {
        name: user.username,
        locale,
        daemonId,
        daemonVersion,
      },
      create: {
        userId: user.id,
        name: user.username,
        locale,
        daemonId,
        daemonVersion,
      },
    });
  }

  /**
   * Unbind a user from a daemon
   * @param userId user ID
   */
  async unbindUser(userId: User): Promise<void> {
    await prisma.userData.delete({
      where: {
        userId: userId.id,
      },
    });
  }

  /**
   * Get the daemon ID for a user
   * @param userId user ID
   * @returns daemon ID
   */
  async getDaemonIdFromUser(userId: string): Promise<string | undefined> {
    const userData = await prisma.userData.findUnique({
      where: {
        userId,
      },
    });
    return userData?.daemonId ?? undefined;
  }

  /**
   * Get the number of users
   * @returns number of users
   */
  async getUserCount(): Promise<number> {
    return await prisma.userData.count();
  }
}
