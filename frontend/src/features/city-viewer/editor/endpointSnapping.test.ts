import { describe, expect, it } from "vitest";
import type { City, Road } from "../types/city";
import {
  addRoadWithEndpointSnaps,
  applyEndpointSnap,
  buildEndpointSnapTargets,
  buildRoadSegmentSnapTargets,
  ENDPOINT_SNAP_TOLERANCE_PX,
  finalizeEndpointDrag,
  findEndpointSnapCandidate,
  findRoadEndpointNode,
  moveConnectedRoadNode,
  type EndpointSnapTarget,
  type RoadEndpoint,
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

function endpointTarget(
  roadId: string,
  endpoint: RoadEndpoint,
  point: { x: number; y: number },
  nodeId: string | null = null,
): EndpointSnapTarget {
  return {
    kind: "road-endpoint",
    targetId: `road:${roadId}:${endpoint}`,
    roadId,
    endpoint,
    point,
    nodeId,
  };
}

const screenTargets: ScreenEndpointSnapTarget[] = [
  {
    kind: "road-endpoint",
    targetId: "road:road-a:end",
    roadId: "road-a",
    endpoint: "end",
    point: { x: 10, y: 0 },
    nodeId: null,
    screenX: 100,
    screenY: 100,
  },
  {
    kind: "road-endpoint",
    targetId: "road:road-c:start",
    roadId: "road-c",
    endpoint: "start",
    point: { x: 11, y: 0 },
    nodeId: null,
    screenX: 106,
    screenY: 100,
  },
];

describe("endpoint snap detection", () => {
  it("snaps to another road's end endpoint inside tolerance", () => {
    expect(
      findEndpointSnapCandidate({ x: 102, y: 100 }, screenTargets, "road-b")
        ?.targetId,
    ).toBe("road:road-a:end");
  });

  it("snaps to another road's start endpoint inside tolerance", () => {
    expect(
      findEndpointSnapCandidate({ x: 106, y: 100 }, screenTargets, "road-b")
        ?.targetId,
    ).toBe("road:road-c:start");
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
        ?.targetId,
    ).toBe("road:road-c:start");
    expect(
      findEndpointSnapCandidate({ x: 103, y: 100 }, screenTargets, "road-b")
        ?.targetId,
    ).toBe("road:road-a:end");
  });

  it("excludes endpoints from the road currently being edited", () => {
    expect(
      findEndpointSnapCandidate({ x: 100, y: 100 }, screenTargets, "road-a")
        ?.targetId,
    ).toBe("road:road-c:start");
  });

  it("does not generate or select intermediate segment vertices", () => {
    const road = makeRoad("road-a", 0, 100);
    road.geometry.points.splice(1, 0, { x: 50, y: 0 });
    const targets = buildEndpointSnapTargets(makeCity([road]));
    expect(targets).toHaveLength(2);
    expect(targets.map((target) => target.point)).toEqual([
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ]);

    const screenTargetsAtEndpoints: ScreenEndpointSnapTarget[] = targets.map(
      (target) => ({
        ...target,
        screenX: target.point.x,
        screenY: target.point.y,
      }),
    );
    expect(
      findEndpointSnapCandidate(
        { x: 50, y: 8 },
        screenTargetsAtEndpoints,
        "road-b",
      ),
    ).toBeNull();
    expect(
      findEndpointSnapCandidate(
        { x: 50, y: 0 },
        screenTargetsAtEndpoints,
        "road-b",
      ),
    ).toBeNull();
  });

  it("does not snap directly over the middle of a road segment", () => {
    const city = makeCity([makeRoad("road-a", 0, 100)]);
    const targets = buildEndpointSnapTargets(city).map((target) => ({
      ...target,
      screenX: target.point.x,
      screenY: target.point.y,
    }));

    expect(
      findEndpointSnapCandidate({ x: 50, y: 0 }, targets, "road-b"),
    ).toBeNull();
  });

  it("creates a segment candidate for every ordered centerline segment", () => {
    const road = makeRoad("road-a", 0, 100);
    road.geometry.points.splice(1, 0, { x: 40, y: 20 });
    expect(buildRoadSegmentSnapTargets(makeCity([road]))).toEqual([
      expect.objectContaining({
        roadId: "road-a",
        segmentIndex: 0,
        point: { x: 0, y: 0 },
      }),
      expect.objectContaining({
        roadId: "road-a",
        segmentIndex: 1,
        point: { x: 40, y: 20 },
      }),
    ]);
  });

  it("excludes an explicit node already connected to the moving road", () => {
    const city = makeCity([makeRoad("road-a", 0, 100)]);
    city.intersections = [
      {
        id: "node-a",
        city_id: city.id,
        position: { x: 50, y: 0 },
        connected_road_ids: ["road-a", "road-b"],
        connected_lane_ids: [],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    const targets = buildEndpointSnapTargets(city).map((target) => ({
      ...target,
      screenX: target.point.x,
      screenY: target.point.y,
    }));

    expect(
      findEndpointSnapCandidate({ x: 50, y: 0 }, targets, "road-b"),
    ).toBeNull();
  });
});

describe("endpoint snap topology", () => {
  it("moves every road connected to one shared node", () => {
    const city = makeCity([
      makeRoad("road-ab", 0, 100),
      makeRoad("road-bc", 100, 200),
      makeRoad("road-bd", 100, 300),
    ]);
    const connected = applyEndpointSnap(
      city,
      "road-bc",
      "start",
      endpointTarget("road-ab", "end", { x: 100, y: 0 }),
    );
    if (!connected) throw new Error("Expected connected city");
    const withThirdRoad = applyEndpointSnap(
      connected,
      "road-bd",
      "start",
      endpointTarget(
        "road-ab",
        "end",
        { x: 100, y: 0 },
        connected.intersections[0].id,
      ),
    );
    if (!withThirdRoad) throw new Error("Expected three-road node");

    const moved = moveConnectedRoadNode(withThirdRoad, "road-ab", "end", {
      x: 120,
      y: 25,
    });
    expect(moved.intersections[0].position).toEqual({ x: 120, y: 25 });
    expect(moved.roads.map((road) => road.geometry.points[0])).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 25 },
      { x: 120, y: 25 },
    ]);
    expect(moved.roads.map((road) => road.id)).toEqual([
      "road-ab",
      "road-bc",
      "road-bd",
    ]);
  });

  it("splits a target segment and shares the new node with the moving road", () => {
    const city = makeCity([
      makeRoad("road-a", 0, 100),
      makeRoad("road-b", 200, 300),
    ]);
    city.roads[0] = {
      ...city.roads[0],
      name: "Main Road",
      width_m: 12,
      lanes: [
        {
          id: "lane-a",
          road_id: "road-a",
          index: 0,
          direction: "FORWARD",
          allowed_movements: [],
          lane_type: "GENERAL",
          speed_limit_kmh: null,
        },
      ],
    };
    const target = buildRoadSegmentSnapTargets(city).find(
      (candidate) => candidate.roadId === "road-a",
    );
    if (!target) throw new Error("Expected segment target");
    const segmentTarget = { ...target, point: { x: 50, y: 0 } };

    const result = applyEndpointSnap(city, "road-b", "start", segmentTarget);
    expect(result).not.toBeNull();
    expect(result?.roads.map((road) => road.id)).toEqual([
      "road-a",
      "road-a-split-0",
      "road-b",
    ]);
    expect(result?.roads[0].geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ]);
    expect(result?.roads[1].geometry.points).toEqual([
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(result?.roads[0].name).toBe("Main Road");
    expect(result?.roads[1].name).toBe("Main Road");
    expect(result?.roads[0].width_m).toBe(12);
    expect(result?.roads[1].width_m).toBe(12);
    expect(result?.roads[0].lanes).toEqual(result?.roads[1].lanes);
    expect(
      result?.roads.every((road) =>
        road.geometry.points.every(
          (point, index, points) =>
            index === 0 ||
            Math.hypot(
              point.x - points[index - 1].x,
              point.y - points[index - 1].y,
            ) >= 1,
        ),
      ),
    ).toBe(true);
    expect(result?.roads[2].geometry.points[0]).toEqual({ x: 50, y: 0 });
    expect(result?.intersections).toHaveLength(1);
    expect(result?.intersections[0].connected_road_ids).toEqual([
      "road-a",
      "road-a-split-0",
      "road-b",
    ]);
  });

  it("preserves multi-segment ordering when splitting the nearest segment", () => {
    const targetRoad = makeRoad("road-a", 0, 100);
    targetRoad.geometry.points = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
      { x: 100, y: 0 },
    ];
    const city = makeCity([targetRoad, makeRoad("road-b", 200, 300)]);
    const target = buildRoadSegmentSnapTargets(city).find(
      (candidate) => candidate.segmentIndex === 1,
    );
    if (!target) throw new Error("Expected second segment target");

    const result = applyEndpointSnap(city, "road-b", "start", {
      ...target,
      point: { x: 65, y: 20 },
    });
    expect(result?.roads[0].geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 40 },
      { x: 65, y: 20 },
    ]);
    expect(result?.roads[1].geometry.points).toEqual([
      { x: 65, y: 20 },
      { x: 100, y: 0 },
    ]);
  });

  it("creates one shared node identity and canonical endpoint coordinates", () => {
    const city = makeCity();
    const target = buildEndpointSnapTargets(city).find(
      (candidate) =>
        candidate.kind === "road-endpoint" &&
        candidate.roadId === "road-a" &&
        candidate.endpoint === "end",
    );
    if (!target) throw new Error("Expected target endpoint");

    const result = applyEndpointSnap(city, "road-b", "start", target);
    expect(result).not.toBeNull();
    const node = result?.intersections[0];
    expect(node?.connected_road_ids).toEqual(["road-a", "road-b"]);
    expect(node?.position).toEqual({ x: 10, y: 0 });
    expect(result?.roads[0].geometry.points.at(-1)).toEqual(node?.position);
    expect(result?.roads[1].geometry.points[0]).toEqual(node?.position);
    expect(result?.roads[0]).toBe(city.roads[0]);
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

  it("persists every lane on roads connected to a snapped node", () => {
    const first = makeRoad("road-a", 0, 10);
    first.lanes = [
      { id: "lane-a-0", road_id: first.id, index: 0, direction: "FORWARD", allowed_movements: [], lane_type: "GENERAL", speed_limit_kmh: null },
      { id: "lane-a-1", road_id: first.id, index: 1, direction: "BACKWARD", allowed_movements: [], lane_type: "GENERAL", speed_limit_kmh: null },
    ];
    const second = makeRoad("road-b", 20, 30);
    second.lanes = [
      { id: "lane-b-0", road_id: second.id, index: 0, direction: "FORWARD", allowed_movements: [], lane_type: "GENERAL", speed_limit_kmh: null },
      { id: "lane-b-1", road_id: second.id, index: 1, direction: "BACKWARD", allowed_movements: [], lane_type: "GENERAL", speed_limit_kmh: null },
    ];
    const result = applyEndpointSnap(
      makeCity([first, second]),
      second.id,
      "start",
      endpointTarget(first.id, "end", { x: 10, y: 0 }),
    );

    expect(result?.intersections[0].connected_lane_ids).toEqual([
      "lane-a-0",
      "lane-a-1",
      "lane-b-0",
      "lane-b-1",
    ]);
  });

  it.each([0, 0.5, 1])(
    "reuses an existing intersection %s m away instead of creating a duplicate",
    (offset) => {
      const first = makeRoad("road-a", 0, 10);
      const second = makeRoad("road-b", 20, 30);
      const city = makeCity([first, second]);
      city.intersections = [
        {
          id: "canonical-node",
          city_id: city.id,
          position: { x: 10 + offset, y: 0 },
          connected_road_ids: [first.id],
          connected_lane_ids: first.lanes.map((lane) => lane.id),
          control_type: "UNCONTROLLED",
          traffic_light_id: null,
        },
      ];
      const result = applyEndpointSnap(
        city,
        second.id,
        "start",
        endpointTarget(first.id, "end", { x: 10, y: 0 }),
      );

      expect(result?.intersections).toHaveLength(1);
      expect(result?.intersections[0].id).toBe("canonical-node");
    },
  );

  it("allows a new intersection outside the canonical snap tolerance", () => {
    const first = makeRoad("road-a", 0, 10);
    const second = makeRoad("road-b", 20, 30);
    const city = makeCity([first, second]);
    city.intersections = [
      {
        id: "canonical-node",
        city_id: city.id,
        position: { x: 12, y: 0 },
        connected_road_ids: [first.id],
        connected_lane_ids: first.lanes.map((lane) => lane.id),
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    const result = applyEndpointSnap(
      city,
      second.id,
      "start",
      endpointTarget(first.id, "end", { x: 10, y: 0 }),
    );

    expect(result?.intersections).toHaveLength(2);
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

  it("keeps visually crossing roads topologically disconnected", () => {
    const horizontal = makeRoad("road-a", 0, 100);
    const vertical = makeRoad("road-b", 50, 50);
    vertical.geometry.points = [
      { x: 50, y: -50 },
      { x: 50, y: 50 },
    ];
    const city = makeCity([horizontal, vertical]);

    expect(city.intersections).toEqual([]);
    expect(
      buildEndpointSnapTargets(city).some(
        (target) => target.point.x === 50 && target.point.y === 0,
      ),
    ).toBe(false);
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

  it("supports an existing explicit node without projecting onto a segment", () => {
    const city = makeCity();
    city.intersections = [
      {
        id: "node-explicit",
        city_id: city.id,
        position: { x: 15, y: 8 },
        connected_road_ids: [],
        connected_lane_ids: [],
        control_type: "UNCONTROLLED",
        traffic_light_id: null,
      },
    ];
    const target = buildEndpointSnapTargets(city).find(
      (candidate) => candidate.targetId === "node:node-explicit",
    );
    if (!target) throw new Error("Expected explicit node target");

    const result = applyEndpointSnap(city, "road-b", "start", target);
    expect(result?.roads[1].geometry.points[0]).toEqual({ x: 15, y: 8 });
    expect(result?.intersections[0].connected_road_ids).toEqual(["road-b"]);
    expect(result?.roads[0]).toBe(city.roads[0]);
  });

  it("preserves an existing connection when released without a new snap", () => {
    const connected = applyEndpointSnap(
      makeCity(),
      "road-b",
      "start",
      endpointTarget("road-a", "end", { x: 10, y: 0 }),
    );
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
        candidate.kind === "road-endpoint" &&
        candidate.roadId === "road-a" &&
        candidate.endpoint === "end",
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
