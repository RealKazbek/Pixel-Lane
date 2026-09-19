import { describe, expect, it } from "vitest";
import {
  buildLaneConnectionFeatureCollection,
  buildStopLineFeatureCollection,
  deriveLaneConnections,
  validateLaneConnection,
} from "./laneConnectivity";
import type { Intersection, Lane, Road } from "../types/city";

function lane(
  id: string,
  index: number,
  direction: Lane["direction"] = "FORWARD",
  allowed_movements: Lane["allowed_movements"] = [],
): Lane {
  return {
    id,
    road_id: id.split("-")[0],
    index,
    direction,
    allowed_movements,
    lane_type: "GENERAL",
    speed_limit_kmh: null,
  };
}

function road(
  id: string,
  points: [{ x: number; y: number }, { x: number; y: number }],
  lanes: Lane[],
): Road {
  return {
    id,
    city_id: "city",
    name: id,
    road_type: "RESIDENTIAL",
    geometry: { points },
    default_speed_limit_kmh: null,
    lanes,
    width_m: 10,
    is_width_estimated: false,
  };
}

function intersection(): Intersection {
  return {
    id: "junction",
    city_id: "city",
    position: { x: 0, y: 0 },
    connected_road_ids: ["north", "south"],
    connected_lane_ids: [],
    control_type: "UNCONTROLLED",
    traffic_light_id: null,
  };
}

describe("lane connectivity domain", () => {
  it("matches equal-count incoming and outgoing lanes deterministically", () => {
    const northLane = lane("north-0", 0, "FORWARD");
    const southLane = lane("south-0", 0, "FORWARD");
    const roads = [
      road(
        "north",
        [
          { x: 0, y: 20 },
          { x: 0, y: 0 },
        ],
        [northLane],
      ),
      road(
        "south",
        [
          { x: 0, y: 0 },
          { x: 0, y: -20 },
        ],
        [southLane],
      ),
    ];
    const result = deriveLaneConnections(roads, [intersection()]);
    expect(result.issues).toEqual([]);
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0]).toMatchObject({
      from_lane_id: "north-0",
      to_lane_id: "south-0",
      maneuver: "STRAIGHT",
    });
    expect(result.connections[0].id).toContain("junction:north-0:south-0");
  });

  it("supports 2→2 and 3→3 mappings without depending on road order", () => {
    const north = road(
      "north",
      [
        { x: 0, y: 30 },
        { x: 0, y: 0 },
      ],
      [lane("north-0", 0), lane("north-1", 1), lane("north-2", 2)],
    );
    const south = road(
      "south",
      [
        { x: 0, y: 0 },
        { x: 0, y: -30 },
      ],
      [
        lane("south-0", 0, "FORWARD"),
        lane("south-1", 1, "FORWARD"),
        lane("south-2", 2, "FORWARD"),
      ],
    );
    const first = deriveLaneConnections([north, south], [intersection()]);
    const second = deriveLaneConnections([south, north], [intersection()]);
    expect(first.connections).toHaveLength(3);
    expect(second.connections).toEqual(first.connections);
  });

  it("rejects forbidden maneuvers and missing lane references", () => {
    const from = lane("north-0", 0, "FORWARD", ["LEFT"]);
    const lanes = new Map([[from.id, from]]);
    expect(
      validateLaneConnection(
        {
          id: "c",
          intersection_id: "j",
          from_lane_id: from.id,
          to_lane_id: "missing",
          maneuver: "STRAIGHT",
        },
        lanes,
      )[0].code,
    ).toBe("MISSING_LANE");
    const to = lane("south-0", 0, "BACKWARD");
    lanes.set(to.id, to);
    expect(
      validateLaneConnection(
        {
          id: "c",
          intersection_id: "j",
          from_lane_id: from.id,
          to_lane_id: to.id,
          maneuver: "STRAIGHT",
        },
        lanes,
      )[0].code,
    ).toBe("FORBIDDEN_MANEUVER");
  });

  it("derives finite connection curves and transverse stop lines", () => {
    const north = road(
      "north",
      [
        { x: 0, y: 30 },
        { x: 0, y: 0 },
      ],
      [lane("north-0", 0)],
    );
    const south = road(
      "south",
      [
        { x: 0, y: 0 },
        { x: 0, y: -30 },
      ],
      [lane("south-0", 0, "FORWARD")],
    );
    const roads = [north, south];
    const connections = buildLaneConnectionFeatureCollection(roads, [
      intersection(),
    ]);
    const stops = buildStopLineFeatureCollection(roads, [intersection()]);
    expect(connections.features).toHaveLength(1);
    expect(
      connections.features[0].geometry.coordinates.every((point) =>
        point.every(Number.isFinite),
      ),
    ).toBe(true);
    expect(stops.features).toHaveLength(2);
    expect(stops.features[0].geometry.coordinates[0]).not.toEqual(
      stops.features[0].geometry.coordinates[1],
    );
  });
});
