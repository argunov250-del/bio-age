// Пустой CHIRON_URL — модель на телефоне (скачивание GGUF и llama.rn).
// Непустой — сервер OpenAI-совместимый, без /v1 на конце.
// Ключ в репозиторий не кладём. Сборка APK подставляет secrets.CHIRON_URL и secrets.CHIRON_KEY.
export const CHIRON_URL = '';
export const CHIRON_KEY = '';
export const CHIRON_GGUF_URL = 'https://huggingface.co/MaksimSun/chiron-gguf/resolve/main/chiron-0.6b-q4_k_m.gguf';
export const CHIRON_GGUF_MIRROR = 'https://github.com/argunov250-del/bio-age/releases/download/android-latest/chiron.gguf';
export const CHIRON_MODEL_FILE = 'chiron-0.6b-q4_k_m.gguf';
