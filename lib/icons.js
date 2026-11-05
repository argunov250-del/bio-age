// Иконки вкладок (react-native-svg), цвет задаётся снаружи.
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const P = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconHome({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

export function IconActivity({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 12h4l2-6 4 12 2-6h6" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

export function IconProfile({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" stroke={color} {...P} strokeWidth={sw} />
      <Path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

export function IconWorkout({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

// Хирон — кентавр-лучник: лук со стрелой.
export function IconChiron({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4c9 2.5 9 13.5 0 16M7 12h13M17 9l3 3-3 3" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

// Рост — росток.
export function IconGrowth({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21v-9M12 12c0-4 3-6.5 8-6.5 0 4-3 6.5-8 6.5zM12 15c0-3-2-5-6.5-5 0 3 2.5 5 6.5 5z" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}

// Замок — для закрытых образов.
export function IconLock({ color, size = 20, sw = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3" stroke={color} {...P} strokeWidth={sw} />
    </Svg>
  );
}
