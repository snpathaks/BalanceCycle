#!/bin/sh
set -e

# Default model if not specified (llama3.2:1b or llama3.2 is recommended for cloud CPU instances)
MODEL="${OLLAMA_MODEL:-llama3.2:1b}"
PORT="${PORT:-11434}"

echo "[Ollama] Starting Ollama server on port ${PORT}..."
export OLLAMA_HOST="0.0.0.0:${PORT}"

# Start Ollama in background
ollama serve &
SERVER_PID=$!

echo "[Ollama] Waiting for Ollama server to become ready..."
until curl -sf "http://127.0.0.1:${PORT}/api/tags" > /dev/null 2>&1; do
    sleep 1
done

echo "[Ollama] Checking for model: ${MODEL}..."
if ! ollama list | grep -q "${MODEL}"; then
    echo "[Ollama] Model ${MODEL} not found locally. Pulling..."
    ollama pull "${MODEL}"
    echo "[Ollama] Model ${MODEL} pulled successfully!"
else
    echo "[Ollama] Model ${MODEL} already available."
fi

echo "[Ollama] Ollama is ready to accept requests."

# Keep container running and forward termination signals
trap "kill -TERM ${SERVER_PID}" INT TERM
wait ${SERVER_PID}
