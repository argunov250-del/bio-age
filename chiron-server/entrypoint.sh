#!/bin/sh
# llama-server на localhost, снаружи только прокси. Тела запросов прокси не пишет.
set -eu
if [ -z "${CHIRON_KEY:-}" ]; then
  echo "CHIRON_KEY is empty" >&2
  exit 1
fi
mkdir -p /models
MODEL_PATH="${MODEL_PATH:-}"
if [ -z "$MODEL_PATH" ] || [ ! -f "$MODEL_PATH" ]; then
  python3 - << 'PY'
import os
from huggingface_hub import hf_hub_download, list_repo_files
repo = os.environ.get("GGUF_REPO", "MaksimSun/chiron-qwen3-gguf")
files = [f for f in list_repo_files(repo) if f.endswith(".gguf")]
prefer = [f for f in files if "Q4_K_M" in f or "q4_k_m" in f]
name = (prefer or files)[0]
path = hf_hub_download(repo_id=repo, filename=name, local_dir="/models")
open("/models/path.txt", "w", encoding="utf-8").write(path)
PY
  MODEL_PATH="$(cat /models/path.txt)"
fi
llama-server -m "$MODEL_PATH" -c "${CTX:-1024}" -t "${THREADS:-4}" --host 127.0.0.1 --port 8000 &
i=0
while [ "$i" -lt 180 ]; do
  if curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 2
done
exec node /app/proxy.js
