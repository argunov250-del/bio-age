// Палитра текущей вкладки: компоненты берут цвета отсюда, а не из констант.
import { createContext, useContext } from 'react';
import { COLORS } from './theme';

export const ColorsContext = createContext(COLORS);
export const useColors = () => useContext(ColorsContext);
