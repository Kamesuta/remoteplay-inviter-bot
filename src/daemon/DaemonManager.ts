import WebSocket from 'ws';
import { DaemonClient } from './DaemonClient.js';

/**
 * Daemon Manager
 */
export class DaemonManager {
  /** User ID to Daemon ID mapping */
  userToDaemonId: Record<string, string> = {};

  /** Daemon ID to WebSocket Daemon mapping */
  daemons: Record<string, DaemonClient> = {};

  /**
   * Register a daemon
   * @param daemonId daemon ID
   * @param ws WebSocket connection to the daemon
   */
  registerDaemon(daemonId: string, ws: WebSocket): void {
    this.daemons[daemonId] = new DaemonClient(ws);
  }

  /**
   * Unregister a daemon
   * @param daemonId daemon ID
   */
  unregisterDaemon(daemonId: string): void {
    delete this.daemons[daemonId];
  }
}
