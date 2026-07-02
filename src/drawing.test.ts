import { describe, expect, it } from "vitest";
import { HAND_CONNECTIONS, POSE_CONNECTIONS, scaleLandmark } from "./drawing";

describe("drawing geometry", () => {
  it("scales normalized landmarks to canvas pixels", () => {
    expect(scaleLandmark({ x: 0.25, y: 0.75 }, 1280, 720)).toEqual({
      x: 320,
      y: 540,
    });
  });

  it("includes finger joint chains for the hand", () => {
    expect(HAND_CONNECTIONS).toContainEqual([0, 1]);
    expect(HAND_CONNECTIONS).toContainEqual([1, 2]);
    expect(HAND_CONNECTIONS).toContainEqual([5, 6]);
    expect(HAND_CONNECTIONS).toContainEqual([17, 18]);
    expect(HAND_CONNECTIONS).toContainEqual([19, 20]);
    expect(HAND_CONNECTIONS).toHaveLength(21);
  });

  it("includes upper body pose connections", () => {
    expect(POSE_CONNECTIONS).toContainEqual([11, 13]);
    expect(POSE_CONNECTIONS).toContainEqual([13, 15]);
    expect(POSE_CONNECTIONS).toContainEqual([12, 14]);
    expect(POSE_CONNECTIONS).toContainEqual([14, 16]);
  });
});
