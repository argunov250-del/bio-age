// Мост «совет → чат с Хироном»: App регистрирует функцию, открывающую вкладку Хирона,
// а карточки советов (ChironTip) вызывают её по нажатию, не зная о навигации.
let opener = null;
export const setChironOpener = (fn) => { opener = typeof fn === 'function' ? fn : null; };
export const canOpenChiron = () => !!opener;
export const openChiron = () => { if (opener) opener(); };

// Тема, с которой открыт чат (раздел вопросов: 'sleep', 'recovery', 'training'…): экран Хирона один раз
// забирает её и ставит подсказки из этого раздела.
let topic = null;
export const setChironTopic = (t) => { topic = typeof t === 'string' && t ? t : null; };
export const takeChironTopic = () => { const t = topic; topic = null; return t; };
