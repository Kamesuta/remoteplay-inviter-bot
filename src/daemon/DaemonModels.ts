import { UUID } from 'crypto';
import { ClientErrorMessageType } from '../utils/error.js';

/**
 * Error types for the daemon server
 */
export enum DaemonErrorType {
  /** Invalid version */
  invalidVersion = 'invalid_version',
  /** Outdated daemon */
  outdated = 'outdated',
  /** Invalid daemon ID */
  invalidToken = 'invalid_token',
  /** Invalid session ID */
  invalidSession = 'invalid_session',
}

/**
 * Connection error message
 */
interface ConnectionErrorMessageBase {
  /** Error message */
  message?: string;
  /** Error type */
  error: DaemonErrorType;
}

/** When error is outdated */
export interface ConnectionErrorMessageOutdated
  extends ConnectionErrorMessageBase {
  /** Error type */
  error: DaemonErrorType.outdated;
  /** Required version */
  required: string;
  /** Download URL */
  download: string;
}

/**
 * Connection error messages
 */
export type ConnectionErrorMessage =
  | ConnectionErrorMessageBase
  | ConnectionErrorMessageOutdated;

/**
 * Request Type
 */
export enum DaemonCmd {
  /** Announce message */
  message = 'message',
  /** Generate a game id */
  gameId = 'game',
  /** Generate a link request */
  link = 'link',
  /** Exit request */
  exit = 'exit',
  /** Error response */
  error = 'error',
}

/**
 * A data structure to represent a request to the daemon
 */
interface ServerMessageBase {
  /** Request ID */
  id: UUID;
  /** Request user */
  user?: {
    id: string;
    name: string;
  };
  /** Request type */
  cmd: DaemonCmd;
}

/** When cmd is message */
export interface ServerMessageMessage extends ServerMessageBase {
  /** Request type */
  cmd: DaemonCmd.message;
  /** Message text */
  text: string;
  /** Text to copy to clipboard */
  copy?: string;
}

/** When cmd is gameId */
export interface ServerMessageGameId extends ServerMessageBase {
  /** Request type */
  cmd: DaemonCmd.gameId;
}

/** When cmd is link */
export interface ServerMessageLink extends ServerMessageBase {
  /** Request type */
  cmd: DaemonCmd.link;
  /** Game ID */
  game: number;
}

/** When cmd is exit */
export interface ServerMessageExit extends ServerMessageBase {
  /** Request type */
  cmd: DaemonCmd.exit;
}

/**
 * Server messages
 */
export type ServerMessage =
  | ServerMessageMessage
  | ServerMessageGameId
  | ServerMessageLink
  | ServerMessageExit;

/**
 * Server message types
 */
export type ServerMessageType = ServerMessage['cmd'];

/**
 * A data structure to represent a response from the daemon
 */
interface ClientMessageBase {
  /** Request ID */
  id: UUID;
  /** Request type */
  cmd: DaemonCmd;
}

/** When cmd is gameId */
export interface ClientMessageGameId extends ClientMessageBase {
  /** Request type */
  cmd: DaemonCmd.gameId;
  /** Game ID */
  game: number;
}

/** When cmd is link */
export interface ClientMessageLink extends ClientMessageBase {
  /** Request type */
  cmd: DaemonCmd.link;
  /** Invite URL */
  url: string;
}

/** When cmd is error */
export interface ClientMessageError extends ClientMessageBase {
  /** Request type */
  cmd: DaemonCmd.error;
  /** Error code */
  code: ClientErrorMessageType;
}

/**
 * Client messages
 */
export type ClientMessage =
  | ClientMessageGameId
  | ClientMessageLink
  | ClientMessageError;

/**
 * Client message types
 */
export type ClientMessageType = ClientMessage['cmd'];

/**
 * Request message types
 */
export type RequestMessageType = ClientMessageType & ServerMessageType;
