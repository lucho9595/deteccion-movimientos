import { describe, expect, it } from "vitest";
import { createFaceDescriptor, findFaceMatch, type FaceProfile } from "./face-id";
import type { NormalizedLandmark } from "./drawing";

function makeFace(offset = 0): NormalizedLandmark[] {
  const face = Array.from({ length: 468 }, (_, index) => ({
    x: 0.5 + Math.sin(index) * 0.02 + offset,
    y: 0.5 + Math.cos(index) * 0.02 - offset,
    z: Math.sin(index * 0.5) * 0.01,
  }));

  face[10] = { x: 0.5 + offset, y: 0.18 - offset, z: 0 };
  face[152] = { x: 0.5 + offset, y: 0.82 - offset, z: 0 };
  face[234] = { x: 0.18 + offset, y: 0.5 - offset, z: 0 };
  face[454] = { x: 0.82 + offset, y: 0.5 - offset, z: 0 };
  return face;
}

describe("face id", () => {
  it("creates a normalized face descriptor", () => {
    const descriptor = createFaceDescriptor(makeFace());

    expect(descriptor).not.toBeNull();
    expect(descriptor).toHaveLength(48);
  });

  it("matches a similar registered face", () => {
    const descriptor = createFaceDescriptor(makeFace())!;
    const profiles: FaceProfile[] = [{
      id: "1",
      firstName: "Lucho",
      lastName: "Test",
      descriptor,
      createdAt: 1,
    }];

    expect(findFaceMatch(makeFace(0.001), profiles)?.profile.firstName).toBe("Lucho");
  });

  it("rejects a different face descriptor", () => {
    const descriptor = createFaceDescriptor(makeFace())!;
    const profiles: FaceProfile[] = [{
      id: "1",
      firstName: "Lucho",
      lastName: "Test",
      descriptor: descriptor.map((value, index) => value + (index % 2 === 0 ? 0.35 : -0.35)),
      createdAt: 1,
    }];

    expect(findFaceMatch(makeFace(), profiles)).toBeNull();
  });
});
