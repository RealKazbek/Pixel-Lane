import { describe, expect, it } from "vitest";

import { createTerrainSourceConfig, DEFAULT_TERRAIN_SOURCE_ID } from "./config";

describe("createTerrainSourceConfig", () => {
  it("supports a swappable URL DEM source and exaggeration", () => {
    expect(
      createTerrainSourceConfig({
        url: "https://example.test/terrain.json",
        exaggeration: 1.5,
      }),
    ).toEqual({
      sourceId: DEFAULT_TERRAIN_SOURCE_ID,
      source: {
        type: "raster-dem",
        url: "https://example.test/terrain.json",
        tileSize: 256,
      },
      terrain: { source: DEFAULT_TERRAIN_SOURCE_ID, exaggeration: 1.5 },
    });
  });

  it("supports tile templates without choosing a provider", () => {
    const result = createTerrainSourceConfig({
      sourceId: "local-dem",
      tiles: ["https://tiles.test/{z}/{x}/{y}.png"],
      encoding: "terrarium",
    });
    expect(result.source).toMatchObject({
      type: "raster-dem",
      tiles: ["https://tiles.test/{z}/{x}/{y}.png"],
      encoding: "terrarium",
    });
  });

  it.each([{ url: "https://example.test/dem.json", tiles: ["template"] }, {}])(
    "rejects incomplete or ambiguous source configuration",
    (options) => {
      expect(() => createTerrainSourceConfig(options)).toThrow();
    },
  );

  it("rejects negative exaggeration and empty tiles", () => {
    expect(() =>
      createTerrainSourceConfig({ tiles: [], exaggeration: 1 }),
    ).toThrow();
    expect(() =>
      createTerrainSourceConfig({ url: "dem.json", exaggeration: -1 }),
    ).toThrow();
  });
});
