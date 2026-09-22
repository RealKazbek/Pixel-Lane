import { describe, expect, it } from "vitest";
import type { Intersection, Road } from "../types/city";
import {
  getAvailableManeuvers,
  getDestinationLanesForManeuver,
} from "./intersectionManeuvers";

const intersection: Intersection = {
  id: "j",
  city_id: "city",
  position: { x: 0, y: 0 },
  connected_road_ids: ["a", "b", "c"],
  connected_lane_ids: [],
  control_type: "UNCONTROLLED",
  traffic_light_id: null,
};
function road(
  id: string,
  points: { x: number; y: number }[],
  direction: "FORWARD" | "BACKWARD" = "FORWARD",
): Road {
  return {
    id,
    city_id: "city",
    name: id,
    road_type: "RESIDENTIAL",
    geometry: { points },
    default_speed_limit_kmh: 30,
    one_way: true,
    lanes: [
      {
        id: `${id}-l`,
        road_id: id,
        index: 0,
        direction,
        allowed_movements: [],
        lane_type: "GENERAL",
        speed_limit_kmh: 30,
      },
    ],
  };
}

describe("intersection maneuver topology", () => {
  it("does not offer straight when a T approach has no straight destination", () => {
    const incoming = road("b", [
      { x: 0, y: -10 },
      { x: 0, y: 0 },
    ]);
    const left = road(
      "a",
      [
        { x: -10, y: 0 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    );
    const right = road(
      "c",
      [
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    );
    expect(
      getAvailableManeuvers(incoming, intersection, [incoming, left, right]),
    ).toEqual(["LEFT", "RIGHT"]);
    expect(
      getDestinationLanesForManeuver(
        incoming,
        incoming.lanes[0].id,
        intersection,
        [incoming, left, right],
        "LEFT",
      ),
    ).toEqual([{ road: left, lane: left.lanes[0] }]);
  });

  it("derives road-level reversal without changing the intersection model", () => {
    const incoming = road(
      "b",
      [
        { x: 0, y: -10 },
        { x: 0, y: 0 },
      ],
      "FORWARD",
    );
    const outgoing = road(
      "b-reversed",
      [
        { x: 0, y: -10 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    );
    expect(incoming.lanes[0].direction).toBe("FORWARD");
    expect(outgoing.lanes[0].direction).toBe("BACKWARD");
  });

  it("offers only a U-turn to the outbound lane on the same road", () => {
    const twoWay = road("a", [
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    ]);
    twoWay.lanes.push({
      ...twoWay.lanes[0],
      id: "a-outbound",
      index: 1,
      direction: "BACKWARD",
    });
    const sameRoadIntersection = {
      ...intersection,
      connected_road_ids: [twoWay.id],
      connected_lane_ids: twoWay.lanes.map((lane) => lane.id),
    };

    expect(
      getAvailableManeuvers(twoWay, sameRoadIntersection, [twoWay]),
    ).toEqual(["U_TURN"]);
    expect(
      getDestinationLanesForManeuver(
        twoWay,
        twoWay.lanes[0].id,
        sameRoadIntersection,
        [twoWay],
        "U_TURN",
      ),
    ).toEqual([{ road: twoWay, lane: twoWay.lanes[1] }]);
    expect(
      getDestinationLanesForManeuver(
        twoWay,
        twoWay.lanes[0].id,
        sameRoadIntersection,
        [twoWay],
        "LEFT",
      ),
    ).toEqual([]);
  });
});
