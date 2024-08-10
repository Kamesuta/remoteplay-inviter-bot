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

/**
 * A data structure to represent a request to the daemon
 */
interface DaemonRequestData {
  id: UUID;
  cmd: DaemonRequestType;
  // message type: undefined, others: object
  user?: {
    id: string;
    name: string;
  };
  // message type: string, others: undefined
  data?: unknown;
  game?: number;
  copy?: string;
}

/**
 * A data structure to represent a response from the daemon
 */
interface DaemonResponseData {
  id: UUID;
  cmd: DaemonRequestType;
  data: unknown;
}

/**
 * Request Type
 */
enum DaemonRequestType {
  /** Announce message */
  message = 'message',

  /** Generate a game id */
  gameId = 'game',

  /** Generate a link request */
  link = 'link',

  /** Error response */
  error = 'error',
}

/**
 * Daemon Request
 */
interface DaemonRequest {
  onResolve(type: DaemonRequestType, data: object): void;
  onReject(error: Error): void;
}

/**
 * Daemon Request for type safety
 */
class TypedDaemonRequest<T> implements DaemonRequest {
  constructor(
    public type: DaemonRequestType,
    public resolve?: (data: T) => void,
    public reject?: (error: Error) => void,
  ) {}

  onResolve(type: DaemonRequestType, data: object): void {
    if (type === this.type) {
      this.resolve?.(data as T);
    } else {
      this.reject?.(new InvalidResponseTypeError());
    }
  }

  onReject(error: Error): void {
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
    let res: DaemonRequestData;
    try {
      res = JSON.parse(message) as DaemonResponseData;
    } catch (_err) {
      // Reset the connection and reject all requests
      this._closeByError(new InvalidResponseJsonError());
      return;
    }

    // Validate id
    if (typeof res.id !== 'string') return;

    // Validate if the message is error
    if (res.cmd === DaemonRequestType.error) {
      // Process the error
      this._processErrorData(res.id, res.data);
      return;
    }

    // Validate the message
    if (
      typeof res.cmd !== 'string' ||
      res.data === undefined ||
      res.data === null
    ) {
      // Process the error
      this._processError(res.id, new InvalidResponseMessageError());
      return;
    }

    // Process the response
    this._processResponse(res.id, res.cmd, res.data);
  }

  /**
   * Process a response from the daemon
   * @param requestId request ID
   * @param cmd request type
   * @param data request data
   */
  private _processResponse(
    requestId: UUID,
    cmd: DaemonRequestType,
    data: object,
  ): void {
    // Find the request
    const request = this._requests[requestId];
    if (request) {
      // Consume the request
      delete this._requests[requestId];

      // Process the request
      request.onResolve(cmd, data);
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
  requestLink(user: User, gameId: number): Promise<string> {
    return this._request<string>(DaemonRequestType.link, user, {
      game: gameId,
    });
  }

  /**
   * Request a game id to the daemon
   * @param user request user
   * @returns game id
   */
  requestGameId(user: User): Promise<number> {
    return this._request<number>(DaemonRequestType.gameId, user);
  }

  /**
   * Send a request to the daemon
   * @param cmd request type
   * @param user request user
   * @param data request data
   * @returns response
   */
  private _request<ResponseType>(
    cmd: DaemonRequestType,
    user: User,
    data: object = {},
  ): Promise<ResponseType> {
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      // Register the callback
      const request = new TypedDaemonRequest<ResponseType>(
        cmd,
        resolve,
        reject,
      );
      this._requests[requestId] = request;

      // Send the message
      const requestData: DaemonRequestData = {
        id: requestId,
        cmd,
        user: {
          id: user.id,
          name: user.username,
        },
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
   * @param bindUsername bind username
   */
  sendWelcomeMessage(bindUsername?: string): void {
    const message = bindUsername
      ? `Welcome, ${bindUsername}!\nType \`/steam invite\` to invite a friend.`
      : `Type \`/steam setup ${this.uuid}\` to link your Discord account.`;

    // Send the message
    // (if bindUsername is not provided, send setup command and copy the command to the clipboard)
    this._sendMessage(
      message,
      bindUsername ? undefined : `/steam setup client_id:${this.uuid}`,
    );
  }

  /**
   * Send a bind message to the daemon
   * @param bindUsername bind username
   */
  sendBindMessage(bindUsername: string): void {
    const message = `You are now linked to ${bindUsername}!\nType \`/steam invite\` to invite a friend.`;

    this._sendMessage(message);
  }

  /**
   * Send a message to the daemon
   * @param message message
   * @param copy message to copy to the clipboard
   */
  private _sendMessage(message: string, copy?: string): void {
    const requestId = randomUUID();

    const requestData: DaemonRequestData = {
      id: requestId,
      cmd: DaemonRequestType.message,
      data: message,
      copy,
    };

    this._ws.send(JSON.stringify(requestData));
  }
}
