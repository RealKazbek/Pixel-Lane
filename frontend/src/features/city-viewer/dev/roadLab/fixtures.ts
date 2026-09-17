/**
 * Road Geometry Lab fixtures -- a deterministic, isolated `City` payload
 * (never touching the backend/database) that exercises every road/
 * junction primitive the rendering pipeline must handle correctly,
 * before applying any of it to Demo City or real Almaty.
 *
 * Renders through the exact same domain types (`Road`/`Lane`/
 * `Intersection`) and the exact same pipeline (`adapters/`, `geometry/`,
 * `layers/`) as Demo City and Real Almaty -- see docs/road-geometry.md.
 * This is intentionally NOT a static SVG mockup: it's a real, tiny
 * `LOCAL_CARTESIAN` City, laid out as a grid of ten labeled, generously
 * spaced test cells so each primitive can be inspected on its own.
 *
 * Mirrors `backend/app/city/examples/demo_district.py`'s generator
 * pattern (a `_RoadBuilder`-style helper, deterministic ids), just in
 * TypeScript and client-only since this never needs to be persisted.
 */

import type {
  City,
  Intersection,
  IntersectionControlType,
  Lane,
  LaneDirection,
  LaneType,
  MedianType,
  MovementType,
  Point,
  Road,
  RoadType,
  TurnLaneType,
} from "../../types/city";

const CELL_WIDTH = 220;
const CELL_HEIGHT = 220;
const COLUMNS = 5;

interface LaneSpec {
  index: number;
  direction?: LaneDirection;
  lane_type?: LaneType;
  allowed_movements?: MovementType[];
  allowed_turns?: TurnLaneType[];
}

class LabCityBuilder {
  roads: Road[] = [];
  intersections: Intersection[] = [];
  private laneIdsByKey = new Map<string, string>();

  /** `origin` places this fixture's local (0,0) at a grid cell -- every
   * fixture builder below works in its own small local coordinate space
   * so cells never need to be manually kept apart by hand. */
  cellOrigin(cellIndex: number): Point {
    return {
      x: (cellIndex % COLUMNS) * CELL_WIDTH,
      y: Math.floor(cellIndex / COLUMNS) * CELL_HEIGHT,
    };
  }

  private toWorld(origin: Point, local: [number, number]): Point {
    return { x: origin.x + local[0], y: origin.y + local[1] };
  }

  addRoad(
    id: string,
    name: string,
    origin: Point,
    opts: {
      road_type: RoadType;
      points: [number, number][];
      lanes: LaneSpec[];
      one_way?: boolean;
      median?: MedianType;
      speed_limit_kmh?: number;
    },
  ): string {
    const lanes: Lane[] = opts.lanes.map((spec) => {
      const laneId = `${id}-lane-${spec.index}`;
      this.laneIdsByKey.set(`${id}:${spec.index}`, laneId);
      return {
        id: laneId,
        road_id: id,
        index: spec.index,
        direction: spec.direction ?? "FORWARD",
        allowed_movements: spec.allowed_movements ?? ["STRAIGHT"],
        lane_type: spec.lane_type ?? "GENERAL",
        speed_limit_kmh: null,
        allowed_turns: spec.allowed_turns ?? null,
      };
    });
    this.roads.push({
      id,
      city_id: LAB_CITY_ID,
      name,
      road_type: opts.road_type,
      geometry: { points: opts.points.map((p) => this.toWorld(origin, p)) },
      default_speed_limit_kmh: opts.speed_limit_kmh ?? 40,
      one_way: opts.one_way ?? true,
      median: opts.median ?? "NONE",
      carriageway_count: 1,
      width_m: undefined,
      lanes,
    });
    return id;
  }

  laneId(roadId: string, index: number): string {
    const id = this.laneIdsByKey.get(`${roadId}:${index}`);
    if (!id) throw new Error(`No lane ${index} registered for road ${roadId}`);
    return id;
  }

  addIntersection(
    id: string,
    origin: Point,
    local: [number, number],
    connectedRoadIds: string[],
    opts: {
      connected_lane_ids?: string[];
      control_type?: IntersectionControlType;
    } = {},
  ): void {
    this.intersections.push({
      id,
      city_id: LAB_CITY_ID,
      position: this.toWorld(origin, local),
      connected_road_ids: connectedRoadIds,
      connected_lane_ids: opts.connected_lane_ids ?? [],
      control_type: opts.control_type ?? "UNCONTROLLED",
      traffic_light_id: null,
    });
  }
}

export const LAB_CITY_ID = "road-lab";

function buildTest01Straight(b: LabCityBuilder, origin: Point): void {
  // 2 lanes, one-way, straight -- clean boundaries + end caps + lane
  // separator, no junction involved at all.
  b.addRoad("t01-road", "01 Straight", origin, {
    road_type: "ARTERIAL",
    points: [
      [-70, 0],
      [70, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
  });
}

function buildTest02Curve(b: LabCityBuilder, origin: Point): void {
  // A gentle S-curve -- exercises Catmull-Rom smoothing
  // (geometry/curveSmoothing.ts) without forcing artificial curvature
  // into what would otherwise be a straight road.
  b.addRoad("t02-road", "02 Curve", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 40],
      [-30, 40],
      [10, -10],
      [50, -30],
      [80, -30],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
  });
}

function buildTest03TJunction(b: LabCityBuilder, origin: Point): void {
  const south = b.addRoad("t03-south", "03 T Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 80],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const east = b.addRoad("t03-east", "03 T Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [80, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const west = b.addRoad("t03-west", "03 T Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 0],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection("t03-node", origin, [0, 0], [south, east, west], {
    control_type: "STOP_SIGN",
  });
}

function buildTest04FourWay(b: LabCityBuilder, origin: Point): void {
  // Every incident road's stored centerline must reach exactly to the
  // node position -- the junction solver does its own internal visual
  // trimming (node radius) from that real endpoint; the stored/domain
  // geometry itself must never be pre-trimmed, or the road never
  // registers as incident to the Intersection at all (see
  // roadSurfaceGeometry.ts's endpoint-matching).
  const south = b.addRoad("t04-south", "04 Four-Way", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 80],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const north = b.addRoad("t04-north", "04 Four-Way", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [0, -80],
    ],
    lanes: [{ index: 0 }],
  });
  const east = b.addRoad("t04-east", "04 Four-Way", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [80, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const west = b.addRoad("t04-west", "04 Four-Way", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 0],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection(
    "t04-node",
    origin,
    [0, 0],
    [south, north, east, west],
    { control_type: "TRAFFIC_LIGHT" },
  );
}

function buildTest05YJunction(b: LabCityBuilder, origin: Point): void {
  const stem = b.addRoad("t05-stem", "05 Y Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 0],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const branchNorth = b.addRoad("t05-branch-n", "05 Y Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [70, -35],
    ],
    lanes: [{ index: 0 }],
  });
  const branchSouth = b.addRoad("t05-branch-s", "05 Y Junction", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [70, 35],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection(
    "t05-node",
    origin,
    [0, 0],
    [stem, branchNorth, branchSouth],
  );
}

function buildTest06Merge(b: LabCityBuilder, origin: Point): void {
  // A narrow slip road merging into a wide host road at a shallow angle
  // -- exercises geometry/mergeTaper.ts's `isMergeCandidate` heuristic.
  // The host is a real graph node here too (split into an approach and a
  // continuation segment, like any other junction -- a merge point is
  // topologically a 3-way junction, not an exception to "every road must
  // actually terminate at the node it connects to").
  const hostApproach = b.addRoad("t06-host-approach", "06 Merge", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 10],
      [0, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
  });
  const hostContinuation = b.addRoad("t06-host-continuation", "06 Merge", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [80, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
  });
  const slip = b.addRoad("t06-slip", "06 Merge (slip)", origin, {
    road_type: "COLLECTOR",
    points: [
      [-70, -40],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection(
    "t06-node",
    origin,
    [0, 0],
    [hostApproach, hostContinuation, slip],
  );
}

function buildTest07Split(b: LabCityBuilder, origin: Point): void {
  // The mirror of Test 06: one single-lane approach diverging into two
  // single-lane branches.
  const approach = b.addRoad("t07-approach", "07 Split", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, 0],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const branchA = b.addRoad("t07-branch-a", "07 Split", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [80, -35],
    ],
    lanes: [{ index: 0 }],
  });
  const branchB = b.addRoad("t07-branch-b", "07 Split", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [80, 35],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection("t07-node", origin, [0, 0], [approach, branchA, branchB]);
}

function buildTest08LaneTransition(b: LabCityBuilder, origin: Point): void {
  // 4 lanes -> 3 lanes -> 2 lanes across three sequential one-way
  // segments sharing nodes -- the same "sequential Roads with different
  // lane counts" mechanism a real OSM import already produces, chained
  // twice to exercise a double taper.
  const seg4 = b.addRoad("t08-seg-4", "08 Lane Transition", origin, {
    road_type: "ARTERIAL",
    points: [
      [-90, 0],
      [-30, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }, { index: 2 }, { index: 3 }],
  });
  const seg3 = b.addRoad("t08-seg-3", "08 Lane Transition", origin, {
    road_type: "ARTERIAL",
    points: [
      [-30, 0],
      [30, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }, { index: 2 }],
  });
  const seg2 = b.addRoad("t08-seg-2", "08 Lane Transition", origin, {
    road_type: "ARTERIAL",
    points: [
      [30, 0],
      [90, 0],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
  });
  b.addIntersection("t08-node-a", origin, [-30, 0], [seg4, seg3]);
  b.addIntersection("t08-node-b", origin, [30, 0], [seg3, seg2]);
}

function buildTest09Median(b: LabCityBuilder, origin: Point): void {
  // Two physically separated one-way carriageways -- the median is the
  // real coordinate gap between them, matching Turan Avenue's pattern in
  // Demo City (see docs/city-model.md).
  b.addRoad("t09-eastbound", "09 Median", origin, {
    road_type: "ARTERIAL",
    points: [
      [-80, -6],
      [80, -6],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
    median: "PHYSICAL",
  });
  b.addRoad("t09-westbound", "09 Median", origin, {
    road_type: "ARTERIAL",
    points: [
      [80, 6],
      [-80, 6],
    ],
    lanes: [{ index: 0 }, { index: 1 }],
    median: "PHYSICAL",
  });
}

function buildTest10TurnPocket(b: LabCityBuilder, origin: Point): void {
  const approach = b.addRoad("t10-approach", "10 Turn Pocket", origin, {
    road_type: "ARTERIAL",
    points: [
      [-90, 0],
      [0, 0],
    ],
    lanes: [
      { index: 0 },
      {
        index: 1,
        lane_type: "TURN_ONLY",
        allowed_movements: ["RIGHT"],
        allowed_turns: ["RIGHT"],
      },
    ],
  });
  const through = b.addRoad("t10-through", "10 Turn Pocket", origin, {
    road_type: "ARTERIAL",
    points: [
      [0, 0],
      [90, 0],
    ],
    lanes: [{ index: 0 }],
  });
  const cross = b.addRoad("t10-cross", "10 Turn Pocket (cross)", origin, {
    road_type: "COLLECTOR",
    points: [
      [0, -60],
      [0, 0],
    ],
    lanes: [{ index: 0 }],
  });
  b.addIntersection(
    "t10-node",
    origin,
    [0, 0],
    [approach, through, cross],
    {
      connected_lane_ids: [b.laneId(approach, 0), b.laneId(approach, 1)],
      control_type: "STOP_SIGN",
    },
  );
}

function buildTest11MinimalPrimitive(b: LabCityBuilder, origin: Point): void {
  // PL-005.01: the smallest possible road primitive -- two endpoints, one
  // straight centerline, one fixed-width surface, zero lanes. No lane
  // markings, no intersection, no traffic control, no simulation. Width
  // comes from roadWidthMeters()'s existing lane-count fallback (this
  // fixture deliberately does not thread a custom width_m through the Lab
  // builder -- explicit road-width configuration is PL-005.06's scope).
  b.addRoad("t11-road", "11 Minimal Primitive", origin, {
    road_type: "ARTERIAL",
    points: [
      [-60, 0],
      [60, 0],
    ],
    lanes: [],
  });
}

const FIXTURE_BUILDERS: {
  id: string;
  label: string;
  build: (b: LabCityBuilder, origin: Point) => void;
}[] = [
  { id: "01", label: "01 Straight", build: buildTest01Straight },
  { id: "02", label: "02 Curve", build: buildTest02Curve },
  { id: "03", label: "03 T Junction", build: buildTest03TJunction },
  { id: "04", label: "04 Four-Way", build: buildTest04FourWay },
  { id: "05", label: "05 Y Junction", build: buildTest05YJunction },
  { id: "06", label: "06 Merge", build: buildTest06Merge },
  { id: "07", label: "07 Split", build: buildTest07Split },
  { id: "08", label: "08 Lane Transition", build: buildTest08LaneTransition },
  { id: "09", label: "09 Median", build: buildTest09Median },
  { id: "10", label: "10 Turn Pocket", build: buildTest10TurnPocket },
  { id: "11", label: "11 Minimal Primitive", build: buildTest11MinimalPrimitive },
];

export interface RoadLabCell {
  id: string;
  label: string;
  origin: Point;
}

/** Builds the full Road Geometry Lab `City` plus each fixture's grid
 * origin (for a "jump to test" UI) -- deterministic every call. */
export function buildRoadLabCity(): { city: City; cells: RoadLabCell[] } {
  const b = new LabCityBuilder();
  const cells: RoadLabCell[] = [];

  FIXTURE_BUILDERS.forEach((fixture, index) => {
    const origin = b.cellOrigin(index);
    fixture.build(b, origin);
    cells.push({ id: fixture.id, label: fixture.label, origin });
  });

  const now = new Date(0).toISOString();
  const city: City = {
    id: LAB_CITY_ID,
    name: "Road Geometry Lab",
    description:
      "Deterministic, isolated road/junction primitives for validating the rendering geometry pipeline -- never persisted, never sent to the backend.",
    coordinate_system: "LOCAL_CARTESIAN",
    created_at: now,
    updated_at: now,
    roads: b.roads,
    intersections: b.intersections,
    traffic_lights: [],
    parking_zones: [],
    bus_stops: [],
    crosswalks: [],
  };

  return { city, cells };
}
