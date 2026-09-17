import { describe, expect, it } from "vitest";
import { EDITOR_WORLD_BOUNDS } from "../editor/editorWorld";
import { buildEditorGrid, gridIntervalForZoom } from "./grid";

describe("editor grid", () => {
  it("uses adaptive world-unit intervals", () => {
    expect(gridIntervalForZoom(12)).toBe(200);
    expect(gridIntervalForZoom(16)).toBe(50);
    expect(gridIntervalForZoom(20)).toBe(10);
  });

  it("anchors every line to the declared world bounds", () => {
    const grid = buildEditorGrid(EDITOR_WORLD_BOUNDS, "LOCAL_CARTESIAN", 16);
    expect(grid.features.length).toBeGreaterThan(0);
    for (const feature of grid.features) {
      expect(feature.geometry.coordinates).toHaveLength(2);
      for (const coordinate of feature.geometry.coordinates) {
        expect(coordinate.every(Number.isFinite)).toBe(true);
      }
    }
    expect(
      grid.features.some((feature) => feature.properties?.major === true),
    ).toBe(true);
  });
});
