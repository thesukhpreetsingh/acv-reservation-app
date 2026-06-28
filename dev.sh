#!/bin/bash

# 1. Start MongoDB
echo "Starting MongoDB..."
docker-compose up -d mongodb

# 2. Install dependencies
echo "Installing dependencies..."
pnpm install

# 3. Seed the database
echo "Seeding database..."
# We use tsx to run the typescript seed file directly
pnpm add -D tsx
npx tsx apps/api/src/seed.ts

# 4. Start the backend
echo "Starting backend..."
pnpm --filter api dev &

# 5. Start the frontend
echo "Starting frontend..."
pnpm --filter web dev

echo "System is up and running!"
