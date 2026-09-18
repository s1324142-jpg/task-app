import { defaultTheme } from './default';
import { sparklePinkTheme } from './sparklePink';
import { AppTheme, ThemeId } from './types';

export const themes: readonly AppTheme[] = [defaultTheme, sparklePinkTheme];
export const themesById: Record<ThemeId, AppTheme> = { default: defaultTheme, sparklePink: sparklePinkTheme };
export const isThemeId = (value: unknown): value is ThemeId => typeof value === 'string' && value in themesById;
export { defaultTheme, sparklePinkTheme };
export type { AppTheme, ThemeId };
