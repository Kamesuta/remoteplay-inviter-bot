import { logger } from './log.js';
import { Request, Response } from 'express';

/**
 * Sleep function
 * @param msec Waiting time (in milliseconds)
 * @returns Promise
 */
export const sleep = (msec: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, msec));

/**
 * Converts an asynchronous function functor to a functor that returns void.
 * Useful when there is no need to wait for the asynchronous function.
 * The return value is discarded, and any errors are logged.
 * @param func The asynchronous function functor
 * @returns A void-returning asynchronous function functor
 */
export function nowait<T extends (...args: never[]) => Promise<unknown>>(
  func: T,
): (...args: Parameters<T>) => void {
  return (...args) => {
    func(...args).catch((error) => {
      logger.error(error);
    });
  };
}

/**
 * Converts an asynchronous function functor to a functor that returns void for use in Express middleware.
 * @param fn The asynchronous function functor
 * @returns An Express middleware function functor
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: () => void): void => {
    void fn(req, res).catch(next);
  };
}
