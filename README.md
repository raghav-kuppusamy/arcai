# Arc AI — Project Intelligence Platform

Arc AI is a React + TypeScript single-page application that surfaces real-time delivery insights across Jira, GitHub, and CI/CD pipelines.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x or later |
| npm | 9.x or later |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5173** and supports Hot Module Replacement (HMR) — changes are reflected instantly without a full page reload.

### 3. Build for production

```bash
npm run build
```

The optimised output is written to the `dist/` folder.

### 4. Preview the production build locally

```bash
npm run preview
```

Serves the `dist/` folder at **http://localhost:4173** so you can verify the production build before deploying.

---

## Project Structure

```
src/
├── app/
│   ├── components/     # Shared UI components (Layout, ArcLogo, …)
│   ├── data/           # Mock data (mockData.ts)
│   ├── pages/          # Page-level components (Dashboard, Planning, …)
│   ├── App.tsx
│   └── routes.tsx
├── styles/             # Global CSS & Tailwind config
└── main.tsx            # Application entry point
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

---

© 2026 Galactic Overlords. All rights reserved.
