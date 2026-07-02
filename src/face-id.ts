import type { NormalizedLandmark } from "./drawing";

export type FaceProfile = {
  id: string;
  firstName: string;
  lastName: string;
  descriptor: number[];
  createdAt: number;
};

export type FaceMatch = {
  profile: FaceProfile;
  distance: number;
};

const STORAGE_KEY = "deteccion-movimientos.face-id.profiles";
const MATCH_THRESHOLD = 0.12;
const DESCRIPTOR_POINTS = [
  10, 152, 33, 133, 362, 263, 1, 4, 61, 291, 13, 14, 234, 454, 93, 323,
];

export function loadFaceProfiles(): FaceProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as FaceProfile[];
    return Array.isArray(parsed)
      ? parsed.filter((profile) => Array.isArray(profile.descriptor))
      : [];
  } catch {
    return [];
  }
}

export function saveFaceProfiles(profiles: FaceProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createFaceProfile(
  face: NormalizedLandmark[],
  firstName: string,
  lastName: string,
): FaceProfile | null {
  const descriptor = createFaceDescriptor(face);
  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();

  if (!descriptor || !cleanFirstName || !cleanLastName) {
    return null;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    descriptor,
    createdAt: Date.now(),
  };
}

export function findFaceMatch(
  face: NormalizedLandmark[] | undefined,
  profiles: FaceProfile[],
): FaceMatch | null {
  const descriptor = face ? createFaceDescriptor(face) : null;
  if (!descriptor || profiles.length === 0) {
    return null;
  }

  const best = profiles
    .map((profile) => ({
      profile,
      distance: descriptorDistance(descriptor, profile.descriptor),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return best && best.distance <= MATCH_THRESHOLD ? best : null;
}

export function createFaceDescriptor(face: NormalizedLandmark[]): number[] | null {
  if (face.length < 455) {
    return null;
  }

  const selected = DESCRIPTOR_POINTS.map((index) => face[index]);
  if (selected.some((point) => !point)) {
    return null;
  }

  const center = selected.reduce<{ x: number; y: number; z: number }>(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + (point.z ?? 0),
    }),
    { x: 0, y: 0, z: 0 },
  );
  center.x /= selected.length;
  center.y /= selected.length;
  center.z /= selected.length;

  const width = Math.max(0.001, Math.abs(face[454].x - face[234].x));
  const height = Math.max(0.001, Math.abs(face[152].y - face[10].y));
  const scale = Math.max(width, height);

  return selected.flatMap((point) => [
    (point.x - center.x) / scale,
    (point.y - center.y) / scale,
    ((point.z ?? 0) - center.z) / scale,
  ]);
}

function descriptorDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return Infinity;
  }

  const sum = a.reduce((total, value, index) => total + (value - b[index]) ** 2, 0);
  return Math.sqrt(sum / a.length);
}
