# Mejoras de Rendimiento y Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the webcam detector with smoother, faster, more accurate hand and face tracking plus capture and usability tools.

**Architecture:** Keep MediaPipe inference in `src/vision.ts`, add pure helpers for scheduling, smoothing, FPS, and gestures, and wire them through the existing single-page UI in `src/main.ts`. Drawing improvements stay in `src/drawing.ts` so rendering remains separate from detection.

**Tech Stack:** Vite, TypeScript, MediaPipe Tasks Vision, HTML canvas, local WASM assets.

---

### Task 1: Pure Runtime Helpers

**Files:**
- Create: `src/performance.ts`
- Create: `src/gestures.ts`
- Modify: `src/drawing.test.ts`

- [ ] Add mode presets for `rapido`, `balanceado`, and `preciso`.
- [ ] Add an FPS meter with rolling sample average.
- [ ] Add landmark smoothing with interpolation.
- [ ] Add simple hand gesture detection for open hand, fist, thumbs up, and peace sign.

### Task 2: Vision Configuration

**Files:**
- Modify: `src/vision.ts`

- [ ] Accept mode presets when creating the MediaPipe runtime.
- [ ] Use higher confidence in precise mode and lower confidence in fast mode.
- [ ] Keep GPU-to-CPU fallback.

### Task 3: UI and Runtime Loop

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Add controls for mode, only-hands, device selector, FPS, capture, and gallery.
- [ ] Enumerate cameras after permission is granted.
- [ ] Run detectors on different frame cadences per mode instead of every detector on every frame.
- [ ] Smooth hand, face, and pose landmarks before drawing.
- [ ] Capture the video plus overlay into a downloadable gallery image.

### Task 4: Drawing Improvements

**Files:**
- Modify: `src/drawing.ts`

- [ ] Draw hand lines by finger color.
- [ ] Draw face contours for lips, eyes, eyebrows, and face oval.
- [ ] Keep pose drawing readable with lower priority than hands and face.

### Task 5: Verification

**Commands:**
- `tsc --noEmit`
- `vite build`
- request `http://127.0.0.1:5190`

- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] The static server serves the new bundle.
