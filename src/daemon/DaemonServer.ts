import express, { Request, Response } from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { Socket } from 'net';
import { logger } from '../utils/log.js';
import { DaemonManager } from './DaemonManager.js';
import semver from 'semver';
import { nowait } from '../utils/utils.js';
import { prisma } from '../index.js';
import { DAEMON_DOWNLOAD_URL, DAEMON_REQUIRED_VERSION } from '../env.js';
import { ConnectionErrorMessage, DaemonErrorType } from './DaemonModels.js';

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
    // Redirect to DAEMON_DOWNLOAD_URL
    res.redirect(DAEMON_DOWNLOAD_URL);
  }

  /**
   * Intercept upgrade requests to validate the daemon ID
   * @param request request
   * @param socket websocket connection
   * @param head buffer
   */
  private _upgrade(request: Request, socket: Socket, head: Buffer): void {
    const {
      query: {
        token: daemonId,
        v: daemonVersion,
        session: daemonSessionIdText,
      },
    } = parse(request.url, true);

    if (
      // Check if the daemon version is string
      typeof daemonVersion !== 'string' ||
      // Check if the daemon version is valid
      !semver.valid(daemonVersion)
    ) {
      this._sendErrorMessage(socket, {
        error: DaemonErrorType.invalidVersion,
        message: 'Invalid client version',
      });
      return;
    }

    if (
      // Check if the daemon version is less than the required version
      !semver.gte(daemonVersion, DAEMON_REQUIRED_VERSION)
    ) {
      this._sendErrorMessage(socket, {
        error: DaemonErrorType.outdated,
        required: DAEMON_REQUIRED_VERSION,
        download: DAEMON_DOWNLOAD_URL,
        message: 'Client version is outdated',
      });
      return;
    }

    if (
      // Check if the daemon ID is string
      typeof daemonId !== 'string' ||
      // UUID length is 36 characters
      daemonId.length > 36
    ) {
      this._sendErrorMessage(socket, {
        error: DaemonErrorType.invalidToken,
        message: 'Invalid client UUID',
      });
      return;
    }

    let daemonSessionId: number;
    if (
      // Check if the daemon session ID is string
      typeof daemonSessionIdText !== 'string' ||
      // Parse the daemon session ID
      isNaN((daemonSessionId = parseInt(daemonSessionIdText)))
    ) {
      this._sendErrorMessage(socket, {
        error: DaemonErrorType.invalidSession,
        message: 'Invalid session ID',
      });
      return;
    }

    // Upgrade the connection to WebSocket
    this.wss.handleUpgrade(
      request,
      socket,
      head,
      nowait(async (ws: WebSocket) => {
        // Add daemon id to daemon object
        const daemonData = this._manager.registerDaemon(
          daemonId,
          daemonVersion,
          daemonSessionId,
          ws,
        );

        // Handle WebSocket connection
        this.wss.emit('connection', ws, request);

        // Save version to database for analytics
        const userData = await prisma.userData.findUnique({
          where: {
            daemonId,
          },
        });
        if (userData) {
          await prisma.userData.update({
            where: {
              id: userData.id,
            },
            data: {
              daemonVersion,
            },
          });

          // Send welcome message
          daemonData.sendWelcomeMessage(userData.locale, userData.name);
        } else {
          // Send link message
          daemonData.sendLinkMessage();
        }
      }),
    );
  }

  /**
   * Send an error message to the daemon for an invalid version
   * @param socket websocket connection
   * @param message error message
   */
  private _sendErrorMessage(
    socket: Socket,
    message: ConnectionErrorMessage,
  ): void {
    // Send the message to the daemon using X-Error header
    const versionJson = JSON.stringify(message);
    socket.write(`HTTP/1.1 400 Bad Request\nX-Error: ${versionJson}\n\n`);
    socket.destroy();
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

      const daemonData = this._manager.getDaemonFromId(daemonId);
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
