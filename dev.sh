#!/bin/bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Installing Docker..."

  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-plugin
    sudo systemctl enable --now docker
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install --cask docker
  else
    echo "Automatic Docker installation is not supported on this OS. Please install Docker manually and rerun this script."
    exit 1
  fi
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is not available. Please install Docker Compose and rerun this script."
  exit 1
fi

echo "Starting services with Docker Compose..."
"${COMPOSE_CMD[@]}" up -d --build

echo "Installing dependencies..."
pnpm install

echo "Seeding is handled by the API container startup via Docker Compose."

echo "Starting backend..."
pnpm --filter api dev &

echo "Starting frontend..."
pnpm --filter web dev

echo "System is up and running!"
