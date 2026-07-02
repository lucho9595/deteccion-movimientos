import type { NormalizedLandmark } from "./drawing";
import { distance } from "./analysis";

export type DrowsinessLevel = "Despierto" | "Atencion baja" | "Somnolencia" | "Alerta";
export type DrowsinessSensitivity = "low" | "medium" | "high";

export type DrowsinessSnapshot = {
  level: DrowsinessLevel;
  eyeRatio: number | null;
  eyesClosed: boolean;
  closedMs: number;
  missingFaceMs: number;
  headDropScore: number | null;
  headDropped: boolean;
  alarm: boolean;
};

type Thresholds = {
  eyeClosedRatio: number;
  headDropScore: number;
  attentionMs: number;
  drowsyMs: number;
  alertMs: number;
  missingAlertMs: number;
  riseMs: number;
  fallMs: number;
};

const THRESHOLDS: Record<DrowsinessSensitivity, Thresholds> = {
  low: {
    eyeClosedRatio: 0.16,
    headDropScore: 0.44,
    attentionMs: 1400,
    drowsyMs: 2600,
    alertMs: 4300,
    missingAlertMs: 6000,
    riseMs: 260,
    fallMs: 180,
  },
  medium: {
    eyeClosedRatio: 0.18,
    headDropScore: 0.38,
    attentionMs: 1000,
    drowsyMs: 2100,
    alertMs: 3300,
    missingAlertMs: 4500,
    riseMs: 340,
    fallMs: 260,
  },
  high: {
    eyeClosedRatio: 0.2,
    headDropScore: 0.32,
    attentionMs: 350,
    drowsyMs: 900,
    alertMs: 1600,
    missingAlertMs: 3200,
    riseMs: 520,
    fallMs: 570,
  },
};

const EMPTY: DrowsinessSnapshot = {
  level: "Despierto",
  eyeRatio: null,
  eyesClosed: false,
  closedMs: 0,
  missingFaceMs: 0,
  headDropScore: null,
  headDropped: false,
  alarm: false,
};

export class DrowsinessTracker {
  private closedStart: number | null = null;
  private missingStart: number | null = null;
  private lastUpdate: number | null = null;
  private sleepyMs = 0;
  private alarmLatched = false;
  private lastSnapshot: DrowsinessSnapshot = EMPTY;

  reset(): void {
    this.closedStart = null;
    this.missingStart = null;
    this.lastUpdate = null;
    this.sleepyMs = 0;
    this.alarmLatched = false;
    this.lastSnapshot = EMPTY;
  }

  update(
    now: number,
    face: NormalizedLandmark[] | undefined,
    sensitivity: DrowsinessSensitivity,
  ): DrowsinessSnapshot {
    const thresholds = THRESHOLDS[sensitivity];
    const deltaMs = this.lastUpdate === null ? 0 : Math.min(250, Math.max(0, now - this.lastUpdate));
    this.lastUpdate = now;

    if (!face || face.length < 468) {
      this.closedStart = null;
      this.missingStart ??= now;
      const missingFaceMs = now - this.missingStart;
      this.lastSnapshot = {
        ...EMPTY,
        level: missingFaceMs >= thresholds.missingAlertMs ? "Alerta" : "Atencion baja",
        missingFaceMs,
        alarm: missingFaceMs >= thresholds.missingAlertMs,
      };
      return this.lastSnapshot;
    }

    this.missingStart = null;

    const eyeRatio = averageEyeRatio(face);
    const headDropScore = getHeadDropScore(face);
    const eyesClosed = eyeRatio !== null && eyeRatio < thresholds.eyeClosedRatio;
    const headDropped = headDropScore !== null && headDropScore > thresholds.headDropScore;
    const sleepySignal = eyesClosed || headDropped;

    if (sleepySignal) {
      this.closedStart ??= now;
      const headDropBoost = headDropped ? thresholds.riseMs : 0;
      this.sleepyMs = Math.min(
        thresholds.alertMs + 1000,
        this.sleepyMs + deltaMs + thresholds.riseMs + headDropBoost,
      );
    } else {
      this.closedStart = null;
      this.sleepyMs = Math.max(0, this.sleepyMs - deltaMs - thresholds.fallMs);
    }

    const closedMs = Math.max(this.closedStart === null ? 0 : now - this.closedStart, this.sleepyMs);
    const level = getLevel(this.sleepyMs, thresholds);
    if (level === "Alerta") {
      this.alarmLatched = true;
    } else if (!sleepySignal && this.sleepyMs < thresholds.attentionMs) {
      this.alarmLatched = false;
    }

    this.lastSnapshot = {
      level,
      eyeRatio,
      eyesClosed,
      closedMs,
      missingFaceMs: 0,
      headDropScore,
      headDropped,
      alarm: this.alarmLatched,
    };

    return this.lastSnapshot;
  }

  get snapshot(): DrowsinessSnapshot {
    return this.lastSnapshot;
  }
}

export function averageEyeRatio(face: NormalizedLandmark[]): number | null {
  const left = eyeAspectRatio(face, [33, 160, 158, 133, 153, 144]);
  const right = eyeAspectRatio(face, [362, 385, 387, 263, 373, 380]);

  if (left === null || right === null) {
    return null;
  }

  return (left + right) / 2;
}

export function eyeAspectRatio(
  face: NormalizedLandmark[],
  indices: [number, number, number, number, number, number],
): number | null {
  const [outer, upperOuter, upperInner, inner, lowerInner, lowerOuter] = indices.map(
    (index) => face[index],
  );

  if (!outer || !upperOuter || !upperInner || !inner || !lowerInner || !lowerOuter) {
    return null;
  }

  const vertical = distance(upperOuter, lowerOuter) + distance(upperInner, lowerInner);
  const horizontal = distance(outer, inner) * 2;

  return horizontal === 0 ? null : vertical / horizontal;
}

export function getHeadDropScore(face: NormalizedLandmark[]): number | null {
  const forehead = face[10];
  const chin = face[152];
  const nose = face[1];
  const leftEye = face[33];
  const rightEye = face[263];

  if (!forehead || !chin || !nose || !leftEye || !rightEye) {
    return null;
  }

  const faceHeight = distance(forehead, chin);
  if (faceHeight === 0) {
    return null;
  }

  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  return (nose.y - eyeCenterY) / faceHeight;
}

function getLevel(closedMs: number, thresholds: Thresholds): DrowsinessLevel {
  if (closedMs >= thresholds.alertMs) {
    return "Alerta";
  }

  if (closedMs >= thresholds.drowsyMs) {
    return "Somnolencia";
  }

  if (closedMs >= thresholds.attentionMs) {
    return "Atencion baja";
  }

  return "Despierto";
}
