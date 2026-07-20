# Kanyoza Systems AI Platform v11 — Command Console

## Overview
Enterprise-grade React frontend dashboard for monitoring, configuring, and orchestrating the Kanyoza Python/Flask backend. Includes real-time telemetry, workflow visualization, AI personality controls, live payload inspector, Prometheus metrics, and a built-in system terminal.

## Stack
- **Framework:** React 18 + Vite 6
- **Styling:** Tailwind CSS v4 (custom "Command Center Dark" theme)
- **State:** Zustand
- **Icons:** Lucide React
- **Animations:** Framer Motion (`motion/react`)
- **Auth/DB:** Supabase (configured inside the UI)
- **PWA:** vite-plugin-pwa (installable, offline-capable)

## Running the app
```bash
npm run dev   # starts on port 5000
```
The `Start application` workflow runs `npm run dev` automatically.

## Connecting to the backend
This is a **frontend-only** project. Backend credentials are configured inside the running app:
1. Log in via the **KanyozaCommand** login screen (requires Supabase credentials in UI)
2. Navigate to **System Config → Engine Credentials**
3. Set the **WebSocket Endpoint URL**, **REST API Base URL**, and **Master API Token**
4. Optionally provide Gemini API key, Facebook Graph API key, and Supabase credentials

## Project structure
- `src/pages/` — top-level route pages (Dashboard, ContentStudio, WorkflowEngine, etc.)
- `src/components/` — shared UI components
- `src/store/` — Zustand stores
- `src/lib/` — utility helpers
- `lib/` — shared libraries (api-client-react, api-zod, db)
- `public/` — static assets and PWA icons

## User preferences
- Keep the existing dark "Command Center" visual theme
