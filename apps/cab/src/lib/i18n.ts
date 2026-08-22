import en from '../locales/en.json';
import id from '../locales/id.json';

export type Locale = 'en' | 'id';
export type Dictionary = typeof en;

export function useTranslation(locale: Locale): Dictionary {
  return locale === 'id' ? id : en;
}
