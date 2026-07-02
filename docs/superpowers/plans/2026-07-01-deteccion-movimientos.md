# Deteccion de Movimientos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser app that detects hands, face, and body pose from the webcam and draws real-time overlays.

**Architecture:** A Vite TypeScript app runs fully in the browser. MediaPipe Tasks Vision owns ML inference, while local drawing helpers own canvas rendering and are covered by unit tests.

**Tech Stack:** Vite, TypeScript, Vitest, MediaPipe Tasks Vision, browser `getUserMedia`, HTML canvas.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`

- [ ] Create a Vite TypeScript project structure with scripts for `dev`, `build`, `test`, and `preview`.
- [ ] Add a single-page HTML shell with a root app element.
- [ ] Add TypeScript and Vite configuration.

### Task 2: Drawing Core

**Files:**
- Create: `src/drawing.ts`
- Create: `src/drawing.test.ts`

- [ ] Write failing tests for normalized landmark scaling and hand connections.
- [ ] Implement exported drawing constants and helper functions.
- [ ] Run tests and confirm they pass.

### Task 3: Vision Layer

**Files:**
- Create: `src/vision.ts`

- [ ] Implement MediaPipe model loading for hand, face, and pose landmarkers.
- [ ] Expose a `detectFrame` function that returns hand, face, and pose results according to enabled toggles.
- [ ] Keep model URLs and detector options centralized.

### Task 4: App UI and Camera Loop

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Build controls for camera start/stop and detector toggles.
- [ ] Start webcam video, size the overlay canvas to match it, and run a `requestAnimationFrame` detection loop.
- [ ] Draw enabled detections and show live status counts.
- [ ] Handle camera/model errors with readable messages.

### Task 5: Verification

**Commands:**
- `pnpm install`
- `pnpm run test`
- `pnpm run build`
- `pnpm run dev`

- [ ] Install dependencies.
- [ ] Verify unit tests pass.
- [ ] Verify production build passes.
- [ ] Start the local dev server and provide the URL.
