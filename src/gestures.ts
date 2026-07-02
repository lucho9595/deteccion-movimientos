import type { NormalizedLandmark } from "./drawing";

export type HandGesture =
  | "Mano abierta"
  | "Puno"
  | "Pulgar arriba"
  | "Paz"
  | "Detectando";

const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_PIPS = [6, 10, 14, 18];
const FINGER_MCPS = [5, 9, 13, 17];

export function detectHandGesture(landmarks: NormalizedLandmark[]): HandGesture {
  if (landmarks.length < 21) {
    return "Detectando";
  }

  const wrist = landmarks[0];
  const extended = FINGER_TIPS.map((tip, index) => {
    const pip = FINGER_PIPS[index];
    const mcp = FINGER_MCPS[index];
    const tipReach = distance(landmarks[tip], wrist);
    const pipReach = distance(landmarks[pip], wrist);
    const mcpReach = distance(landmarks[mcp], wrist);
    return landmarks[tip].y < landmarks[pip].y || tipReach > Math.max(pipReach, mcpReach) * 1.12;
  });
  const extendedCount = extended.filter(Boolean).length;
  const thumbUp =
    landmarks[4].y < landmarks[3].y &&
    landmarks[4].y < landmarks[2].y &&
    extendedCount <= 1;

  if (extendedCount >= 4) {
    return "Mano abierta";
  }

  if (thumbUp) {
    return "Pulgar arriba";
  }

  if (extended[0] && extended[1] && !extended[2] && !extended[3]) {
    return "Paz";
  }

  if (extendedCount === 0) {
    return "Puno";
  }

  return "Detectando";
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
