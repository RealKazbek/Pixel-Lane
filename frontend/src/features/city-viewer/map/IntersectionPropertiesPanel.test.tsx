// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { updateIntersectionManeuver } from "../editor/intersectionManeuverState";
import type { City, Intersection, Road } from "../types/city";
import { IntersectionPropertiesPanel } from "./IntersectionPropertiesPanel";

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: { number?: number; id?: string }) => {
      const translations: Record<string, string> = {
        title: "Selected intersection",
        id: "Intersection ID",
        type: "Junction type",
        connectedRoads: "Connected roads",
        approaches: "Approaches",
        cornerRadius: "Corner radius",
        connectedRoadList: "Connected road list",
        topologySummary: `Topology node ${values?.id ?? ""}`,
        typeT: "T",
        typeFourWay: "Four-way",
        typeY: "Y / angled",
        typeMultiLeg: "Generic multi-leg",
        typeGeneric: "Generic",
        endpointA: "endpoint A",
        endpointB: "endpoint B",
        endpointUnknown: "endpoint unavailable",
        outgoingContext: "Destination lane; no maneuver is configured here.",
        "laneDirection.INBOUND": "Into intersection",
        "laneDirection.OUTBOUND": "Out of intersection",
        "maneuver.LEFT": "Left",
        "maneuver.STRAIGHT": "Straight",
        "maneuver.RIGHT": "Right",
        "maneuver.U_TURN": "U-turn",
      };
      if (key === "laneNumber") return `Lane ${values?.number ?? ""}`;
      return translations[key] ?? key;
    },
}));

const intersection: Intersection = {
  id: "j",
  city_id: "city",
  position: { x: 0, y: 0 },
  connected_road_ids: ["a", "b", "c"],
  connected_lane_ids: ["a-lane", "b-lane", "c-lane"],
  control_type: "UNCONTROLLED",
  traffic_light_id: null,
};

function road(
  id: string,
  name: string,
  points: [{ x: number; y: number }, { x: number; y: number }],
  direction: "FORWARD" | "BACKWARD",
): Road {
  return {
    id,
    city_id: "city",
    name,
    road_type: "RESIDENTIAL",
    geometry: { points },
    default_speed_limit_kmh: 30,
    lanes: [
      {
        id: `${id}-lane`,
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

const city: City = {
  id: "city",
  name: "A-J-C / B topology",
  description: null,
  coordinate_system: "LOCAL_CARTESIAN",
  created_at: "",
  updated_at: "",
  roads: [
    road(
      "a",
      "Road A",
      [
        { x: -10, y: 0 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    ),
    road(
      "b",
      "Road B",
      [
        { x: 0, y: -10 },
        { x: 0, y: 0 },
      ],
      "FORWARD",
    ),
    road(
      "c",
      "Road C",
      [
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    ),
  ],
  intersections: [intersection],
  traffic_lights: [],
  parking_zones: [],
  bus_stops: [],
  crosswalks: [],
  lane_connections: [],
};

function ManeuverPanelHarness({
  onPersist,
}: {
  onPersist: (connections: NonNullable<City["lane_connections"]>) => void;
}) {
  const [document, setDocument] = useState(city);
  return (
    <IntersectionPropertiesPanel
      intersection={intersection}
      roads={document.roads}
      onCornerRadiusChange={() => undefined}
      laneConnections={document.lane_connections ?? []}
      onManeuverChange={(roadId, laneId, movement, enabled) => {
        const next = updateIntersectionManeuver(
          document,
          "j",
          roadId,
          laneId,
          movement,
          enabled,
        );
        setDocument(next);
        onPersist(next.lane_connections ?? []);
      }}
    />
  );
}

describe("IntersectionPropertiesPanel maneuver controls", () => {
  it("updates the rendered City Model connection and toggles it off", () => {
    const onPersist = vi.fn();
    render(<ManeuverPanelHarness onPersist={onPersist} />);

    const left = screen.getByRole("button", { name: "Left" });
    const right = screen.getByRole("button", { name: "Right" });
    expect(left.getAttribute("aria-pressed")).toBe("false");
    expect(right.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(left);

    expect(left.getAttribute("aria-pressed")).toBe("true");
    expect(onPersist).toHaveBeenLastCalledWith([
      expect.objectContaining({
        intersection_id: "j",
        from_road_id: "b",
        from_lane_id: "b-lane",
        to_road_id: "a",
        to_lane_id: "a-lane",
        maneuver: "LEFT",
      }),
    ]);

    fireEvent.click(left);

    expect(left.getAttribute("aria-pressed")).toBe("false");
    expect(onPersist).toHaveBeenLastCalledWith([]);
  });
});
