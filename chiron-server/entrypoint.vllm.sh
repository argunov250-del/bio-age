#!/bin/sh
set -eu
if [ -z "${CHIRON_KEY:-}" ]; then
  echo "CHIRON_KEY is empty" >&2
  exit 1
fi
LORA_ARGS=""
if [ -n "${LORA:-}" ]; then
  LORA_ARGS="--enable-lora --max-lora-rank ${MAX_LORA_RANK:-16} --lora-modules chiron=${LORA}"
fi
# shellcheck disable=SC2086
python3 -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --host 127.0.0.1 \
  --port 8000 \
  --max-model-len "${MAX_MODEL_LEN:-4096}" \
  $LORA_ARGS &
i=0
while [ "$i" -lt 180 ]; do
  if wget -q -O - http://127.0.0.1:8000/health >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 2
done
exec node /app/proxy.js
