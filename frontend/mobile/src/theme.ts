export const DarkColors = {
  bg: '#050505',
  surface: 'rgba(22, 22, 22, 0.65)', 
  surfaceHigh: 'rgba(46, 42, 30, 0.7)',
  glassInset: 'rgba(16, 16, 16, 0.8)',
  primary: '#f5c400',
  primaryDim: '#b38d00',
  onPrimary: '#3d2f00',
  onSurface: '#ebe1d0',
  onSurfaceVariant: '#B0AA9A',
  outline: 'rgba(154, 144, 120, 0.4)',
  outlineVariant: 'rgba(78, 70, 50, 0.5)',
  border: 'rgba(245, 196, 0, 0.1)',
  error: '#EF4444',
  success: '#A3E635',
  cyan: '#00F0FF', 
  blurTint: 'dark' as const,
};

export const LightColors = {
  bg: '#F5F5F7',
  surface: 'rgba(255, 255, 255, 0.7)', 
  surfaceHigh: 'rgba(255, 255, 255, 0.9)',
  glassInset: 'rgba(235, 235, 240, 0.8)',
  primary: '#e6b300', 
  primaryDim: '#c49a00',
  onPrimary: '#ffffff',
  onSurface: '#1D1D1F',
  onSurfaceVariant: '#86868B',
  outline: 'rgba(0, 0, 0, 0.15)',
  outlineVariant: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(230, 179, 0, 0.2)',
  error: '#FF3B30',
  success: '#34C759',
  cyan: '#32ADE6', 
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
