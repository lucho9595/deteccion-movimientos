import type { NormalizedLandmark } from "./drawing";

export type HandGesture =
  | "Mano abierta"
  | "Puno"
  | "Pulgar arriba"
  | "Tijera"
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
  const palmSize = Math.max(0.001, distance(landmarks[0], landmarks[9]));
  const extended = FINGER_TIPS.map((tip, index) => {
    const pip = FINGER_PIPS[index];
    const mcp = FINGER_MCPS[index];
    const tipReach = distance(landmarks[tip], wrist);
    const pipReach = distance(landmarks[pip], wrist);
    const mcpReach = distance(landmarks[mcp], wrist);
    const pointsAwayFromPalm = tipReach > Math.max(pipReach, mcpReach) * 1.08;
    const verticalOpen = landmarks[tip].y < landmarks[pip].y - palmSize * 0.08;
    return pointsAwayFromPalm || verticalOpen;
  });
  const extendedCount = extended.filter(Boolean).length;
  const foldedCount = FINGER_TIPS.filter((tip, index) => {
    const pip = FINGER_PIPS[index];
    const mcp = FINGER_MCPS[index];
    return (
      distance(landmarks[tip], landmarks[mcp]) < palmSize * 1.05 ||
      distance(landmarks[tip], wrist) < distance(landmarks[pip], wrist) * 1.08
    );
  }).length;
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
    return "Tijera";
  }

  if (extendedCount === 0 || foldedCount >= 3) {
    return "Puno";
  }

  return "Detectando";
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
