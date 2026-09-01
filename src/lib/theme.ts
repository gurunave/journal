import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

import type { Sentiment } from './types';

/**
 * The design language is a ledger: ink on paper, organised by rules rather than
 * boxes. Colours are named for what they are in that world — paper, rule, ink —
 * so a screen never reaches for a raw hex.
 *
 * Sentiment uses archival ink tones (verdigris, graphite, oxblood) rather than
 * traffic-light colours: this is a record someone keeps, not an alert system.
 */
export type Palette = {
  paper: string;
  raised: string;
  sunken: string;
  rule: string;
  ruleStrong: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  positive: string;
  neutral: string;
  concern: string;
  danger: string;
  /** Sits on top of an accent-filled surface. */
  onAccent: string;
};

const light: Palette = {
  paper: '#F4F5F2',
  raised: '#FFFFFF',
  sunken: '#EAECE7',
  rule: '#DCDFD8',
  ruleStrong: '#C3C8BE',
  ink: '#151A1D',
  inkSoft: '#4E585E',
  inkFaint: '#828C91',
  accent: '#2B5F8A',
  accentSoft: '#E4EBF2',
  accentInk: '#1F4A6D',
  positive: '#2E6F5E',
  neutral: '#6A757A',
  concern: '#9B3A32',
  danger: '#9B3A32',
  onAccent: '#FFFFFF',
};

const dark: Palette = {
  paper: '#0F1416',
  raised: '#171E21',
  sunken: '#0A0E10',
  rule: '#232B2E',
  ruleStrong: '#374246',
  ink: '#E8EAE6',
  inkSoft: '#9BA5A8',
  inkFaint: '#6E787C',
  accent: '#8AB8DC',
  accentSoft: '#1B2A36',
  accentInk: '#A9CDEA',
  positive: '#6FBFA3',
  neutral: '#97A3A7',
  concern: '#E0776C',
  danger: '#E0776C',
  onAccent: '#0F1416',
};

export const fonts = {
  /** Editorial serif: prose someone wrote, and figures worth reading as figures. */
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemi: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  /** Interface voice. */
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
  /** Instrumentation: dates, counts, labels. */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
};

/** A type scale, used as-is rather than improvised per screen. */
export const type = {
  display: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.serifMedium, fontSize: 24, lineHeight: 29, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  prose: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  /** Uppercase mono, letterspaced — the ledger's column headings. */
  eyebrow: { fontFamily: fonts.monoMedium, fontSize: 10.5, letterSpacing: 1.4 },
  meta: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 0.2 },
  figure: { fontFamily: fonts.serifMedium, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 };

/** Radii are small and few: this is paper, not glass. */
export const radius = { sm: 3, md: 5, lg: 8, pill: 999 };

export type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  sentiment: Record<Sentiment, string>;
};

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return useMemo(() => {
    const c = scheme === 'dark' ? dark : light;
    return {
      scheme,
      c,
      sentiment: { positive: c.positive, neutral: c.neutral, concern: c.concern },
    };
  }, [scheme]);
}

export const sentimentLabel: Record<Sentiment, string> = {
  positive: 'Win',
  neutral: 'Note',
  concern: 'Concern',
};

/**
 * Sentiment is marked with a rule of varying weight rather than an icon: a win
 * reads as a firm stroke, a concern as a broken one.
 */
export const sentimentMark: Record<Sentiment, string> = {
  positive: '▍',
  neutral: '│',
  concern: '╎',
};

/** Muted ink washes, so a wall of avatars does not turn into confetti. */
const AVATAR_INKS = [
  '#3E6B8C', '#4A7A63', '#8A6A3E', '#6B5A8C',
  '#8C5450', '#3F7178', '#7A5F72', '#5F7A4A',
];

export function avatarInk(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_INKS[hash % AVATAR_INKS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
