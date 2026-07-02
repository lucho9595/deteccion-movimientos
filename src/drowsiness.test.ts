import { describe, expect, it } from "vitest";
import { DrowsinessTracker } from "./drowsiness";
import type { NormalizedLandmark } from "./drawing";

function makeFace({ closedEyes = false, headDropped = false } = {}): NormalizedLandmark[] {
  const face = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));

  face[10] = { x: 0.5, y: 0.1 };
  face[152] = { x: 0.5, y: 0.9 };
  face[1] = { x: 0.5, y: headDropped ? 0.72 : 0.38 };
  face[33] = { x: 0.2, y: 0.28 };
  face[263] = { x: 0.8, y: 0.28 };

  const upperY = closedEyes ? 0.27 : 0.18;
  const lowerY = closedEyes ? 0.29 : 0.38;

  face[160] = { x: 0.32, y: upperY };
  face[158] = { x: 0.38, y: upperY };
  face[133] = { x: 0.6, y: 0.28 };
  face[153] = { x: 0.38, y: lowerY };
  face[144] = { x: 0.32, y: lowerY };

  face[362] = { x: 0.4, y: 0.28 };
  face[385] = { x: 0.62, y: upperY };
  face[387] = { x: 0.68, y: upperY };
  face[373] = { x: 0.68, y: lowerY };
  face[380] = { x: 0.62, y: lowerY };

  return face;
}

describe("drowsiness tracker", () => {
  it("raises an alarm after sustained closed eyes", () => {
    const tracker = new DrowsinessTracker();
    const face = makeFace({ closedEyes: true });

    tracker.update(0, face, "high");
    tracker.update(120, face, "high");
    const snapshot = tracker.update(240, face, "high");

    expect(snapshot.eyesClosed).toBe(true);
    expect(snapshot.level).toBe("Alerta");
    expect(snapshot.alarm).toBe(true);
  });

  it("raises an alarm after sustained head drop", () => {
    const tracker = new DrowsinessTracker();
    const face = makeFace({ headDropped: true });

    tracker.update(0, face, "high");
    tracker.update(120, face, "high");
    const snapshot = tracker.update(240, face, "high");

    expect(snapshot.headDropped).toBe(true);
    expect(snapshot.level).toBe("Alerta");
    expect(snapshot.alarm).toBe(true);
  });
});
