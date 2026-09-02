import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * A small hand-drawn set rather than an icon package: the app needs eight
 * glyphs, and pulling in a library would ship a font for them and make every
 * screen look like everyone else's. Single-path, 24px grid, stroked so they
 * take the ink colour of whatever theme is active.
 */
export const ICONS = {
  win: 'M12 4l2.3 5 5.2.6-3.9 3.6 1.1 5.2L12 15.8 7.3 18.4l1.1-5.2L4.5 9.6l5.2-.6z',
  note: 'M5 6h14M5 12h14M5 18h9',
  concern: 'M12 4.5l8.5 15h-17zM12 10v4M12 17.2v.1',
  clock: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 7v5.2l3.4 2',
  camera: 'M4 8.5h3l1.5-2h7L17 8.5h3v10H4zM12 16.2a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5.5v13M5.5 12h13',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  color,
  size = 20,
  weight = 1.8,
}: {
  name: IconName;
  color: string;
  size?: number;
  weight?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={ICONS[name]}
        stroke={color}
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
