import WebSocket from 'ws';
import { DaemonClient } from './DaemonClient.js';

/**
 * Daemon Manager
 */
export class DaemonManager {
  /** User ID to Daemon ID mapping */
  private _userToDaemonId: Record<string, string> = {};

  /** Daemon ID to WebSocket Daemon mapping */
  private _daemons: Record<string, DaemonClient> = {};

  /**
   * Register a daemon
   * @param daemonId daemon ID
   * @param ws WebSocket connection to the daemon
   */
  registerDaemon(daemonId: string, ws: WebSocket): void {
    this._daemons[daemonId] = new DaemonClient(ws);
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
   * Bind a user to a daemon
   * @param userId user ID
   * @param daemonId daemon ID
   */
  bindUser(userId: string, daemonId: string): void {
    // TODO: use database to store this information
    this._userToDaemonId[userId] = daemonId;
  }

  /**
   * Unbind a user from a daemon
   * @param userId user ID
   */
  unbindUser(userId: string): void {
    // TODO: use database to store this information
    delete this._userToDaemonId[userId];
  }

  /**
   * Get the daemon ID for a user
   * @param userId user ID
   * @returns daemon ID
   */
  getDaemonIdFromUser(userId: string): string | undefined {
    return this._userToDaemonId[userId];
  }
}
