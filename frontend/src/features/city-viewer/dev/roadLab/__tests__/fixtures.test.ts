import { describe, expect, it } from "vitest";
import { buildRoadLabCity } from "../fixtures";
import { buildRoadSurfaceFeatureCollection } from "../../../map/adapters/roadSurfaceGeometry";
import {
  buildLaneBoundaryFeatureCollection,
  buildLaneSurfaceFeatureCollection,
} from "../../../map/adapters/laneGeometry";
import destination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import { toLngLat } from "../../../map/adapters/coordinates";
import { toRoadLineString } from "../../../map/adapters/roadLineString";
import { buildLaneConnectorCurve } from "../../../map/geometry/laneConnection";
import { outwardBearing, pointsMatch, type LngLat } from "../../../map/geometry/nodeGeometry";
import { smoothCenterline } from "../../../map/geometry/curveSmoothing";

/** Real lane-connector endpoints sit at the junction's edge (roughly
 * where a lane crosses into the junction plate), not at the shared node
 * coordinate itself -- every incident road's stored endpoint is
 * literally the same point at the node (see roadSurfaceGeometry.ts's
 * endpoint-matching invariant), so connecting "node to node" would
 * always be a zero-length span. */
const CONNECTOR_ENDPOINT_OFFSET_M = 8;

function isFiniteRing(coords: number[][]): boolean {
  return coords.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

function isFiniteGeometry(geometry: GeoJSON.Geometry): boolean {
  switch (geometry.type) {
    case "Point":
      return geometry.coordinates.every(Number.isFinite);
    case "LineString":
      return isFiniteRing(geometry.coordinates);
    case "Polygon":
      return geometry.coordinates.every(isFiniteRing);
    case "MultiPolygon":
      return geometry.coordinates.every((poly) => poly.every(isFiniteRing));
    default:
      return true;
  }
}

describe("buildRoadLabCity", () => {
  it("is deterministic (same ids/geometry every call)", () => {
    const first = buildRoadLabCity();
    const second = buildRoadLabCity();
    expect(first.city.roads.map((r) => r.id)).toEqual(
      second.city.roads.map((r) => r.id),
    );
    expect(first.city.intersections).toEqual(second.city.intersections);
  });

  it("covers all eleven named fixtures with unique, non-overlapping grid cells", () => {
    const { cells } = buildRoadLabCity();
    expect(cells).toHaveLength(11);
    const originKeys = new Set(cells.map((c) => `${c.origin.x},${c.origin.y}`));
    expect(originKeys.size).toBe(11);
  });

  it("every road/intersection has finite coordinates", () => {
    const { city } = buildRoadLabCity();
    for (const road of city.roads) {
      for (const point of road.geometry.points) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
    for (const intersection of city.intersections) {
      expect(Number.isFinite(intersection.position.x)).toBe(true);
      expect(Number.isFinite(intersection.position.y)).toBe(true);
    }
  });

  it("every road referenced by an Intersection actually exists", () => {
    const { city } = buildRoadLabCity();
    const roadIds = new Set(city.roads.map((r) => r.id));
    for (const intersection of city.intersections) {
      for (const roadId of intersection.connected_road_ids) {
        expect(roadIds.has(roadId)).toBe(true);
      }
    }
  });

  it("produces finite, valid road-surface geometry through the real rendering pipeline", () => {
    const { city } = buildRoadLabCity();
    const fc = buildRoadSurfaceFeatureCollection(
      city.roads,
      city.intersections,
      city.coordinate_system,
    );
    expect(fc.features.length).toBeGreaterThan(0);
    for (const feature of fc.features) {
      expect(isFiniteGeometry(feature.geometry)).toBe(true);
    }
  });

  it("produces finite lane surface/boundary geometry through the real rendering pipeline", () => {
    const { city } = buildRoadLabCity();
    const surfaces = buildLaneSurfaceFeatureCollection(
      city.roads,
      city.coordinate_system,
      city.intersections,
    );
    const boundaries = buildLaneBoundaryFeatureCollection(
      city.roads,
      city.coordinate_system,
      city.intersections,
    );
    expect(surfaces.features.length).toBeGreaterThan(0);
    expect(boundaries.features.length).toBeGreaterThan(0);
    for (const feature of [...surfaces.features, ...boundaries.features]) {
      expect(isFiniteGeometry(feature.geometry)).toBe(true);
    }
  });

  it("builds a valid lane-to-lane connector curve across every pair of roads at the Four-Way junction", () => {
    const { city } = buildRoadLabCity();
    const roadById = new Map(city.roads.map((r) => [r.id, r]));
    const junction = city.intersections.find((i) => i.id === "t04-node")!;
    expect(junction).toBeDefined();

    const nodePosition = toLngLat(
      city.coordinate_system,
      junction.position,
    ) as LngLat;

    const endpoints = junction.connected_road_ids.map((roadId) => {
      const road = roadById.get(roadId)!;
      const line = toRoadLineString(city.coordinate_system, road)!;
      const coords = line.geometry.coordinates as LngLat[];
      const atEnd = pointsMatch(coords[coords.length - 1], nodePosition);
      const outwardBearingDeg = outwardBearing(nodePosition, line, atEnd);
      const point = destination(
        turfPoint(nodePosition),
        CONNECTOR_ENDPOINT_OFFSET_M,
        outwardBearingDeg,
        { units: "meters" },
      ).geometry.coordinates as LngLat;
      return { point, outwardBearingDeg };
    });

    expect(endpoints).toHaveLength(4);
    let builtAtLeastOne = false;
    for (let i = 0; i < endpoints.length; i++) {
      for (let j = 0; j < endpoints.length; j++) {
        if (i === j) continue;
        const curve = buildLaneConnectorCurve(endpoints[i], endpoints[j]);
        expect(curve).not.toBeNull();
        expect(curve!.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(
          true,
        );
        builtAtLeastOne = true;
      }
    }
    expect(builtAtLeastOne).toBe(true);
  });
});

describe("PL-005.01: minimal straight road primitive (t11-road)", () => {
  it("is a plain two-point Road with zero lanes, no intersection membership", () => {
    const { city } = buildRoadLabCity();
    const road = city.roads.find((r) => r.id === "t11-road");
    expect(road).toBeDefined();
    expect(road!.geometry.points).toHaveLength(2);
    expect(road!.lanes).toHaveLength(0);
    expect(
      city.intersections.some((i) => i.connected_road_ids.includes("t11-road")),
    ).toBe(false);
  });

  it("produces exactly one finite, non-junction road-surface polygon", () => {
    const { city } = buildRoadLabCity();
    const fc = buildRoadSurfaceFeatureCollection(
      city.roads,
      city.intersections,
      city.coordinate_system,
    );
    const feature = fc.features.find((f) => f.properties.id === "t11-road");
    expect(feature).toBeDefined();
    expect(feature!.properties.is_junction).toBe(false);

    const rings =
      feature!.geometry.type === "Polygon"
        ? feature!.geometry.coordinates
        : feature!.geometry.coordinates.flat();
    for (const ring of rings) {
      for (const [x, y] of ring) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }

    // Shoelace formula on the outer ring -- proves non-zero surface area
    // without pulling in a new @turf/area dependency for one test.
    const outerRing = rings[0];
    let area = 0;
    for (let i = 0; i < outerRing.length - 1; i++) {
      const [x1, y1] = outerRing[i];
      const [x2, y2] = outerRing[i + 1];
      area += x1 * y2 - x2 * y1;
    }
    expect(Math.abs(area) / 2).toBeGreaterThan(0);
  });

  it("keeps a two-point centerline straight (no Catmull-Rom smoothing applied)", () => {
    const { city } = buildRoadLabCity();
    const road = city.roads.find((r) => r.id === "t11-road")!;
    const line = toRoadLineString(city.coordinate_system, road)!;
    const coords = line.geometry.coordinates as LngLat[];
    expect(smoothCenterline(coords)).toEqual(coords);
  });
});
