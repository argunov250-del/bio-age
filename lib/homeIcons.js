// Тонкие иконки «Обзора» (react-native-svg): сон, шаги, пульс, сердце, молния, плюс.
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const P = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
const icon = (d, extra) => function Icon({ color, size = 20, sw = 1.6 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} {...P} strokeWidth={sw} />
      {extra ? extra(color, sw) : null}
    </Svg>
  );
};

export const IconMoon = icon('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z');
export const IconSteps = icon('M8 4c2 0 3 2 3 4.5S10 12 8 12 5 10.5 5 8s1-4 3-4zM7 15h4l-.5 3.5a1.5 1.5 0 0 1-3 0zM17 9c2 0 3 2 3 4.5S19 17 17 17s-3-1.5-3-3.5 1-4.5 3-4.5zM16 20h4');
export const IconHeart = icon('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z');
export const IconPulse = icon('M3 12h4l2-6 4 12 2-6h6');
export const IconBolt = icon('M13 3 5 13h6l-1 8 8-10h-6z');
export const IconPlus = icon('M12 5v14M5 12h14');
export const IconCalendar = icon('M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4');
