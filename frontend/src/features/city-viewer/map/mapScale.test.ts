import { describe, expect, it } from "vitest";
import { mapScaleBarMeters, mapScaleDenominator } from "./mapScale";

describe("map scale", () => {
  it("rounds live denominators to human-friendly steps", () => {
    expect(mapScaleDenominator(16, 0) % 100).toBe(0);
    expect(mapScaleDenominator(16, 0)).not.toBe(5079);
  });

  it("chooses a clean physical distance for the scale bar", () => {
    expect(mapScaleBarMeters(5100)).toBe(100);
  });
});
