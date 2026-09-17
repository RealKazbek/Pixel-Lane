import { describe, expect, it } from "vitest";
import { updateRoadEndpoint } from "./endpointEditing";

describe("updateRoadEndpoint", () => {
  const points: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  it("changes only the requested endpoint", () => {
    expect(updateRoadEndpoint(points, 0, { x: 2, y: 3 })).toEqual([
      { x: 2, y: 3 },
      { x: 10, y: 0 },
    ]);
    expect(updateRoadEndpoint(points, 1, { x: 12, y: 3 })).toEqual([
      { x: 0, y: 0 },
      { x: 12, y: 3 },
    ]);
  });

  it("rejects invalid and degenerate moves", () => {
    expect(updateRoadEndpoint(points, 0, { x: 10, y: 0 })).toBeNull();
    expect(updateRoadEndpoint(points, 1, { x: Number.NaN, y: 0 })).toBeNull();
  });
});
