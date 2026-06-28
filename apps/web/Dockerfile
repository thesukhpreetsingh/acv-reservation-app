FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm --filter web build
EXPOSE 3001
CMD ["pnpm", "--filter", "web", "start"]
