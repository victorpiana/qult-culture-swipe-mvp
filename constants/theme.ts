import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const COLORS = {
  bg: '#000000',
  surface: '#121214',
  surfaceElevated: '#18181b',
  border: '#27272a',
  borderSubtle: '#1e1e24',
  
  primary: '#4ade80', // QULT signature neon green
  primaryLight: '#86efac',
  primaryGlow: 'rgba(74, 222, 128, 0.25)',
  
  secondary: '#ff2d55', // Heart / like
  correct: '#10b981',
  wrong: '#ef4444',
  orange: '#f59e0b',
  blue: '#38bdf8',
  purple: '#a855f7',
  gold: '#fbbf24',
  
  text: '#ffffff',
  textSub: '#d4d4d8',
  textMuted: '#a1a1aa',
  textDark: '#71717a',
  
  chatBubbleSelf: '#22c55e',
  chatBubbleFriend: '#27272a',
  overlay: 'rgba(0, 0, 0, 0.85)',
};

export const METRICS = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  tabBarHeight: 85,
  borderRadius: 16,
};
