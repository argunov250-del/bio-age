# Сервер Хирона: vLLM (OpenAI API) только на localhost и прокси с ключом снаружи.
# Образ большой: его собирают на машине с GPU, не в GitHub Actions этого репозитория.
FROM vllm/vllm-openai:latest

RUN apt-get update && apt-get install -y --no-install-recommends nodejs wget ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY proxy.js limit.js entrypoint.sh /app/
ENV UPSTREAM=http://127.0.0.1:8000
ENV PORT=8080
ENV MODEL=Qwen/Qwen3-8B
ENV LORA=MaksimSun/chiron-qwen3-lora
ENV MAX_MODEL_LEN=4096
ENV MAX_LORA_RANK=16
EXPOSE 8080
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
