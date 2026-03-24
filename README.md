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
NEXTAUTH_URL=your_local_url

MONGODB_URI=your_mongodb_connection_connection_string
REDIS_URL=your_local_redis_server_url
```

Notes:

- GITHUB_ID and GITHUB_SECRET are required at startup.
- MONGODB_URI is required by the database connector.
- REDIS_URL is optional in code (a default is used if omitted), but setting it explicitly is recommended.

## Installation

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

App URL: http://localhost:3000

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
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
