// Мост «совет → чат с Хироном»: App регистрирует функцию, открывающую вкладку Хирона,
// а карточки советов (ChironTip) вызывают её по нажатию, не зная о навигации.
let opener = null;
export const setChironOpener = (fn) => { opener = typeof fn === 'function' ? fn : null; };
export const canOpenChiron = () => !!opener;
export const openChiron = () => { if (opener) opener(); };
