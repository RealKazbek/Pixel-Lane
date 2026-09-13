import { afterEach, describe, expect, it, vi } from "vitest";
import { applyRoadEdit } from "../editor/applyRoadEdit";
import { ApiError } from "../../api/client";
import * as citiesApi from "../../api/cities";
import type { Road } from "../../types/city";

const road: Road = {
  id: "road-1",
  city_id: "city-1",
  name: "Main St",
  road_type: "ARTERIAL",
  geometry: {
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  },
  default_speed_limit_kmh: 50,
  lanes: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyRoadEdit", () => {
  it("rejects geometry with fewer than 2 points without calling the API", async () => {
    const spy = vi.spyOn(citiesApi, "updateRoadGeometry");
    const result = await applyRoadEdit("city-1", "road-1", [{ x: 0, y: 0 }]);
    expect(result).toEqual({
      ok: false,
      error: "min-points",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns the updated road on success", async () => {
    vi.spyOn(citiesApi, "updateRoadGeometry").mockResolvedValue(road);
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const result = await applyRoadEdit("city-1", "road-1", points);
    expect(result).toEqual({ ok: true, road });
  });

  it("returns a save-failed code for an ApiError, without leaking its raw message", async () => {
    vi.spyOn(citiesApi, "updateRoadGeometry").mockRejectedValue(
      new ApiError(404, "Road not found"),
    );
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const result = await applyRoadEdit("city-1", "road-1", points);
    expect(result).toEqual({ ok: false, error: "save-failed" });
  });

  it("returns a save-failed code for a non-ApiError failure", async () => {
    vi.spyOn(citiesApi, "updateRoadGeometry").mockRejectedValue(
      new Error("network exploded"),
    );
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const result = await applyRoadEdit("city-1", "road-1", points);
    expect(result).toEqual({
      ok: false,
      error: "save-failed",
    });
  });
});
