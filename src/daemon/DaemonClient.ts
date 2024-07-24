import { randomUUID, UUID } from 'crypto';
import { User } from 'discord.js';
import WebSocket from 'ws';

/**
 * A data structure to represent a request to the daemon
 */
interface DaemonRequestData {
  id: UUID;
  cmd: DaemonRequestType;
  user: {
    id: string;
    name: string;
  };
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
      this.reject?.(new Error('Invalid response type'));
    }
  }

  onReject(error: Error): void {
    this.reject?.(error);
  }
}

/**
 * Error messages
 */
const errorMessages: Record<string, string> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invalid_cmd: 'Invalid cmd',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invalid_app: 'Invalid app',
};

/**
 * Client instance for the Daemon Client
 */
export class DaemonClient {
  /** Requests */
  private _requests: Record<UUID, DaemonRequest> = {};

  /**
   * Constructor
   * @param _ws WebSocket connection
   */
  constructor(private _ws: WebSocket) {}

  /**
   * Process a response from the daemon
   * @param message response message
   */
  processResponse(message: string): void {
    // Parse the message
    const { id, cmd, data } = JSON.parse(message) as DaemonResponseData;

    // Validate id
    if (typeof id !== 'string') return;

    // Validate if the message is error
    if (cmd === DaemonRequestType.error) {
      // Process the error
      this._processError(id, data);
    }

    // Validate the message
    if (typeof cmd !== 'string' || data === undefined || data === null) {
      return;
    }

    // Process the response
    this._processResponse(id, cmd, data);
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
  private _processError(requestId: UUID, error: unknown): void {
    // Find the request
    const request = this._requests[requestId];
    if (request) {
      // Consume the request
      delete this._requests[requestId];

      if (typeof error !== 'string') {
        request.onReject(new Error('Invalid error response'));
      } else if (error in errorMessages) {
        request.onReject(new Error(errorMessages[error]));
      } else {
        request.onReject(new Error(`Unknown error: ${error}`));
      }
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
          request.onReject(new Error('Failed to send message', err));
        }
      });
    });
  }
}
