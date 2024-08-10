import { Replacements } from 'i18n';
import { i18n } from './i18n.js';

/**
 * Translatable error
 */
export class TranslatableError extends Error {
  /**
   * Constructor
   * @param phrase Message key
   * @param replacements Replacement object
   */
  constructor(
    public phrase: string,
    public replacements: Replacements = {},
  ) {
    super();
    this.name = this.constructor.name;
  }

  /**
   * Get the message corresponding to the locale
   * @param locale Locale
   * @returns Message
   */
  getMessage(locale: string): string {
    return i18n.__({ phrase: this.phrase, locale }, this.replacements);
  }
}

/**
 * Error for invalid response type
 */
export class InvalidResponseTypeError extends Error {
  /** Constructor */
  constructor() {
    super('error.invalid_response_type');
  }
}

/**
 * Error for invalid response message
 */
export class InvalidResponseMessageError extends TranslatableError {
  /** Constructor */
  constructor() {
    super('error.invalid_response_message');
  }
}

/**
 * Error for invalid response JSON
 */
export class InvalidResponseJsonError extends TranslatableError {
  /** Constructor */
  constructor() {
    super('error.invalid_response_json');
  }
}

/**
 * Error for failed request sending
 */
export class SendRequestError extends TranslatableError {
  /** Constructor */
  constructor() {
    super('error.send_request_failed');
  }
}

/**
 * Client error messages
 */
export enum ClientErrorMessageType {
  /* eslint-disable @typescript-eslint/naming-convention */
  unknown = 'error.daemon_unknown',
  invalid_cmd = 'error.daemon_invalid_cmd',
  invalid_app = 'error.daemon_invalid_app',
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Error for error messages
 */
export class ClientError extends TranslatableError {
  /**
   * Constructor
   * @param message Error message
   */
  constructor(message: ClientErrorMessageType) {
    super(message);
  }

  /**
   * Generate an error message error from a string
   * @param error Key of ClientErrorMessageType
   * @returns Error message error
   */
  static fromType(error: string): ClientError {
    if (error in ClientErrorMessageType) {
      return new ClientError(
        ClientErrorMessageType[error as keyof typeof ClientErrorMessageType],
      );
    } else {
      return new ClientError(ClientErrorMessageType.unknown);
    }
  }
}
