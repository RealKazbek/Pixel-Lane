import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { getCityForMap, getRoadsInBbox } from "./cities";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("geographic map requests", () => {
  it("loads only metadata, never the full WGS84 city", async () => {
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue({ id: "city", coordinate_system: "WGS84", bounds: [76, 43, 77, 44], road_count: 20000 });
    const city = await getCityForMap("city");
    expect(apiRequest).toHaveBeenCalledExactlyOnceWith("/api/v1/cities/city/metadata");
    expect(city.roads).toEqual([]);
    expect(city.road_count).toBe(20000);
  });

  it("sends the viewport zoom tier and cancellation signal", async () => {
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue([]);
    const controller = new AbortController();
    await getRoadsInBbox("city", {minLon: 76, minLat: 43, maxLon: 77, maxLat: 44}, controller.signal, 11);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/cities/city/map-roads?bbox=76,43,77,44&zoom=11", {signal: controller.signal});
  });
});
