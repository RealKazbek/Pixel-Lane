// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { City, Intersection, Road } from "../types/city";
import { CityViewerApp } from "./CityViewerApp";
import { getEditorWorkspace, replaceLaneConnections } from "../api/cities";

vi.mock("../api/cities", () => ({
  buildRoadPropertiesPayload: vi.fn(() => ({})),
  deleteRoad: vi.fn(),
  getEditorWorkspace: vi.fn(),
  replaceLaneConnections: vi.fn(),
  replaceTopology: vi.fn(),
  updateRoadGeometry: vi.fn(),
  updateRoadProperties: vi.fn(),
}));

vi.mock("../map/PixelLaneMap", () => ({
  PixelLaneMap: ({
    onSelect,
  }: {
    onSelect: (selection: { type: "intersection"; id: string }) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => onSelect({ type: "intersection", id: "j" })}
      >
        Select intersection
      </button>
      <output data-testid="camera-state">center=0,0;zoom=10;bearing=37</output>
    </>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: { number?: number; id?: string }) => {
      const translations: Record<string, string> = {
        "maneuver.LEFT": "Left",
        "maneuver.RIGHT": "Right",
        "laneDirection.INBOUND": "Into intersection",
        "laneDirection.OUTBOUND": "Out of intersection",
        topologySummary: `Topology node ${values?.id ?? ""}`,
        laneNumber: `Lane ${values?.number ?? ""}`,
      };
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
  points: [{ x: number; y: number }, { x: number; y: number }],
  direction: "FORWARD" | "BACKWARD",
): Road {
  return {
    id,
    city_id: "city",
    name: `Road ${id.toUpperCase()}`,
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
  name: "T-junction",
  description: null,
  coordinate_system: "LOCAL_CARTESIAN",
  created_at: "",
  updated_at: "",
  roads: [
    road(
      "a",
      [
        { x: -10, y: 0 },
        { x: 0, y: 0 },
      ],
      "BACKWARD",
    ),
    road(
      "b",
      [
        { x: 0, y: -10 },
        { x: 0, y: 0 },
      ],
      "FORWARD",
    ),
    road(
      "c",
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

describe("CityViewerApp live maneuver path", () => {
  beforeEach(() => {
    vi.mocked(getEditorWorkspace).mockResolvedValue(city);
    vi.mocked(replaceLaneConnections).mockImplementation(
      async (_cityId, connections) =>
        connections.map((connection) => ({ ...connection, city_id: city.id })),
    );
  });

  it("activates the same rendered Left button after a user click", async () => {
    const user = userEvent.setup();
    render(<CityViewerApp />);

    await user.click(
      await screen.findByRole("button", { name: "Select intersection" }),
    );
    const left = screen.getByRole("button", { name: "Left" });
    expect(screen.getByRole("button", { name: "Right" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Straight" })).toBeNull();
    expect(left.getAttribute("aria-pressed")).toBe("false");

    await user.click(left);

    expect(left.getAttribute("aria-pressed")).toBe("true");
    expect(vi.mocked(replaceLaneConnections)).toHaveBeenLastCalledWith(
      "city",
      expect.arrayContaining([
        expect.objectContaining({
          intersection_id: "j",
          from_road_id: "b",
          from_lane_id: "b-lane",
          maneuver: "LEFT",
        }),
      ]),
    );
    expect(
      screen
        .getByRole("button", { name: "Right" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "Select intersection" }),
    ).toBeTruthy();
    expect(screen.getByTestId("camera-state").textContent).toBe(
      "center=0,0;zoom=10;bearing=37",
    );

    await user.click(left);

    expect(left.getAttribute("aria-pressed")).toBe("false");
    expect(vi.mocked(replaceLaneConnections)).toHaveBeenLastCalledWith(
      "city",
      [],
    );
  });
});
