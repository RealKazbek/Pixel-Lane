import { describe, expect, it } from "vitest";

import { worldPosition } from "./types";

describe("worldPosition", () => {
  it("keeps horizontal coordinates separate from optional elevation", () => {
    expect(worldPosition(76.89, 43.24, 812.4)).toEqual({
      lng: 76.89,
      lat: 43.24,
      elevation: 812.4,
    });
    expect(worldPosition(76.89, 43.24)).toEqual({
      lng: 76.89,
      lat: 43.24,
      elevation: null,
    });
  });
});
