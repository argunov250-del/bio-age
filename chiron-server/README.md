# Хирон: маленькая модель на телефоне

Обычный путь — файл на устройстве, без сервера и без платного GPU. Модель сама не качается: в профиле, раздел «Хирон офлайн», кнопка скачивает слитый GGUF, и дальше чат считает его llama.rn на CPU.

- Файл: `chiron-0.6b-q4_k_m.gguf`, Qwen3-0.6B, Q4_K_M, около 400 МБ
- Основной адрес: `https://huggingface.co/MaksimSun/chiron-gguf/resolve/main/chiron-0.6b-q4_k_m.gguf`
- Зеркало: `https://github.com/argunov250-del/bio-age/releases/download/android-latest/chiron.gguf`

Качалка пишет в папку документов приложения, в профиле показывает процент и умеет продолжить оборванную загрузку. Без Wi‑Fi перед стартом спрашивает подтверждение. Пока файла нет, чат отвечает каталогом и подсказывает скачать модель в настройках. Если модель не ответила за 60 секунд, пузырь тоже берёт каталог, а серая строка снизу называет причину.

`CHIRON_URL` по-прежнему необязателен. Если секрет задан, сборка APK подставляет его, и чат ходит на этот OpenAI-совместимый сервер вместо файла. Пустой адрес файл не отключает.

Папка «Загрузки» и разрешение «все файлы» для этого пути не нужны.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/argunov250-del/bio-age/blob/cursor/update-chiron-server-7ed0/chiron-server/train_colab.ipynb)

## Обучение

Ноль рублей. Colab T4 или одна T4 на Kaggle. Ноутбук `chiron-server/train_colab.ipynb`. База по умолчанию — `Qwen/Qwen3-0.6B`. Токен только из секрета `HF_TOKEN` (Colab: Secrets, Kaggle: Add-ons → Secrets). В файл токен не попадает.

Прогоните все ячейки. Датасет ноутбук берёт из этого репозитория (`chiron-server/data`). Если секрет задан, веса уходят сами:

- адаптер: `MaksimSun/chiron-qwen3-lora`
- GGUF: `MaksimSun/chiron-gguf`, имя файла `chiron-0.6b-q4_k_m.gguf`

Гиперпараметры: QLoRA 4 бита, r=16, alpha=16, dropout=0, длина 1024, batch 1, накопление градиента 8, одна эпоха, lr 2e-4, AdamW 8 бит. Одна эпоха, потому что датасет маленький и вторая легко заучивает каталог. После обучения ноутбук печатает несколько отложенных вопросов и для строк безопасности проверяет слова «врач», «112», «103» или «doctor». `enable_thinking` выключен и в обучении, и в проверке.

Пока репозиторий с весами пуст, ссылка выше ответит 404. Это ожидаемо: файл появится, когда обучение будет выгружено. Зеркало на GitHub Release кладётся тем же именем `chiron.gguf` в релиз `android-latest`.

## Датасет

`npx jest --config chiron-server/jest.config.js` заново пишет `data/train.jsonl` и `data/val.jsonl`. Основа — `answerQuestion` по `lib/coach/qa` (русский и английский, источники, перефразировки). Отказы — готовые сценарии `sensitive` и `cap_diagnose`. Системная фраза одна и та же в датасете и в приложении (`lib/chironPersona.js`).

## Необязательно: свой сервер

Этот раздел не нужен, чтобы Хирон отвечал в приложении. Если позже захочется общий сервер, бесплатные варианты — Oracle Always Free (Ampere A1, 4 OCPU, 24 ГБ) или CPU Space на Hugging Face. На CPU короткий ответ 0.6B обычно укладывается в пару секунд; оценки llama.cpp, не замер этого репозитория: порядка 25–40 ток/с на четырёх ядрах ARM. Модели 1.7B и 4B на тех же ядрах заметно медленнее (1.7B часто 4–8 с на ответ, 4B — 10–20 с), поэтому для бесплатного сервера их лучше не ставить.

```bash
sudo apt update && sudo apt install -y git docker.io
sudo usermod -aG docker "$USER"
# выйти и зайти снова
git clone --depth 1 https://github.com/argunov250-del/bio-age.git
cd bio-age
docker build -t chiron-server chiron-server
docker run -d --name chiron --restart unless-stopped -p 8080:8080 \
  -e CHIRON_KEY='длинная-случайная-строка' \
  -e THREADS=4 \
  -e GGUF_REPO=MaksimSun/chiron-gguf \
  -e GGUF_FILE=chiron-0.6b-q4_k_m.gguf \
  chiron-server
```

Контейнер скачивает GGUF, запускает `llama-server` на 127.0.0.1:8000 и прокси на 8080. Прокси требует `Authorization: Bearer`, режет частоту (`CHIRON_RPM`, по умолчанию 30 в минуту с одного адреса) и не пишет тела запросов в журнал. Собирайте образ на той машине, где он будет работать: `GGML_NATIVE` привязан к процессору.

Снаружи лучше закрыть 8080 и пустить HTTPS через Caddy, проксируя на `127.0.0.1:8080`.

Проверка:

```bash
curl -H "Authorization: Bearer длинная-случайная-строка" \
  http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"chiron","messages":[{"role":"user","content":"Кто ты?"}]}'
```

Запасной бесплатный CPU — Hugging Face Space, Docker. В корень Space положите `Dockerfile`, `entrypoint.sh`, `proxy.js`, `limit.js`. Карточка — `chiron-server/space/README.md`. Секрет Space: `CHIRON_KEY`. Переменная `THREADS=2`.

Телефон в той же сети может вместо встроенной модели звать llama.cpp в Termux. Это запасной путь, не способ по умолчанию: `chiron-server/termux/README.md`.

GitHub → Settings → Secrets → Actions, только если нужен сервер:

- `CHIRON_URL` — публичный адрес прокси, без `/v1` на конце
- `CHIRON_KEY` — та же строка, что в контейнере

## Необязательно: платная видеокарта и vLLM

Если позже появится своя GPU, `Dockerfile.vllm` поднимает vLLM и тот же прокси. Это не часть настройки по умолчанию. На карте класса RTX 4090 короткий ответ 4B часто короче двух секунд (оценка 80–150 ток/с), 8B — около 2–4 секунд (50–100 ток/с). Аренда 24 ГБ на месяц, если не выключать, грубо 220–580 $.
