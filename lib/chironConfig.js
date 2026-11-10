// Адрес сервера Хирона. Пустые строки — приложение отвечает каталогом и в сеть не ходит.
// Ключ в репозиторий не кладём. Сборка APK подставляет secrets.CHIRON_URL и secrets.CHIRON_KEY.
export const CHIRON_URL = '';
export const CHIRON_KEY = '';
// true — грузить GGUF на телефоне через llama.rn. Обычный путь этого не делает.
export const CHIRON_LOCAL = false;
