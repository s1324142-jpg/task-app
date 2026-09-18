import type { ImageSourcePropType } from 'react-native';

export type ThemeId = 'default' | 'sparklePink';

export type AppTheme = {
  id: ThemeId;
  name: string;
  description: string;
  preview: { colors: readonly [string, string, string]; decorations: string };
  colors: {
    background: string; backgroundTop: string; paper: string; ink: string; muted: string;
    green: string; pale: string; border: string; red: string; amber: string; blue: string;
    pink: string; lavender: string; navigation: string; navigationInactive: string;
    card: string; accent: string; input: string;
  };
  backgroundGradient?: readonly [string, string];
  backgroundImage?: ImageSourcePropType;
  mascotImage?: ImageSourcePropType;
  radius: { card: number; button: number; input: number; chip: number };
  shadow: { color: string; opacity: number; radius: number; elevation: number };
  decoration: 'none' | 'sparkle';
};
