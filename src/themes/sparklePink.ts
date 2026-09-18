import { AppTheme } from './types';

export const sparklePinkTheme: AppTheme = {
  id: 'sparklePink',
  name: 'Sparkle Pink',
  description: 'きらめくピンクのStudy Planner',
  preview: { colors: ['#FFD6E6', '#F45A9B', '#E9DDFB'], decorations: '♡  ✦  🎀' },
  colors: {
    background: '#FFF8FB', backgroundTop: '#FFD6E6', paper: '#FFFCFD', ink: '#3D2933', muted: '#8E6F7E',
    green: '#F45A9B', pale: '#FFF1F6', border: '#FFD9E7', red: '#D94778', amber: '#B87937', blue: '#74A9C8',
    pink: '#FFB6D2', lavender: '#E9DDFB', navigation: '#FFF9FC', navigationInactive: '#B895A6',
    card: 'rgba(255,255,255,0.92)', accent: '#F45A9B', input: '#FFFCFD',
  },
  backgroundGradient: ['#FFD6E6', '#FFF8FB'],
  radius: { card: 24, button: 18, input: 16, chip: 16 },
  shadow: { color: '#E789B2', opacity: 0.16, radius: 16, elevation: 3 },
  decoration: 'sparkle',
};
