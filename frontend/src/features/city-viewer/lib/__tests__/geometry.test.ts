import { describe, expect, it } from "vitest";
import {
  canvasToWorld,
  computeBounds,
  distancePointToPolyline,
  fitToView,
  worldToCanvas,
  zoomAt,
} from "../geometry";

describe("computeBounds", () => {
  it("computes min/max over all points", () => {
    const bounds = computeBounds([
      { x: 0, y: 5 },
      { x: 10, y: -2 },
      { x: -3, y: 8 },
    ]);
    expect(bounds).toEqual({ minX: -3, minY: -2, maxX: 10, maxY: 8 });
  });

  it("expands a single-point (zero-size) bounds so fit-to-view stays finite", () => {
    const bounds = computeBounds([{ x: 5, y: 5 }]);
    expect(bounds.maxX - bounds.minX).toBeGreaterThan(0);
    expect(bounds.maxY - bounds.minY).toBeGreaterThan(0);
  });

  it("falls back to a default box for an empty point list", () => {
    const bounds = computeBounds([]);
    expect(bounds.maxX - bounds.minX).toBeGreaterThan(0);
    expect(bounds.maxY - bounds.minY).toBeGreaterThan(0);
  });
});

describe("fitToView", () => {
  it("centers the bounds in the canvas", () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const viewport = fitToView(bounds, 400, 400, 0);
    const canvasCenter = worldToCanvas({ x: 50, y: 50 }, viewport);
    expect(canvasCenter.x).toBeCloseTo(200);
    expect(canvasCenter.y).toBeCloseTo(200);
  });

  it("scales to fit the smaller available dimension", () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 200 };
    const viewport = fitToView(bounds, 1000, 1000, 0);
    // Height (200) is the limiting dimension: scale = 1000 / 200 = 5.
    expect(viewport.scale).toBeCloseTo(5);
  });
});

describe("worldToCanvas / canvasToWorld", () => {
  it("round-trips a point through the transform", () => {
    const viewport = { scale: 2, translateX: 50, translateY: 100 };
    const world = { x: 12.5, y: -7.25 };
    const canvasPoint = worldToCanvas(world, viewport);
    const roundTripped = canvasToWorld(canvasPoint, viewport);
    expect(roundTripped.x).toBeCloseTo(world.x);
    expect(roundTripped.y).toBeCloseTo(world.y);
  });

  it("flips the Y axis (world up = screen up)", () => {
    const viewport = { scale: 1, translateX: 0, translateY: 0 };
    const canvasPoint = worldToCanvas({ x: 0, y: 10 }, viewport);
    expect(canvasPoint.y).toBeLessThan(0);
  });
});

describe("zoomAt", () => {
  it("keeps the world point under the cursor fixed", () => {
    const viewport = { scale: 1, translateX: 0, translateY: 0 };
    const cursor = { x: 150, y: 80 };
    const worldBefore = canvasToWorld(cursor, viewport);
    const zoomed = zoomAt(viewport, cursor, 2);
    const worldAfter = canvasToWorld(cursor, zoomed);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
    expect(zoomed.scale).toBeCloseTo(2);
  });
});

describe("distancePointToPolyline", () => {
  it("returns 0 for a point on the line", () => {
    const distance = distancePointToPolyline({ x: 5, y: 0 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(distance).toBeCloseTo(0);
  });

  it("returns perpendicular distance for a point off the line", () => {
    const distance = distancePointToPolyline({ x: 5, y: 3 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(distance).toBeCloseTo(3);
  });
});
