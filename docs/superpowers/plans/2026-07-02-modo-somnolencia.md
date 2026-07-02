# Modo Somnolencia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add webcam-based drowsiness detection to the existing MediaPipe web app.

**Architecture:** Add a pure `src/drowsiness.ts` module that computes eye openness, head drop, timers, and alert state from face landmarks. Integrate it into `src/main.ts` through a switch, sensitivity selector, status panel, visual alarm, and short audio beep.

**Tech Stack:** TypeScript, MediaPipe FaceLandmarker, HTML canvas, Web Audio API.

---

### Task 1: Drowsiness Detector

**Files:**
- Create: `src/drowsiness.ts`

- [ ] Compute eye aspect ratio for both eyes.
- [ ] Compute a head-drop score using nose, eyes, chin, and forehead landmarks.
- [ ] Track duration of closed eyes and missing face.
- [ ] Return states: `Despierto`, `Atencion baja`, `Somnolencia`, `Alerta`.

### Task 2: UI Integration

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Add a `Modo somnolencia` switch.
- [ ] Add a sensitivity selector.
- [ ] Add a compact drowsiness panel.
- [ ] Force face detection on while the mode is enabled.
- [ ] Show alarm overlay and play beep when alert state is reached.

### Task 3: Verification

**Commands:**
- `pnpm run test`
- `vite build`

- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] Commit and push changes.
