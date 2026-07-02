# Interaccion Avanzada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add body analysis, gesture commands, hand cursor interaction, and a motion-controlled mini game to the webcam detector.

**Architecture:** Add pure modules for geometry analysis, command debouncing, and game state. Keep MediaPipe and drawing intact, while `src/main.ts` wires new UI panels to the existing detection loop.

**Tech Stack:** TypeScript, MediaPipe landmarks, HTML canvas, DOM controls.

---

### Task 1: Body Analysis

**Files:**
- Create: `src/analysis.ts`
- Modify: `src/main.ts`

- [ ] Calculate elbow angles, wrist angle, shoulder tilt, head tilt, and hand aperture.
- [ ] Render those measurements in a compact panel.

### Task 2: Gesture Commands

**Files:**
- Create: `src/commands.ts`
- Modify: `src/main.ts`

- [ ] Convert gestures into commands with cooldown.
- [ ] Map open hand to an in-app command window, fist to game start/resume, thumbs up to confirmation, peace sign to capture, and raised hand to mode cycling.

### Task 3: Minority Cursor

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Use the index fingertip as a visual cursor.
- [ ] Detect pinch as click and open hand as dragging.
- [ ] Allow dragging the command window with the hand cursor.

### Task 4: Game Mode

**Files:**
- Create: `src/game.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Add a game switch.
- [ ] Create a lightweight reflex game: catch targets with the hand and avoid danger with the head.
- [ ] Draw score, lives, and targets on the existing overlay canvas.

### Task 5: Verification

**Commands:**
- `pnpm run test`
- `vite build`
- HTTP check for `http://127.0.0.1:5190`

- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Static server serves the new bundle.
