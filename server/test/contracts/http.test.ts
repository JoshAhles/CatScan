import { describe, it, expect } from "vitest";
import {
  patchNodeBodySchema, postCatBodySchema, patchCatBodySchema,
  postCalibrationStartBodySchema, postIdentityResolveBodySchema,
  patchConfigBodySchema, healthResponseSchema,
} from "../../src/contracts/http";

describe("HTTP API contracts", () => {
  it("PATCH /api/nodes/:id requires roomName", () => {
    expect(patchNodeBodySchema.parse({ roomName: "Office" }).roomName).toBe("Office");
    expect(() => patchNodeBodySchema.parse({})).toThrow();
  });

  it("POST /api/cats requires name and colorHex", () => {
    const ok = postCatBodySchema.parse({ name: "Ollie", colorHex: "#ffcc4d" });
    expect(ok.name).toBe("Ollie");
    expect(() => postCatBodySchema.parse({ name: "Ollie", colorHex: "yellow" })).toThrow();
  });

  it("PATCH /api/cats/:id requires at least one field", () => {
    expect(patchCatBodySchema.parse({ name: "Hope" }).name).toBe("Hope");
    expect(() => patchCatBodySchema.parse({})).toThrow();
  });

  it("POST /api/calibration/start validates room", () => {
    expect(postCalibrationStartBodySchema.parse({ room: "Kitchen" }).room).toBe("Kitchen");
  });

  it("POST /api/identity/resolve requires provisionalMac and catId", () => {
    const ok = postIdentityResolveBodySchema.parse({ provisionalMac: "AA:BB:CC:DD:EE:FF", catId: 1 });
    expect(ok.catId).toBe(1);
  });

  it("PATCH /api/config validates partial tuning constants", () => {
    expect(patchConfigBodySchema.parse({ alpha: 0.4 }).alpha).toBe(0.4);
    expect(() => patchConfigBodySchema.parse({ alpha: 2 })).toThrow();
  });

  it("GET /api/health response shape", () => {
    expect(healthResponseSchema.parse({ status: "ok", uptimeSeconds: 12 })).toBeDefined();
  });
});
