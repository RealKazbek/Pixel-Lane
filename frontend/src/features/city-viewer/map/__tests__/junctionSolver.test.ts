import { describe, expect, it } from "vitest";
import { toLngLat } from "../adapters/coordinates";
import { toRoadLineString } from "../adapters/roadLineString";
import { solveJunction } from "../geometry/junctionSolver";
import type { IncidentRoad, LngLat } from "../geometry/nodeGeometry";

function road(points: [number, number][]) {
  return toRoadLineString("LOCAL_CARTESIAN", {
    geometry: { points: points.map(([x, y]) => ({ x, y })) },
  })!;
}

function node(x: number, y: number): LngLat {
  return toLngLat("LOCAL_CARTESIAN", { x, y });
}

function incidentRoad(
  overrides: Partial<IncidentRoad> &
    Pick<IncidentRoad, "roadId" | "line" | "atEnd">,
): IncidentRoad {
  return { halfWidthM: 4, hierarchy: "ARTERIAL", ...overrides };
}

function collectCoordinates(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): number[][] {
  const rings =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.coordinates.flat();
  return rings.flat();
}

function isFinitePolygon(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  return collectCoordinates(geometry).every(
    (c) =>
      Number.isFinite(c[0]) &&
      Number.isFinite(c[1]) &&
      Math.abs(c[0]) < 180 &&
      Math.abs(c[1]) < 90,
  );
}

describe("solveJunction", () => {
  it("returns null for fewer than 2 incident roads", () => {
    const line = road([
      [0, 0],
      [0, 40],
    ]);
    const incident = [incidentRoad({ roadId: "a", line, atEnd: true })];
    expect(solveJunction(node(0, 40), incident)).toBeNull();
  });

  it("degenerates a straight 2-road continuation to a valid, finite plate", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "north",
        line: road([
          [0, 40],
          [0, 80],
        ]),
        atEnd: false,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(new Set(result!.memberRoadIds)).toEqual(new Set(["south", "north"]));
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles a 90-degree T-junction with a compact, finite plate", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "east",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "west",
        line: road([
          [-40, 40],
          [0, 40],
        ]),
        atEnd: true,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(result!.memberRoadIds).toHaveLength(3);
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles a 4-way X-junction, unioning all four approaches", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "north",
        line: road([
          [0, 40],
          [0, 80],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "east",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "west",
        line: road([
          [-40, 40],
          [0, 40],
        ]),
        atEnd: true,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(result!.memberRoadIds).toHaveLength(4);
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles an acute/Y junction without producing degenerate geometry", () => {
    const n = node(0, 40);
    // Two roads leaving the node at a shallow ~20-degree spread.
    const incident = [
      incidentRoad({
        roadId: "stem",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "branchA",
        line: road([
          [0, 40],
          [14, 78],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "branchB",
        line: road([
          [0, 40],
          [-3, 79],
        ]),
        atEnd: false,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles an asymmetric junction where roads have very different widths", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "highway",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
        halfWidthM: 10,
        hierarchy: "HIGHWAY",
      }),
      incidentRoad({
        roadId: "sidestreet",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
        halfWidthM: 2,
        hierarchy: "RESIDENTIAL",
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("tapers a slip-road merge into a wider host road (no capsule seam)", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "avenue",
        line: road([
          [-80, 40],
          [0, 40],
        ]),
        atEnd: true,
        halfWidthM: 8,
        hierarchy: "ARTERIAL",
      }),
      incidentRoad({
        roadId: "slip",
        // Joins the avenue from a shallow angle (nearly opposite outward
        // bearing to the avenue's own, i.e. running roughly parallel).
        line: road([
          [0, 40],
          [60, 44],
        ]),
        atEnd: false,
        halfWidthM: 3,
        hierarchy: "RESIDENTIAL",
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(result!.memberRoadIds).toContain("slip");
    expect(result!.memberRoadIds).toContain("avenue");
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("is deterministic for identical input", () => {
    const n = node(0, 40);
    const build = () => [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "east",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "west",
        line: road([
          [-40, 40],
          [0, 40],
        ]),
        atEnd: true,
      }),
    ];
    const first = solveJunction(n, build());
    const second = solveJunction(n, build());
    expect(first!.polygon.geometry).toEqual(second!.polygon.geometry);
  });

  it("does not depend on incident-road creation order", () => {
    const n = node(0, 40);
    const roads = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "east",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "west",
        line: road([
          [-40, 40],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "north",
        line: road([
          [0, 40],
          [0, 80],
        ]),
        atEnd: false,
      }),
    ];
    const first = solveJunction(n, roads);
    const second = solveJunction(n, [...roads].reverse());
    expect(second!.polygon.geometry).toEqual(first!.polygon.geometry);
    expect(second!.memberRoadIds).toEqual(first!.memberRoadIds);
  });

  it("applies a requested corner radius and clamps unsafe values", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      incidentRoad({
        roadId: "east",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "west",
        line: road([
          [-40, 40],
          [0, 40],
        ]),
        atEnd: true,
      }),
    ];
    const tight = solveJunction(n, incident, { cornerRadiusM: 1 });
    const wide = solveJunction(n, incident, { cornerRadiusM: 10 });
    const clamped = solveJunction(n, incident, { cornerRadiusM: 10_000 });
    expect(tight).not.toBeNull();
    expect(wide).not.toBeNull();
    expect(clamped).not.toBeNull();
    expect(wide!.polygon.geometry).not.toEqual(tight!.polygon.geometry);
    expect(clamped!.polygon.geometry).toEqual(
      solveJunction(n, incident, { cornerRadiusM: 12 })!.polygon.geometry,
    );
  });

  it("never trims a road past its own midpoint on a very short connector", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "stub",
        line: road([
          [0, 40],
          [0, 43],
        ]),
        atEnd: false,
        halfWidthM: 6,
      }),
      incidentRoad({
        roadId: "main",
        line: road([
          [0, 40],
          [40, 40],
        ]),
        atEnd: false,
        halfWidthM: 6,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles two nearly-collinear roads (a near-180-degree continuation) without spikes", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "south",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      // 2 degrees off from a perfectly straight continuation.
      incidentRoad({
        roadId: "north",
        line: road([
          [0, 40],
          [1.4, 79.98],
        ]),
        atEnd: false,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("handles a very acute (near-zero-degree) angle between two roads without self-intersection", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "stem",
        line: road([
          [0, 0],
          [0, 40],
        ]),
        atEnd: true,
      }),
      // Branches off at only ~5 degrees from the stem's own direction.
      incidentRoad({
        roadId: "sliver",
        line: road([
          [0, 40],
          [3.5, 79.9],
        ]),
        atEnd: false,
      }),
    ];
    const result = solveJunction(n, incident);
    expect(result).not.toBeNull();
    expect(isFinitePolygon(result!.polygon.geometry)).toBe(true);
  });

  it("returns null rather than throwing when every incident line is degenerate (zero-length)", () => {
    const n = node(0, 40);
    const incident = [
      incidentRoad({
        roadId: "a",
        line: road([
          [0, 40],
          [0, 40],
        ]),
        atEnd: false,
      }),
      incidentRoad({
        roadId: "b",
        line: road([
          [0, 40],
          [0, 40],
        ]),
        atEnd: false,
      }),
    ];
    expect(() => solveJunction(n, incident)).not.toThrow();
  });
});
