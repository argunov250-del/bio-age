# Бесплатный сервер: llama.cpp на CPU и прокси с ключом.
# Собирайте образ на той машине, где он будет работать (ARM Oracle или x86 Space),
# чтобы GGML_NATIVE совпал с процессором.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake git ca-certificates curl python3 python3-pip nodejs \
    && pip3 install --break-system-packages huggingface_hub \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt
RUN git clone --depth 1 https://github.com/ggerganov/llama.cpp.git \
    && cmake -S llama.cpp -B llama.cpp/build -DGGML_NATIVE=ON -DLLAMA_BUILD_SERVER=ON \
    && cmake --build llama.cpp/build -j"$(nproc)" --target llama-server \
    && cp llama.cpp/build/bin/llama-server /usr/local/bin/llama-server
WORKDIR /app
COPY proxy.js limit.js entrypoint.sh /app/
ENV GGUF_REPO=MaksimSun/chiron-qwen3-gguf
ENV CTX=1024
ENV THREADS=4
ENV UPSTREAM=http://127.0.0.1:8000
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
