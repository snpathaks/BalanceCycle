FROM ollama/ollama:latest

# Install curl for healthchecks and waiting for server startup
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV OLLAMA_HOST=0.0.0.0:11434
EXPOSE 11434

ENTRYPOINT ["/app/entrypoint.sh"]
