import { describe, expect, it } from "vitest";
import { createEditorRoad } from "./editorWorkspace";
import {
  getLaneDirectionRelativeToIntersection,
  getRoadEndpointAtIntersection,
  laneDirectionForIntersectionDirection,
} from "./intersectionLaneDirection";
import type { Intersection } from "../types/city";

function intersectionFor(roadId: string, x: number, y: number): Intersection {
  return {
    id: `intersection-${x}-${y}`,
    city_id: "editor-workspace",
    position: { x, y },
    connected_road_ids: [roadId],
    connected_lane_ids: [],
    control_type: "UNCONTROLLED",
    traffic_light_id: null,
  };
}

describe("intersection-relative lane direction", () => {
  it("resolves A to B travel as inbound at endpoint B", () => {
    const road = createEditorRoad("road", "Road", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    const intersection = intersectionFor(road.id, 100, 0);

    expect(getRoadEndpointAtIntersection(road, intersection)).toBe("B");
    expect(
      getLaneDirectionRelativeToIntersection(road, road.lanes[0], intersection),
    ).toBe("INBOUND");
  });

  it("resolves the same A to B travel as outbound at endpoint A", () => {
    const road = createEditorRoad("road", "Road", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    const intersection = intersectionFor(road.id, 0, 0);

    expect(
      getLaneDirectionRelativeToIntersection(road, road.lanes[0], intersection),
    ).toBe("OUTBOUND");
  });

  it("maps both lanes of a two-way road to opposite semantic directions", () => {
    const road = createEditorRoad("road", "Road", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    const intersection = intersectionFor(road.id, 100, 0);

    expect(
      road.lanes.map((lane) =>
        getLaneDirectionRelativeToIntersection(road, lane, intersection),
      ),
    ).toEqual(["INBOUND", "OUTBOUND"]);
  });

  it("supports one-way inbound and outbound configuration", () => {
    const road = createEditorRoad("road", "Road", [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    const intersection = intersectionFor(road.id, 100, 0);
    const lane = road.lanes[0];

    expect(
      laneDirectionForIntersectionDirection(
        road,
        lane,
        intersection,
        "INBOUND",
      ),
    ).toBe("FORWARD");
    expect(
      laneDirectionForIntersectionDirection(
        road,
        lane,
        intersection,
        "OUTBOUND",
      ),
    ).toBe("BACKWARD");
  });

  it("does not flip when intermediate geometry changes", () => {
    const road = {
      ...createEditorRoad("road", "Road", [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      geometry: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 20 },
          { x: 100, y: 0 },
        ],
      },
    };
    const intersection = intersectionFor(road.id, 100, 0);

    expect(
      getLaneDirectionRelativeToIntersection(road, road.lanes[0], intersection),
    ).toBe("INBOUND");
  });
});
