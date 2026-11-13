// Палитра текущей вкладки: компоненты берут цвета отсюда, а не из констант.
import { createContext, useContext } from 'react';
import { COLORS } from './theme';

export const ColorsContext = createContext(COLORS);
export const useColors = () => useContext(ColorsContext);

// Поверхность, на которой лежит текст: 'photo' — прямо на фото-фоне (Screen), 'card' — внутри
// карточки, плитки, листа. На фото T/Body/Note/Label и др. берут c.onBg / c.onBgSub.
export const SurfaceContext = createContext('card');
export const useSurface = () => useContext(SurfaceContext);
// ink(c, surface) → { text, sub } для текста на этой поверхности.
export const ink = (c, surface) => (surface === 'photo' ? { text: c.onBg, sub: c.onBgSub } : { text: c.text, sub: c.sub });
export function useInk() { return ink(useColors(), useSurface()); }
