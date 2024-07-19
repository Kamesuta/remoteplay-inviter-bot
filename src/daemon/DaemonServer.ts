// 必要なパッケージをインポートする
import express, { Request, Response } from 'express';
import WebSocket from 'ws';
import { resolve } from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import { Socket } from 'net';
import { logger } from '../utils/log.js';
import { DaemonManager } from './DaemonManager.js';

/**
 * Represents a daemon server that handles WebSocket connections and HTTP requests.
 */
export class DaemonServer {
  /** express app */
  app = express();
  /** HTTP server */
  server = createServer(this.app);

  /**
   * WebSocket server
   *
   * Explicitly specify NodeJS.EventEmitter to avoid conflicts with the EventEmitter defined in discord.js, which prevents calling the emit function
   * https://github.com/discordjs/discord.js/issues/10358#issuecomment-2212376767
   */
  wss = new WebSocket.Server({ noServer: true }) as WebSocket.Server &
    NodeJS.EventEmitter;

  /**
   * Constructor
   * @param _manager DaemonManager instance
   */
  constructor(private _manager: DaemonManager) {
    this.app.get('/', this._index.bind(this));
    this.server.on('upgrade', this._upgrade.bind(this));
    this.wss.on('connection', this._connection.bind(this));
  }

  /**
   * Listen on the specified port
   * @param port port number
   */
  startListen(port: number): void {
    this.server.listen(port, () => {
      logger.info(`Daemon server is running on port ${port}`);
    });
  }

  /**
   * Stop listening
   */
  stopListen(): void {
    this.server.close();
  }

  /**
   * Returns the index.html file to debug the WebSocket connection
   * @param _req request
   * @param res response
   */
  private _index(_req: Request, res: Response): void {
    res.sendFile(resolve('./index.html'));
  }

  /**
   * Intercept upgrade requests to validate the daemon ID
   * @param request request
   * @param socket websocket connection
   * @param head buffer
   */
  private _upgrade(request: Request, socket: Socket, head: Buffer): void {
    const { query } = parse(request.url, true);
    const daemonId = query.token;

    if (!daemonId || typeof daemonId !== 'string') {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Upgrade the connection to WebSocket
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      // Add daemon id to daemon object
      this._manager.registerDaemon(daemonId, ws);

      // Handle WebSocket connection
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * Handle WebSocket connections
   * @param ws websocket connection
   * @param request request
   */
  private _connection(ws: WebSocket, request: Request): void {
    const { query } = parse(request.url, true);
    const daemonId = query.token;
    if (!daemonId || typeof daemonId !== 'string') {
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Handle messages
    ws.on('message', (msg: Buffer, isBinary: boolean) => {
      if (isBinary) return;
      const message = msg.toString();

      const daemonData = this._manager.daemons[daemonId];
      if (daemonData) {
        // Process the message
        logger.debug(`Received message from ${daemonId}: ${message}`);

        // Process requests
        daemonData.processResponse(message);
      }
    });

    // Implement keep-alive mechanism
    let hasPongBeenReceived = true; // Flag to track pong response
    const pingInterval = setInterval(() => {
      if (!hasPongBeenReceived) {
        logger.debug(
          `No pong received from daemon: ${daemonId}. Terminating connection.`,
        );
        ws.terminate(); // Terminate the connection
        clearInterval(pingInterval);
        this._manager.unregisterDaemon(daemonId);
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        hasPongBeenReceived = false; // Reset the flag before sending ping
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Send a ping every 30 seconds

    // Handle pong messages
    ws.on('pong', () => {
      hasPongBeenReceived = true; // Set the flag when pong is received
      logger.debug(`Pong received from daemon: ${daemonId}`);
    });

    // Handle connection close
    ws.on('close', () => {
      logger.debug(`Connection closed for daemon: ${daemonId}`);
      clearInterval(pingInterval);
      this._manager.unregisterDaemon(daemonId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.debug(`Error for daemon ${daemonId}:`, error);
      ws.close(1006, 'Internal Server Error');
      clearInterval(pingInterval);
      this._manager.unregisterDaemon(daemonId);
    });
  }
}
