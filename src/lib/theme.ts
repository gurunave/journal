import type { Sentiment } from './types';

export const colors = {
  bg: '#0B0D12',
  surface: '#141821',
  surfaceAlt: '#1B2130',
  border: '#252C3B',
  text: '#F2F5FA',
  textDim: '#8E99AE',
  textFaint: '#5C6679',
  accent: '#5B8CFF',
  accentDim: '#22304F',
  positive: '#3FCF8E',
  neutral: '#8E99AE',
  concern: '#FF7A6B',
  danger: '#FF5C5C',
};

export const sentimentColor: Record<Sentiment, string> = {
  positive: colors.positive,
  neutral: colors.neutral,
  concern: colors.concern,
};

export const sentimentLabel: Record<Sentiment, string> = {
  positive: 'Win',
  neutral: 'Note',
  concern: 'Concern',
};

export const sentimentIcon: Record<Sentiment, string> = {
  positive: '▲',
  neutral: '●',
  concern: '▼',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

/** Stable per-reportee avatar colour so faces are recognisable at a glance. */
const AVATAR_COLORS = [
  '#5B8CFF',
  '#3FCF8E',
  '#FFB84D',
  '#C77DFF',
  '#FF7A6B',
  '#4DD0E1',
  '#F06292',
  '#9CCC65',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
