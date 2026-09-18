import { AppTheme } from './types';

export const defaultTheme: AppTheme = {
  id: 'default',
  name: 'デフォルト',
  description: '落ち着いたグリーンと紙のような温かい背景',
  preview: { colors: ['#FFF8F3', '#3A806D', '#E6F4EC'], decorations: 'STUDY · SIMPLE' },
  colors: {
    background: '#FFF8F3', backgroundTop: '#FFF8F3', paper: '#FFFFFF', ink: '#293B37', muted: '#7F8883',
    green: '#3A806D', pale: '#E6F4EC', border: '#F0E5DF', red: '#C86459', amber: '#B07A38', blue: '#668BB2',
    pink: '#F7D9D5', lavender: '#E9E2F6', navigation: '#FFFFFF', navigationInactive: '#7F8883',
    card: '#FFFFFF', accent: '#3A806D', input: '#FFFFFF',
  },
  radius: { card: 22, button: 13, input: 12, chip: 12 },
  shadow: { color: '#BFA99B', opacity: 0.09, radius: 12, elevation: 2 },
  decoration: 'none',
};
