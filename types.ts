import type { TranslationKey } from './services/translations';

export enum Command {
  FORWARD = 'forward',
  BACKWARD = 'backward',
  LEFT = 'left',
  RIGHT = 'right',
  STOP = 'stop',
  UNKNOWN = 'unknown',
}

export interface RobotAction {
  command: Command;
}

export type Theme = 'light' | 'dark';

export interface LanguageOption {
  code: string;
  nameKey: string;
}

export type Page = 'home' | 'settings' | 'terms' | 'privacy';
export type LegalPageType = 'terms' | 'privacy';

export type Status = {
    key: TranslationKey;
    values?: Record<string, string | number>;
} | string;

export type AudioFeedbackMode = 'off' | 'sound' | 'voice';

export interface Settings {
    theme: Theme;
    languageCode: string;
    audioFeedbackMode: AudioFeedbackMode;
}

export const supportedLanguages: LanguageOption[] = [
    { code: 'en-US', nameKey: 'languages.en-US' },
    { code: 'es-ES', nameKey: 'languages.es-ES' },
    { code: 'fr-FR', nameKey: 'languages.fr-FR' },
    { code: 'de-DE', nameKey: 'languages.de-DE' },
    { code: 'hi-IN', nameKey: 'languages.hi-IN' },
    { code: 'ta-IN', nameKey: 'languages.ta-IN' },
    { code: 'ja-JP', nameKey: 'languages.ja-JP' },
];