---
title: Chiron
emoji: 🟢
colorFrom: green
colorTo: gray
sdk: docker
app_port: 8080
pinned: false
---

# Бесплатный CPU Space для Хирона

Это запасной сервер. Обычный путь — модель на телефоне, файл `chiron-0.6b-q4_k_m.gguf`. Space засыпает, первый ответ после паузы ждёт старта.

Соберите Space из файлов `chiron-server/Dockerfile`, `entrypoint.sh`, `proxy.js`, `limit.js` (Dockerfile должен лежать в корне Space). В секретах Space задайте `CHIRON_KEY`. Потоки: `THREADS=2`. Модель качается из `MaksimSun/chiron-gguf`, файл `chiron-0.6b-q4_k_m.gguf`.
