import { createContext, useContext } from 'react';

import type { Sentiment } from './types';

/**
 * A theme is a colour set and a shape set together, because the two are not
 * independent: Brutalist without its hard borders is just a yellow palette, and
 * Soft clay without its large radii is just lilac. Screens read both from here
 * and never reach for a raw hex or a literal radius.
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

export type Shape = {
  /** Cards and raised surfaces. */
  card: number;
  /** Segmented controls, inputs, chips that are not pills. */
  control: number;
  /** Buttons. */
  btn: number;
  /** Chips and tags; 999 reads as a pill. */
  chip: number;
  /** 0 means the theme separates surfaces by fill rather than by line. */
  borderW: number;
  /** A flat offset shadow instead of a soft blurred one. */
  hard: boolean;
};

export type ThemeDef = {
  id: string;
  name: string;
  blurb: string;
  dark: boolean;
  c: Palette;
  shape: Shape;
};

/* ------------------------------------------------------------- helpers --- */

function hex(v: string): [number, number, number] {
  const n = parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix toward black (amount < 0) or white (amount > 0), for derived tones. */
function shade(color: string, amount: number): string {
  const [r, g, b] = hex(color);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (x: number) => Math.round((t - x) * p + x);
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

type Draft = {
  id: string;
  name: string;
  blurb: string;
  dark?: boolean;
  paper: string; raised: string; sunken: string; rule: string;
  ink: string; inkSoft: string; inkFaint: string;
  accent: string; accentSoft: string; onAccent: string;
  win: string; note: string; concern: string;
  shape?: Partial<Shape>;
};

const DEFAULT_SHAPE: Shape = { card: 14, control: 11, btn: 13, chip: 999, borderW: 1, hard: false };

function build(d: Draft): ThemeDef {
  const dark = !!d.dark;
  return {
    id: d.id,
    name: d.name,
    blurb: d.blurb,
    dark,
    shape: { ...DEFAULT_SHAPE, ...d.shape },
    c: {
      paper: d.paper,
      raised: d.raised,
      sunken: d.sunken,
      rule: d.rule,
      // A heavier rule for the few places that need to separate rather than hint.
      ruleStrong: shade(d.rule, dark ? 0.18 : -0.18),
      ink: d.ink,
      inkSoft: d.inkSoft,
      inkFaint: d.inkFaint,
      accent: d.accent,
      accentSoft: d.accentSoft,
      accentInk: d.accent,
      positive: d.win,
      neutral: d.note,
      concern: d.concern,
      danger: d.concern,
      onAccent: d.onAccent,
    },
  };
}

/* -------------------------------------------------------------- themes --- */

export const THEMES: ThemeDef[] = [
  build({
    id: 'warm-archive', name: 'Warm archive', blurb: 'Bone paper, near-black ink, terracotta',
    paper: '#FAF7F2', raised: '#FFFFFF', sunken: '#F0EBE2', rule: '#E4DCCF',
    ink: '#1A1714', inkSoft: '#5B5248', inkFaint: '#948A7C',
    accent: '#B2481F', accentSoft: '#F8E8E0', onAccent: '#FFFFFF',
    win: '#2C6E49', note: '#8A7B67', concern: '#8E2F44',
  }),
  build({
    id: 'cobalt', name: 'Cobalt', blurb: 'Cool white, ink black, saturated blue',
    paper: '#F6F8FB', raised: '#FFFFFF', sunken: '#EBEFF6', rule: '#DBE2ED',
    ink: '#0D1220', inkSoft: '#4A5468', inkFaint: '#8A93A5',
    accent: '#2647E0', accentSoft: '#E4E9FD', onAccent: '#FFFFFF',
    win: '#127A50', note: '#5B6478', concern: '#C62B2B',
  }),
  build({
    id: 'pressed-green', name: 'Pressed green', blurb: 'Chalk, black-green ink, deep forest',
    paper: '#F5F6F1', raised: '#FFFFFF', sunken: '#E9ECE2', rule: '#D9DECE',
    ink: '#0F1510', inkSoft: '#4C574C', inkFaint: '#87927F',
    accent: '#16543A', accentSoft: '#E2EDE5', onAccent: '#FFFFFF',
    win: '#3E9A5F', note: '#6C7568', concern: '#A33224',
  }),
  build({
    id: 'material', name: 'Material 3', blurb: 'Android native — tonal surfaces',
    paper: '#FEF7FF', raised: '#F6EDF7', sunken: '#EADDFF', rule: '#CAC4D0',
    ink: '#1D1B20', inkSoft: '#49454F', inkFaint: '#79747E',
    accent: '#6750A4', accentSoft: '#EADDFF', onAccent: '#FFFFFF',
    win: '#1F6B4B', note: '#6B5E77', concern: '#B3261E',
    shape: { card: 16, control: 999, btn: 16, chip: 8, borderW: 0 },
  }),
  build({
    id: 'ios', name: 'iOS grouped', blurb: 'Inset list cards, system blue',
    paper: '#F2F2F7', raised: '#FFFFFF', sunken: '#E5E5EA', rule: '#D8D8DD',
    ink: '#000000', inkSoft: '#3C3C43', inkFaint: '#8E8E93',
    accent: '#007AFF', accentSoft: '#E4F0FF', onAccent: '#FFFFFF',
    win: '#248A3D', note: '#8E8E93', concern: '#D70015',
    shape: { card: 12, control: 9, btn: 25, chip: 999, borderW: 0 },
  }),
  build({
    id: 'night', name: 'Night', blurb: 'Dark-first app, vivid accent', dark: true,
    paper: '#0E0F13', raised: '#191B22', sunken: '#23262F', rule: '#2E323C',
    ink: '#F2F4F8', inkSoft: '#A6ADBB', inkFaint: '#6C7480',
    accent: '#4C8DFF', accentSoft: '#17233B', onAccent: '#08111F',
    win: '#3DD68C', note: '#8A93A5', concern: '#FF6B6B',
    shape: { borderW: 0 },
  }),
  build({
    id: 'bold-ink', name: 'Bold ink', blurb: 'Heavy type, white sheet, black marks',
    paper: '#FFFFFF', raised: '#FFFFFF', sunken: '#F1F2F4', rule: '#E4E6EA',
    ink: '#0B0C0E', inkSoft: '#4B5058', inkFaint: '#9AA0A8',
    accent: '#0B0C0E', accentSoft: '#EDEEF0', onAccent: '#FFFFFF',
    win: '#0E8A4F', note: '#7A8088', concern: '#D8382C',
    shape: { card: 16, control: 12, btn: 14, chip: 999, borderW: 0 },
  }),
  build({
    id: 'brutalist', name: 'Brutalist', blurb: 'Hard borders, flat shadows, primary colour',
    paper: '#FFFDF3', raised: '#FFFFFF', sunken: '#FFF1B8', rule: '#121212',
    ink: '#121212', inkSoft: '#3A3A3A', inkFaint: '#6B6B6B',
    accent: '#2B2BE8', accentSoft: '#FFE94A', onAccent: '#FFFFFF',
    win: '#0B7A3B', note: '#6B6B6B', concern: '#DC2626',
    shape: { card: 4, control: 4, btn: 4, chip: 4, borderW: 2, hard: true },
  }),
  build({
    id: 'soft-clay', name: 'Soft clay', blurb: 'Big radii, lilac, airy and rounded',
    paper: '#F7F4FB', raised: '#FFFFFF', sunken: '#EFEAF7', rule: '#E5DEF2',
    ink: '#211B2E', inkSoft: '#5C5470', inkFaint: '#948CA8',
    accent: '#7C5CD6', accentSoft: '#EBE3FC', onAccent: '#FFFFFF',
    win: '#2E8B6B', note: '#8B84A0', concern: '#C4456B',
    shape: { card: 22, control: 16, btn: 20, chip: 999, borderW: 0 },
  }),
  build({
    id: 'dense-pro', name: 'Dense pro', blurb: 'Compact, hairline rules, more on screen',
    paper: '#FFFFFF', raised: '#FFFFFF', sunken: '#F4F5F7', rule: '#E3E5E9',
    ink: '#16181D', inkSoft: '#5A606B', inkFaint: '#9198A3',
    accent: '#4338CA', accentSoft: '#EEEDFB', onAccent: '#FFFFFF',
    win: '#0F7B4F', note: '#6B7280', concern: '#C0322B',
    shape: { card: 8, control: 6, btn: 8, chip: 6, borderW: 1 },
  }),
  build({
    id: 'mono-olive', name: 'Mono + olive', blurb: 'Near-monochrome with one live colour',
    paper: '#F7F7F5', raised: '#FFFFFF', sunken: '#ECECE8', rule: '#DCDCD6',
    ink: '#0A0A0A', inkSoft: '#4A4A48', inkFaint: '#8A8A85',
    accent: '#5C7A16', accentSoft: '#EDF4DA', onAccent: '#FFFFFF',
    win: '#166534', note: '#6B7280', concern: '#B91C1C',
    shape: { card: 12, control: 10, btn: 12, chip: 999, borderW: 1 },
  }),
  build({
    id: 'deep-violet', name: 'Deep violet', blurb: 'True-black OLED, violet accent', dark: true,
    paper: '#000000', raised: '#111114', sunken: '#1C1C22', rule: '#26262E',
    ink: '#F5F5F7', inkSoft: '#A1A1AA', inkFaint: '#6B6B75',
    accent: '#8B5CF6', accentSoft: '#231A3D', onAccent: '#FFFFFF',
    win: '#34D399', note: '#8A8A96', concern: '#FB7185',
    shape: { card: 16, control: 12, btn: 14, chip: 999, borderW: 0 },
  }),
];

export const DEFAULT_THEME_ID = 'warm-archive';

export function themeById(id: string | null | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/* ---------------------------------------------------------------- type --- */

export const fonts = {
  sans: 'Roboto_400Regular',
  sansMedium: 'Roboto_500Medium',
  sansSemi: 'Roboto_700Bold',
  mono: 'Roboto_400Regular',
  monoMedium: 'Roboto_500Medium',
  /** Kept as aliases so screens written against the old names still compile. */
  serif: 'Roboto_400Regular',
  serifMedium: 'Roboto_500Medium',
  serifSemi: 'Roboto_700Bold',
  serifItalic: 'Roboto_400Regular',
};

/** A type scale, used as-is rather than improvised per screen. */
export const type = {
  display: { fontFamily: fonts.sansSemi, fontSize: 27, lineHeight: 33, letterSpacing: -0.4 },
  title: { fontFamily: fonts.sansSemi, fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  prose: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 23 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  /** A section label. Sentence case — shouting every heading read as generated. */
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 0 },
  meta: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0 },
  figure: { fontFamily: fonts.sansSemi, fontSize: 28, lineHeight: 33, letterSpacing: -0.5 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 };

/** Legacy radius scale. Prefer the active theme's `shape`. */
export const radius = { sm: 3, md: 5, lg: 8, pill: 999 };

export type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  shape: Shape;
  def: ThemeDef;
  sentiment: Record<Sentiment, string>;
};

function toTheme(def: ThemeDef): Theme {
  return {
    scheme: def.dark ? 'dark' : 'light',
    c: def.c,
    shape: def.shape,
    def,
    sentiment: { positive: def.c.positive, neutral: def.c.neutral, concern: def.c.concern },
  };
}

/**
 * Defaulted rather than nullable, so a component rendered above the provider —
 * the splash frame, the setup notice — still has colours instead of crashing.
 */
export const ThemeContext = createContext<Theme>(toTheme(THEMES[0]));

export function themeFor(id: string | null | undefined): Theme {
  return toTheme(themeById(id));
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
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
