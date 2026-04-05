# System Seek (DriftSeeker)

## Overview

System Seek is a Next.js 16 application focused on DevOps drift visibility and uptime checks.
It provides:

- GitHub OAuth authentication via NextAuth
- Protected dashboard and feature pages
- URL status checks with diagnostic timing traces
- Web server monitor CRUD (MongoDB) with ping state in Redis
- GitHub repository listing for authenticated users

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- NextAuth v4 with GitHub provider
- MongoDB + Mongoose
- Redis (ioredis)
- Tailwind CSS v4
- Playwright (test scaffold)

## Key Features

- Authenticated UX with session-aware UI states
- Protected API endpoint at /api/restricted
- Dashboard status checker using /api/check_status
- Per-target diagnostic trace for failures (DNS, TCP, TLS, TTFB via curl)
- Monitor management using /api/database and /api/monitor/ping
- Sidebar navigation to dashboard, monitor, console, and pipeline areas

## 24/7 Monitoring Workflow

The monitoring workflow image is included below from the public folder.

![24/7 Monitoring Workflow](/public/realtime_monitoring_workflow.png)

## Project Structure (Important Areas)

- app/(features)/monitors/page.tsx: Monitor management UI
- app/(features)/console/page.tsx: Protected console view
- app/dashboard/page.tsx: Authenticated status and drift overview UI
- app/api/check_status/route.ts: URL health + diagnostic timing trace
- app/api/database/route.ts: Monitor create/read/delete
- app/api/monitor/ping/route.ts: Ping monitor target and store status in Redis
- app/api/github/repos/route.ts: Authenticated GitHub repos fetch
- app/api/auth/[...nextauth]/route.ts: NextAuth GitHub setup

## Environment Variables

Create a .env.local file with:

```env
GITHUB_ID=your_github_oauth_app_client_id
GITHUB_SECRET=your_github_oauth_app_client_secret
NEXTAUTH_SECRET=your_random_nextauth_secret
NEXTAUTH_URL=your_oauth_app_redirect_url
NEXT_PUBLIC_API_BASE_URL=your_local_url
MONGODB_URI=your_mongodb_connection_connection_string
REDIS_URL=your_local_redis_server_url
NEXT_PUBLIC_SOCKET_URL=your_realtime_service_url_for_production
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

Notes:

- GITHUB_ID and GITHUB_SECRET are required at startup.
- MONGODB_URI is required by the database connector.
- REDIS_URL is optional in code (a default is used if omitted), but setting it explicitly is recommended.
- NEXT_PUBLIC_SOCKET_URL is optional. If set, monitors page connects to that external Socket.io service.
- NEXT_PUBLIC_SOCKET_PATH defaults to /api/socketio for local internal route, but should be /socket.io for external realtime-server.

## Installation

```bash
npm run setup
```
This will install dependencies for both the main Next.js app and the terminal-server subproject.

## Run In Development

```bash
npm run dev
```
This will start:
- The Next.js app
- Redis server (in-memory, with appendonly persistence)
- The terminal-server (Node.js backend)

App URL: http://localhost:3000

App URL: http://localhost:3000

## Available Scripts


```bash
# Install all dependencies (main app + terminal-server)
npm run setup

# Start Next.js, Redis, and terminal-server together
yarn dev  # or npm run dev

# Build Next.js app
npm run build

# Start production server (after build)
npm run start

# Lint code
npm run lint
```
```

## API Endpoints

- GET /api/restricted: Session-protected sample endpoint
- GET /api/check_status?url=<target>: Check URL and return status/diagnostics
- GET /api/database: List monitored targets
- POST /api/database: Add monitor target (name, url)
- DELETE /api/database?id=<id>: Remove monitor target
- POST /api/monitor/ping: Trigger single ping by id or url
- GET /api/github/repos: Fetch authenticated user's repositories

## Current Project Notes

- Dockerfile, docker-compose.yaml, and Jenkinsfile are present but currently empty.
- The pipelines page is currently a placeholder UI.
- Playwright test file is scaffold/example and not yet project-specific.

## Realtime Socket Service (Render)

The monitor UI supports two socket modes:

- Local/internal mode: uses Next API route at /api/socket and socket path /api/socketio
- External mode: uses NEXT_PUBLIC_SOCKET_URL (recommended for Vercel + Render)

Use the standalone service in realtime-server for production realtime pushes.

Render service configuration:

- Root Directory: realtime-server
- Build Command: npm install
- Start Command: npm start

Required env vars on Render:

- REDIS_URL=your_shared_redis_url
- CLIENT_ORIGINS=https://your-frontend-domain.vercel.app
- METRICS_CHANNEL=system_metrics (optional, defaults to system_metrics)

Required frontend env vars (Vercel or frontend host):

- NEXT_PUBLIC_SOCKET_URL=https://your-render-service.onrender.com
- NEXT_PUBLIC_SOCKET_PATH=/socket.io
