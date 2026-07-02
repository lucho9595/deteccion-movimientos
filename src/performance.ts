import type { NormalizedLandmark } from "./drawing";

export type AppMode = "fast" | "balanced" | "precise";

export type ModePreset = {
  label: string;
  handEvery: number;
  faceEvery: number;
  poseEvery: number;
  objectEvery: number;
  smoothing: number;
  minConfidence: number;
  camera: {
    width: number;
    height: number;
    frameRate: number;
  };
};

export const MODE_PRESETS: Record<AppMode, ModePreset> = {
  fast: {
    label: "Rapido",
    handEvery: 1,
    faceEvery: 3,
    poseEvery: 5,
    objectEvery: 8,
    smoothing: 0.35,
    minConfidence: 0.45,
    camera: { width: 960, height: 540, frameRate: 30 },
  },
  balanced: {
    label: "Balanceado",
    handEvery: 1,
    faceEvery: 2,
    poseEvery: 4,
    objectEvery: 6,
    smoothing: 0.5,
    minConfidence: 0.58,
    camera: { width: 1280, height: 720, frameRate: 30 },
  },
  precise: {
    label: "Preciso",
    handEvery: 1,
    faceEvery: 1,
    poseEvery: 2,
    objectEvery: 4,
    smoothing: 0.68,
    minConfidence: 0.7,
    camera: { width: 1280, height: 720, frameRate: 30 },
  },
};

export type DetectorSchedule = {
  hands: boolean;
  face: boolean;
  pose: boolean;
  objects: boolean;
};

export function shouldRunDetectors(
  frame: number,
  preset: Pick<ModePreset, "handEvery" | "faceEvery" | "poseEvery" | "objectEvery">,
): DetectorSchedule {
  return {
    hands: frame % preset.handEvery === 0,
    face: frame % preset.faceEvery === 0,
    pose: frame % preset.poseEvery === 0,
    objects: frame % preset.objectEvery === 0,
  };
}

export function smoothLandmarkSet(
  previous: NormalizedLandmark[] | undefined,
  current: NormalizedLandmark[],
  amount: number,
): NormalizedLandmark[] {
  if (!previous || previous.length !== current.length) {
    return current.map((landmark) => ({ ...landmark }));
  }

  return current.map((landmark, index) => {
    const before = previous[index];

    return {
      ...landmark,
      x: lerp(landmark.x, before.x, amount),
      y: lerp(landmark.y, before.y, amount),
      z:
        landmark.z === undefined || before.z === undefined
          ? landmark.z
          : lerp(landmark.z, before.z, amount),
    };
  });
}

export function smoothLandmarkGroups(
  previous: NormalizedLandmark[][],
  current: NormalizedLandmark[][],
  amount: number,
): NormalizedLandmark[][] {
  return current.map((landmarks, index) =>
    smoothLandmarkSet(previous[index], landmarks, amount),
  );
}

export class FpsMeter {
  private samples: number[] = [];
  private lastTime = 0;

  constructor(private readonly maxSamples = 30) {}

  tick(now: number): number {
    if (this.lastTime === 0) {
      this.lastTime = now;
      return 0;
    }

    const delta = now - this.lastTime;
    this.lastTime = now;

    if (delta <= 0) {
      return this.value;
    }

    this.samples.push(1000 / delta);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return this.value;
  }

  get value(): number {
    if (this.samples.length === 0) {
      return 0;
    }

    return Math.round(
      this.samples.reduce((sum, sample) => sum + sample, 0) / this.samples.length,
    );
  }
}

function lerp(current: number, previous: number, amount: number): number {
  return current * (1 - amount) + previous * amount;
}
