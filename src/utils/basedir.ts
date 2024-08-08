import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename);

/** Path to the root directory */
export const basedir = resolve(__dirname, '../..');

/**
 * Get a path relative to the base directory
 * @param path Relative path from the base directory
 * @returns The path
 */
export function getBasedirPath(path: string): string {
  return join(basedir, path);
}
