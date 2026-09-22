import { describe, expect, it } from "vitest";
import { compassRoseRotation } from "./compass";

describe("compassRoseRotation", () => {
  it("keeps north upright at zero bearing", () => {
    expect(compassRoseRotation(0)).toBe(0);
  });

  it("counter-rotates the rose when the map rotates clockwise", () => {
    expect(compassRoseRotation(30)).toBe(-30);
  });

  it.each([45, 180, 270, 359])("supports arbitrary bearing %s", (bearing) => {
    expect(compassRoseRotation(bearing)).toBe(-bearing);
  });
});
