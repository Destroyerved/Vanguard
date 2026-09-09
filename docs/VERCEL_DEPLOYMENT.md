# VANGUARD — Vercel Deployment Guide

This repository is pre-configured for zero-configuration, production-grade deployment on **Vercel**.

---

## 1. Quick Deploy via Vercel Dashboard

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Log in to [Vercel](https://vercel.com) and click **"Add New..."** → **"Project"**.
3. Import your **Vanguard** repository.
4. Vercel will automatically detect the settings from [`vercel.json`](file:///c:/Users/ved/Documents/Vanguard/vercel.json):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (or `npm run vercel-build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **"Deploy"**.

---

## 2. Deploy via Vercel CLI

If you have the Vercel CLI installed:

```bash
# Login to Vercel
npx vercel login

# Deploy preview build
npx vercel

# Deploy directly to production
npx vercel --prod
```

---

## 3. Deployment Modes & Environment Variables

### Mode A: Zero-Config Demo Mode (Default)
By default, Vanguard boots in **Autonomous Demo Mode** (`DEMO_MODE = true`). 
- **No external database or backend server required**.
- Serves the complete Sector 04 operational intelligence picture, live threat horizon, deterministic AI briefing synthesis, OSINT authenticity verification, and 3D Cobe globe.
- **Environment variables needed**: **None**. It deploys and works immediately on a fresh checkout.

### Mode B: Live Backend Integration (Optional)
To connect your Vercel frontend to a remote fusion engine (hosted on Railway, Render, Fly.io, or an AWS/GCP instance):

Set the following variables in **Project Settings** → **Environment Variables** in Vercel:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_LIVE_BACKEND` | Enable live backend connection | `true` |
| `VITE_BACKEND_URL` | Base URL of the REST API gateway | `https://api.vanguard.example.com` |
| `VITE_WS_URL` | WebSocket live stream URL | `wss://api.vanguard.example.com/stream` |
| `VITE_ENABLE_AUDIO_BRIEFING` | Enable tactical speech synthesis | `true` |
| `VITE_ENABLE_SIMULATION_FALLBACK` | Fall back to local sim if API drops | `true` |

### Mode C: Firebase Authentication (Optional)
If utilizing custom operator authentication:

| Variable | Description | Default Fallback |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Pre-configured sandbox key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `vanguard-7fece.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `vanguard-7fece` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `vanguard-7fece.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Sender ID | `316058828672` |
| `VITE_FIREBASE_APP_ID` | App ID | Configured sandbox ID |

---

## 4. Production Optimizations Included

- **SPA Fallback Routing**: [`vercel.json`](file:///c:/Users/ved/Documents/Vanguard/vercel.json) rewrites all deep URLs to `/index.html` preventing 404s on page refresh.
- **Optimized Vendor Chunking**: React, Lucide icons, Motion, D3/Cobe viz, and Firebase are split into separate cached chunks in [`vite.config.ts`](file:///c:/Users/ved/Documents/Vanguard/vite.config.ts).
- **Edge Caching**: Built assets in `/assets/*` are stamped with `Cache-Control: public, max-age=31536000, immutable`.
- **Security Headers**: Standard defense-grade headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Lean Deployments**: Non-client code (`server/`, `backend/`, `docs/`, `reports/`) is excluded via [`.vercelignore`](file:///c:/Users/ved/Documents/Vanguard/.vercelignore).
