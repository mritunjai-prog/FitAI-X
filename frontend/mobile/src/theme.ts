export const DarkColors = {
  bg: '#08080A',
  surface: 'rgba(22, 22, 22, 0.65)', 
  surfaceHigh: 'rgba(46, 42, 30, 0.7)',
  glassInset: 'rgba(16, 16, 16, 0.8)',
  primary: '#F5C400',
  primaryDim: '#CA8A04',
  onPrimary: '#241B00',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#A9A395',
  outline: 'rgba(154, 144, 120, 0.4)',
  outlineVariant: 'rgba(78, 70, 50, 0.5)',
  border: 'rgba(245, 196, 0, 0.1)',
  error: '#EF4444',
  success: '#A3E635',
  cyan: '#7DD3FC', 
  blurTint: 'dark' as const,
};

export const LightColors = {
  bg: '#F4F3EF',
  surface: 'rgba(255, 255, 255, 0.7)', 
  surfaceHigh: 'rgba(255, 255, 255, 0.9)',
  glassInset: 'rgba(235, 235, 240, 0.8)',
  primary: '#8A6400', 
  primaryDim: '#6E5000',
  onPrimary: '#231A00',
  onSurface: '#15130F',
  onSurfaceVariant: '#5F594C',
  outline: 'rgba(0, 0, 0, 0.15)',
  outlineVariant: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(138, 100, 0, 0.2)',
  error: '#FF3B30',
  success: '#5E8B00',
  cyan: '#0E7490', 
  blurTint: 'light' as const,
};

export type ThemeColors = typeof DarkColors | typeof LightColors;

export const F = {
  header: 'SpaceGrotesk_700Bold',
  num: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
};
