import { describe, expect, it } from "vitest";
import type { City, Road } from "../types/city";
import {
  addRoadWithEndpointSnaps,
  applyEndpointSnap,
  buildEndpointSnapTargets,
  ENDPOINT_SNAP_TOLERANCE_PX,
  finalizeEndpointDrag,
  findEndpointSnapCandidate,
  findRoadEndpointNode,
  type ScreenEndpointSnapTarget,
} from "./endpointSnapping";

function makeRoad(id: string, startX: number, endX: number): Road {
  return {
    id,
    city_id: "city-1",
    name: id,
    road_type: "ARTERIAL",
    geometry: {
      points: [
        { x: startX, y: 0 },
        { x: endX, y: 0 },
      ],
    },
    default_speed_limit_kmh: null,
    width_m: 7,
    lanes: [],
  };
}

function makeCity(
  roads = [makeRoad("road-a", 0, 10), makeRoad("road-b", 20, 30)],
): City {
  return {
    id: "city-1",
    name: "Test city",
    description: null,
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    roads,
    intersections: [],
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
  };
}

const screenTargets: ScreenEndpointSnapTarget[] = [
  {
    roadId: "road-a",
    endpoint: "end",
    point: { x: 10, y: 0 },
    nodeId: null,
    screenX: 100,
    screenY: 100,
  },
  {
    roadId: "road-c",
    endpoint: "start",
    point: { x: 11, y: 0 },
    nodeId: null,
    screenX: 106,
    screenY: 100,
  },
];

describe("endpoint snap detection", () => {
  it("finds an endpoint inside the screen-space tolerance", () => {
    expect(
      findEndpointSnapCandidate({ x: 102, y: 100 }, screenTargets, "road-b")
        ?.roadId,
    ).toBe("road-a");
  });

  it("does not snap outside the screen-space tolerance", () => {
    expect(
      findEndpointSnapCandidate(
        { x: 100 + ENDPOINT_SNAP_TOLERANCE_PX + 1, y: 130 },
        screenTargets,
        "road-b",
      ),
    ).toBeNull();
  });

  it("chooses the nearest candidate deterministically", () => {
    expect(
      findEndpointSnapCandidate({ x: 105, y: 100 }, screenTargets, "road-b")
        ?.roadId,
    ).toBe("road-c");
    expect(
      findEndpointSnapCandidate({ x: 103, y: 100 }, screenTargets, "road-b")
        ?.roadId,
    ).toBe("road-a");
  });

  it("excludes endpoints from the road currently being edited", () => {
    expect(
      findEndpointSnapCandidate({ x: 100, y: 100 }, screenTargets, "road-a")
        ?.roadId,
    ).toBe("road-c");
  });
});

describe("endpoint snap topology", () => {
  it("creates one shared node identity and canonical endpoint coordinates", () => {
    const city = makeCity();
    const target = buildEndpointSnapTargets(city).find(
      (candidate) =>
        candidate.roadId === "road-a" && candidate.endpoint === "end",
    );
    if (!target) throw new Error("Expected target endpoint");

    const result = applyEndpointSnap(city, "road-b", "start", target);
    expect(result).not.toBeNull();
    const node = result?.intersections[0];
    expect(node?.connected_road_ids).toEqual(["road-a", "road-b"]);
    expect(node?.position).toEqual({ x: 10, y: 0 });
    expect(result?.roads[0].geometry.points.at(-1)).toEqual(node?.position);
    expect(result?.roads[1].geometry.points[0]).toEqual(node?.position);
    expect(
      findRoadEndpointNode(result?.intersections ?? [], result!.roads[0], "end")
        ?.id,
    ).toBe(node?.id);
    expect(
      findRoadEndpointNode(
        result?.intersections ?? [],
        result!.roads[1],
        "start",
      )?.id,
    ).toBe(node?.id);
  });

  it("does not infer topology from identical coordinates", () => {
    const city = makeCity([
      makeRoad("road-a", 0, 10),
      makeRoad("road-b", 10, 20),
    ]);
    expect(city.intersections).toEqual([]);
    expect(
      findRoadEndpointNode(city.intersections, city.roads[0], "end"),
    ).toBeNull();
    expect(
      findRoadEndpointNode(city.intersections, city.roads[1], "start"),
    ).toBeNull();
  });

  it("reuses an existing node and its canonical position", () => {
    const city = makeCity();
    city.intersections = [
      {
        id: "node-a",
        city_id: city.id,
        position: { x: 10, y: 0 },
        connected_road_ids: ["road-a"],
        connected_lane_ids: [],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    const target = buildEndpointSnapTargets(city).find(
      (candidate) => candidate.nodeId === "node-a",
    );
    if (!target) throw new Error("Expected node target");

    const result = applyEndpointSnap(city, "road-b", "start", target);
    expect(result?.intersections).toHaveLength(1);
    expect(result?.intersections[0].id).toBe("node-a");
    expect(result?.roads[1].geometry.points[0]).toEqual({ x: 10, y: 0 });
  });

  it("preserves an existing connection when released without a new snap", () => {
    const connected = applyEndpointSnap(makeCity(), "road-b", "start", {
      roadId: "road-a",
      endpoint: "end",
      point: { x: 10, y: 0 },
      nodeId: null,
    });
    if (!connected) throw new Error("Expected connected city");
    const moved = {
      ...connected,
      roads: connected.roads.map((road) =>
        road.id === "road-b"
          ? {
              ...road,
              geometry: {
                points: [
                  { x: 14, y: 2 },
                  { x: 30, y: 0 },
                ],
              },
            }
          : road,
      ),
    };
    const result = finalizeEndpointDrag(
      moved,
      "road-b",
      "start",
      null,
      connected.intersections[0].id,
    );
    expect(result.roads[1].geometry.points[0]).toEqual({ x: 10, y: 0 });
  });

  it("keeps ordinary unsnapped endpoint editing unchanged", () => {
    const city = makeCity();
    const moved = {
      ...city,
      roads: city.roads.map((road) =>
        road.id === "road-b"
          ? {
              ...road,
              geometry: {
                points: [
                  { x: 18, y: 2 },
                  { x: 30, y: 0 },
                ],
              },
            }
          : road,
      ),
    };
    expect(
      finalizeEndpointDrag(moved, "road-b", "start", null, null).roads[1]
        .geometry.points[0],
    ).toEqual({ x: 18, y: 2 });
  });

  it("creates a road whose snapped endpoint shares the target node", () => {
    const city = makeCity([makeRoad("road-a", 0, 10)]);
    const target = buildEndpointSnapTargets(city).find(
      (candidate) =>
        candidate.roadId === "road-a" && candidate.endpoint === "end",
    );
    if (!target) throw new Error("Expected target endpoint");

    const result = addRoadWithEndpointSnaps(
      city,
      makeRoad("road-new", 10.2, 20),
      target,
      null,
    );
    expect(result?.roads).toHaveLength(2);
    expect(result?.roads[1].geometry.points[0]).toEqual({ x: 10, y: 0 });
    expect(result?.intersections[0].connected_road_ids).toEqual([
      "road-a",
      "road-new",
    ]);
  });
});
