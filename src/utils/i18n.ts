import { Locale, LocalizationMap } from 'discord.js';
import { HashedList, I18n } from 'i18n';
import pick from 'lodash/pick';
import path from 'path';
import * as yaml from 'yaml';
import { getBasedirPath } from './basedir.js';

/**
 * i18n configuration
 */
export const i18n = new I18n({
  locales: ['en', 'ja'],
  fallbacks: {
    // Fall back to 'en' for all other locales
    ...Object.values(Locale)
      .map((locale) => ({ [locale]: 'en' }))
      .reduce((a, b) => ({ ...a, ...b })),
    // Special
    [Locale.Japanese]: 'ja',
  },
  directory: path.join(getBasedirPath('locales')),
  objectNotation: true,
  parser: yaml,
  updateFiles: false,
  extension: '.yml',
});

/**
 * i18n for Discord slash command description
 * @param phrase Phrase
 * @returns Discord slash command description localization
 */
export function forDiscord(phrase: string): LocalizationMap {
  const hashedList: HashedList[] = i18n.__h(phrase);
  return pick(Object.assign({}, ...hashedList), Object.values(Locale));
}
