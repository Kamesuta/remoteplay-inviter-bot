import { randomUUID, UUID } from 'crypto';
import WebSocket from 'ws';
import { PanelData } from './PanelData.js';

/**
 * A data structure to represent a request to the daemon
 */
interface DaemonRequestData {
  id: UUID;
  cmd: DaemonRequestType;
  user: string;
}

/**
 * A data structure to represent a response from the daemon
 */
interface DaemonResponseData {
  id: UUID;
  cmd: DaemonRequestType;
  data: object;
}

/**
 * Request Type
 */
enum DaemonRequestType {
  /** Generate a panel request */
  generatePanel = 'panel',

  /** Generate a link request */
  generateLink = 'link',
}

/**
 * Daemon Request
 */
interface DaemonRequest {
  onRequest(type: DaemonRequestType, data: object): void;
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

  onRequest(type: DaemonRequestType, data: object): void {
    if (type === this.type) {
      this.resolve?.(data as T);
    } else {
      this.reject?.(new Error('Invalid response type'));
    }
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

    // Validate the message
    if (
      typeof id !== 'string' ||
      typeof cmd !== 'string' ||
      data === undefined ||
      data === null
    ) {
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
      request.onRequest(cmd, data);
    }
  }

  /**
   * Request a link to the daemon
   * @param user request user
   * @returns link
   */
  requestLink(user: string): Promise<string> {
    return this._request<string>(DaemonRequestType.generateLink, user);
  }

  /**
   * Request a panel to the daemon
   * @param user request user
   * @returns panel
   */
  requestPanel(user: string): Promise<PanelData> {
    return this._request<PanelData>(DaemonRequestType.generatePanel, user);
  }

  /**
   * Send a request to the daemon
   * @param cmd request type
   * @param user request user
   * @returns response
   */
  private _request<ResponseType>(
    cmd: DaemonRequestType,
    user: string,
  ): Promise<ResponseType> {
    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      // Register the callback
      const request = new TypedDaemonRequest<ResponseType>(
        cmd,
        (data: ResponseType) => resolve(data),
        (error: Error) => reject(error),
      );
      this._requests[requestId] = request;

      // Send the message
      const requestData: DaemonRequestData = { id: requestId, cmd, user };
      this._ws.send(JSON.stringify(requestData), (err) => {
        if (err) {
          const error = new Error('Failed to send message', err);
          request.reject?.(error);
          reject(error);
        }
      });
    });
  }
}
