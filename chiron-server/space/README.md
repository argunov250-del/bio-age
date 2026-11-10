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

Это запасной вариант. Основной — виртуальная машина Oracle Always Free. Space засыпает, первый ответ после паузы ждёт старта.

Соберите Space из файлов `chiron-server/Dockerfile`, `entrypoint.sh`, `proxy.js`, `limit.js` (Dockerfile должен лежать в корне Space). В секретах Space задайте `CHIRON_KEY`. Потоки: `THREADS=2`. Модель качается из `MaksimSun/chiron-qwen3-gguf`. Для Space берите GGUF **1.7B**: 4B на двух ядрах отвечает слишком долго.
