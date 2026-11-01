// Число, пригодное для расчётов и вывода: не NaN, не ±Infinity, не null/строка.
export const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
