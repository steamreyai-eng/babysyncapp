/**
 * BabySync — Centralized Design Tokens
 * Matches web version (baby-log-main) CSS variables from index.css
 */

export const COLORS = {
  // ── Core palette ──
  background: '#FAFBFC',
  foreground: '#1A1A2E',
  card: '#FFFFFF',
  cardForeground: '#1A1A2E',

  // ── Brand primary ──
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  secondary: '#3B82F6',

  // ── Accent & utility ──
  accent: '#F97316',
  purple: '#8B5CF6',
  purpleLight: '#C084FC',
  green: '#059669',
  greenLight: '#D1FAE5',
  teal: '#3DBFAA',
  red: '#EF4444',

  // ── FAB ──
  fab: '#3DBFAA',
  fabActive: '#2DA08E',
  fabBorder: '#FFFFFF',
  fabShadow: 'rgba(61,191,170,0.45)',

  // ── Shift panel gradient ──
  shiftStart: '#2563EB',
  shiftEnd: '#3B82F6',

  // ── Bottom nav ──
  navActive: '#2563EB',
  navIdle: '#64748B',
  navBg: 'rgba(255,255,255,0.95)',
  navBorder: 'rgba(240,240,246,0.8)',

  // ── Borders ──
  borderLight: '#E2E8F0',
  borderCard: '#E5E7EB',

  // ── Category colors (per-tracker) ──
  feeding: { bg: '#EBF3FB', icon: '#4A90D9', border: '#DCEBFA' },
  sleep: { bg: '#F2EEF8', icon: '#7C5CBF', border: '#E7E0F3' },
  diaper: { bg: '#EDF7F3', icon: '#52B788', border: '#DBF0E7' },
  health: { bg: '#FDEDEA', icon: '#E76F51', border: '#FCE0DA' },
  growth: { bg: '#EBF1F5', icon: '#457B9D', border: '#DCE5ED' },
  walk: { bg: '#FEF6ED', icon: '#F4A261', border: '#FDEBDC' },
  shifts: { bg: '#EBF3FB', icon: '#4A90D9', border: '#DCEBFA' },
  doctor: { bg: '#FDEDEA', icon: '#E76F51', border: '#FCE0DA' },

  // ── Text ──
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textCaption: '#5A5A6E',

  // ── Gradients (used with LinearGradient) ──
  gradientPrimary: ['#2563EB', '#3B82F6'] as const,
  gradientAI: ['#6366F1', '#8B5CF6'] as const,
  gradientHealth: ['#EF4444', '#F59E0B'] as const,
  gradientGrowth: ['#10B981', '#059669'] as const,
  gradientHero: ['#0F766E', '#14B8A6', '#2DD4BF'] as const,

  // ── Shadows (elevation) ──
  shadowCard: '#000000',
  shadowPrimary: 'rgba(78,143,212,0.35)',
  shadowFab: 'rgba(61,191,170,0.45)',
};

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  surface: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  fab: {
    shadowColor: 'rgba(61,191,170,0.45)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  button: 14,
};

export const FONTS = {
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
  display: 'PlusJakartaSans_800ExtraBold',
};
