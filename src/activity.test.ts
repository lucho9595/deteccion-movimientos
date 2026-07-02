import { describe, expect, it } from "vitest";
import { createActivityEvent } from "./activity";

describe("activity events", () => {
  it("creates timestamped activity events", () => {
    const event = createActivityEvent({
      kind: "face",
      title: "Usuario reconocido",
      detail: "Lucho Test",
    });

    expect(event.id).toContain("-");
    expect(event.kind).toBe("face");
    expect(event.createdAt).toBeGreaterThan(0);
  });
});
