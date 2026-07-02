import type { NormalizedLandmark } from "./drawing";
import { distance } from "./analysis";
import type { HandGesture } from "./gestures";

export type GestureCommand =
  | "start"
  | "confirm"
  | "capture"
  | "pinchClick";

export class CommandGate {
  private lastRun = new Map<GestureCommand, number>();

  constructor(private readonly cooldownMs = 1100) {}

  consume(command: GestureCommand, now: number): boolean {
    const previous = this.lastRun.get(command) ?? -Infinity;
    if (now - previous < this.cooldownMs) {
      return false;
    }

    this.lastRun.set(command, now);
    return true;
  }
}

export function commandFromGesture(
  gesture: HandGesture,
  hand: NormalizedLandmark[] | undefined,
): GestureCommand | null {
  if (isPinching(hand)) {
    return "pinchClick";
  }

  switch (gesture) {
    case "Puno":
      return "start";
    case "Pulgar arriba":
      return "confirm";
    case "Paz":
      return "capture";
    default:
      return null;
  }
}

export function isPinching(hand: NormalizedLandmark[] | undefined): boolean {
  if (!hand || hand.length < 9) {
    return false;
  }

  return distance(hand[4], hand[8]) < 0.055;
}
