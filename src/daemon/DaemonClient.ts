import { randomUUID, UUID } from 'crypto';
import { User } from 'discord.js';
import WebSocket from 'ws';
import {
  ClientError,
  InvalidResponseJsonError,
  InvalidResponseMessageError,
  InvalidResponseTypeError,
  SendRequestError,
  TranslatableError,
} from '../utils/error.js';
import { i18n } from '../utils/i18n.js';
import {
  ClientMessage,
  ClientMessageGameId,
  ClientMessageLink,
  DaemonCmd,
  RequestMessageType,
  ServerMessage,
} from './DaemonModels.js';

/**
 * Daemon Request
 */
interface DaemonRequest {
  onResolve(res: ClientMessage): void;
  onReject(error: TranslatableError): void;
}

/**
 * Daemon Request for type safety
 */
class TypedDaemonRequest<Message extends ClientMessage>
  implements DaemonRequest
{
  constructor(
    public cmd: Message['cmd'],
    public resolve?: (res: Message) => void,
    public reject?: (error: TranslatableError) => void,
  ) {}

  onResolve(res: ClientMessage): void {
    if (res.cmd === this.cmd) {
      this.resolve?.(res as Message);
    } else {
      this.reject?.(new InvalidResponseTypeError());
    }
  }

  onReject(error: TranslatableError): void {
    this.reject?.(error);
  }
}

/**
 * Client instance for the Daemon Client
 */
export class DaemonClient {
  /** Requests */
  private _requests: Record<UUID, DaemonRequest> = {};

  /**
   * Constructor
   * @param uuid daemon UUID
   * @param version daemon version
   * @param _ws WebSocket connection
   */
  constructor(
    public uuid: string,
    public version: string,
    private _ws: WebSocket,
  ) {}

  /**
   * Process a response from the daemon
   * @param message response message
   */
  processResponse(message: string): void {
    // Parse the message
    let res: ClientMessage;
    try {
      res = JSON.parse(message) as ClientMessage;
    } catch (_err) {
      // Reset the connection and reject all requests
      this._closeByError(new InvalidResponseJsonError());
      return;
    }

    // Validate id
    if (typeof res.id !== 'string') return;

    // Validate cmd
    if (!Object.values(DaemonCmd).includes(res.cmd)) {
      // Process the error
      this._processError(res.id, new InvalidResponseTypeError());
      return;
    }

    // Validate if the message is error
    if (res.cmd === DaemonCmd.error) {
      // Process the error
      this._processErrorData(res.id, res.code);
      return;
    }

    // Validate the message
    if (
      (res.cmd === DaemonCmd.gameId && res.game === undefined) ||
      (res.cmd === DaemonCmd.link && res.url === undefined)
    ) {
      // Process the error
      this._processError(res.id, new InvalidResponseMessageError());
      return;
    }

    // Process the response
    this._processResponse(res);
  }

  /**
   * Process a response from the daemon
   * @param res response message
   */
  private _processResponse(res: ClientMessage): void {
    // Find the request
    const request = this._requests[res.id];
    if (request) {
      // Consume the request
      delete this._requests[res.id];

      // Process the request
      request.onResolve(res);
    }
  }

  /**
   * Process an error response from the daemon
   * @param requestId request ID
   * @param error error data
   */
  private _processErrorData(requestId: UUID, error: unknown): void {
    if (typeof error !== 'string') {
      this._processError(requestId, new InvalidResponseMessageError());
    } else {
      this._processError(requestId, ClientError.fromType(error));
    }
  }

  /**
   * Process an error from the daemon
   * @param requestId request ID
   * @param error error
   */
  private _processError(requestId: UUID, error: TranslatableError): void {
    // Find the request
    const request = this._requests[requestId];
    if (request) {
      // Consume the request
      delete this._requests[requestId];

      // Return the error
      request.onReject(error);
    }
  }

  /**
   * Close the connection to the daemon and reject all requests
   * @param error error message
   */
  private _closeByError(error: TranslatableError): void {
    this._ws.close();

    // Reject all requests
    for (const [_requestId, request] of Object.entries(this._requests)) {
      request.onReject(error);
    }
  }

  /**
   * Request a link to the daemon
   * @param user request user
   * @param gameId request game id
   * @returns link
   */
  async requestLink(user: User, gameId: number): Promise<string> {
    const res = await this._request<ClientMessageLink>(DaemonCmd.link, user, {
      game: gameId,
    });
    return res.url;
  }

  /**
   * Request a game id to the daemon
   * @param user request user
   * @returns game id
   */
  async requestGameId(user: User): Promise<number> {
    const res = await this._request<ClientMessageGameId>(
      DaemonCmd.gameId,
      user,
    );
    return res.game;
  }

  /**
   * Send a request to the daemon
   * @param cmd request type
   * @param user request user
   * @param data request data
   * @returns response
   */
  private _request<Message extends ClientMessage>(
    cmd: RequestMessageType,
    user: User,
    data: Partial<ServerMessage> = {},
  ): Promise<Message> {
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      // Register the callback
      const request = new TypedDaemonRequest<Message>(cmd, resolve, reject);
      this._requests[requestId] = request;

      // Send the message
      const requestData = {
        id: requestId,
        user: {
          id: user.id,
          name: user.username,
        },
        cmd,
        ...data,
      };
      this._ws.send(JSON.stringify(requestData), (err) => {
        if (err) {
          request.onReject(new SendRequestError());
        }
      });
    });
  }

  /**
   * Send a welcome message to the daemon
   * @param locale locale
   * @param username bind username
   */
  sendWelcomeMessage(locale: string, username: string): void {
    const message = i18n.__(
      { phrase: 'daemon.welcome_message', locale },
      { username },
    );

    // Send the message
    this._sendMessage(message);
  }

  /**
   * Send a link message to the daemon
   * @param locale locale
   */
  sendLinkMessage(locale = 'en'): void {
    const message = i18n.__(
      { phrase: 'daemon.link_message', locale },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      { client_id: this.uuid },
    );

    // Send the message
    // (and copy the command to the clipboard)
    this._sendMessage(message, `/steam setup client_id:${this.uuid}`);
  }

  /**
   * Send a bind message to the daemon
   * @param locale locale
   * @param username bind username
   */
  sendBindMessage(locale: string, username: string): void {
    const message = i18n.__(
      { phrase: 'daemon.bind_message', locale },
      { username },
    );

    // Send the message
    this._sendMessage(message);
  }

  /**
   * Send a message to the daemon
   * @param message message
   * @param copy message to copy to the clipboard
   */
  private _sendMessage(message: string, copy?: string): void {
    const requestId = randomUUID();

    const requestData: ServerMessage = {
      id: requestId,
      cmd: DaemonCmd.message,
      text: message,
      copy,
    };

    this._ws.send(JSON.stringify(requestData));
  }
}
