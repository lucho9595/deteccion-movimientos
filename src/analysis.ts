import type { NormalizedLandmark, Point } from "./drawing";

export type BodyAnalysis = {
  leftElbow: number | null;
  rightElbow: number | null;
  leftWrist: number | null;
  rightWrist: number | null;
  shoulders: number | null;
  headTilt: number | null;
  handAperture: number | null;
};

export const EMPTY_ANALYSIS: BodyAnalysis = {
  leftElbow: null,
  rightElbow: null,
  leftWrist: null,
  rightWrist: null,
  shoulders: null,
  headTilt: null,
  handAperture: null,
};

export function analyzeBody(input: {
  pose?: NormalizedLandmark[];
  face?: NormalizedLandmark[];
  hand?: NormalizedLandmark[];
}): BodyAnalysis {
  const pose = input.pose;

  return {
    leftElbow: pose ? angleAt(pose[11], pose[13], pose[15]) : null,
    rightElbow: pose ? angleAt(pose[12], pose[14], pose[16]) : null,
    leftWrist: pose ? angleAt(pose[13], pose[15], pose[19] ?? pose[17]) : null,
    rightWrist: pose ? angleAt(pose[14], pose[16], pose[20] ?? pose[18]) : null,
    shoulders: pose ? lineAngle(pose[11], pose[12]) : null,
    headTilt: input.face ? faceTilt(input.face) : pose ? lineAngle(pose[7], pose[8]) : null,
    handAperture: input.hand ? handAperture(input.hand) : null,
  };
}

export function angleAt(
  a: NormalizedLandmark | undefined,
  b: NormalizedLandmark | undefined,
  c: NormalizedLandmark | undefined,
): number | null {
  if (!a || !b || !c) {
    return null;
  }

  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const cross = ab.x * cb.y - ab.y * cb.x;
  return Math.round(Math.abs(Math.atan2(cross, dot) * (180 / Math.PI)));
}

export function lineAngle(
  a: NormalizedLandmark | undefined,
  b: NormalizedLandmark | undefined,
): number | null {
  if (!a || !b) {
    return null;
  }

  return Math.round(Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI));
}

export function handAperture(hand: NormalizedLandmark[]): number | null {
  if (hand.length < 21) {
    return null;
  }

  const wrist = hand[0];
  const tips = [4, 8, 12, 16, 20].map((index) => hand[index]);
  const averageDistance =
    tips.reduce((sum, tip) => sum + distance(wrist, tip), 0) / tips.length;

  return Math.round(Math.min(100, averageDistance * 260));
}

export function faceTilt(face: NormalizedLandmark[]): number | null {
  const leftEye = face[33];
  const rightEye = face[263];
  return lineAngle(leftEye, rightEye);
}

export function toCanvasPoint(
  landmark: NormalizedLandmark | undefined,
  width: number,
  height: number,
  mirrored = true,
): Point | null {
  if (!landmark) {
    return null;
  }

  const x = landmark.x * width;
  return {
    x: mirrored ? width - x : x,
    y: landmark.y * height,
  };
}

export function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
