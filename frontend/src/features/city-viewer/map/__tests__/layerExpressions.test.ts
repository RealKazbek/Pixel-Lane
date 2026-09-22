import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import {
  buildIntersectionLayers,
  buildRoadLabelLayer,
  buildTrafficLightLayer,
} from "../layers/pointLayers";
import { buildRoadLayers } from "../layers/roadLayers";
import { buildRoadSurfaceLayers } from "../layers/roadSurfaceLayers";
import { buildLaneDetailLayers } from "../layers/laneDetailLayers";
import { buildAmenityLayers } from "../layers/amenityLayers";
import { buildLaneConnectionLayers } from "../layers/laneConnectionLayers";
import { LAYER_IDS, SOURCE_IDS } from "../layers/layerIds";
import { DARK_MAP_THEME, LIGHT_MAP_THEME } from "../styles/mapTheme";

describe("Pixel Lane layer expressions", () => {
  it("keeps close-zoom road hit testing on per-road features", () => {
    const interaction = buildRoadLayers(43.24, LIGHT_MAP_THEME).find(
      (layer) => layer.id === LAYER_IDS.roadInteraction,
    );

    expect(interaction).toMatchObject({
      type: "line",
      source: SOURCE_IDS.roads,
      minzoom: 15,
      paint: {
        "line-opacity": 0,
      },
    });
  });

  it.each([
    ["light", LIGHT_MAP_THEME],
    ["dark", DARK_MAP_THEME],
  ])(
    "uses style-spec-valid expressions for every custom layer (%s theme)",
    (_name, theme) => {
      const emptyCollection = {
        type: "FeatureCollection" as const,
        features: [],
      };
      const errors = validateStyleMin({
        version: 8,
        sources: Object.fromEntries(
          Object.values(SOURCE_IDS).map((id) => [
            id,
            { type: "geojson", data: emptyCollection },
          ]),
        ),
        layers: [
          ...buildRoadLayers(43.24, theme),
          ...buildRoadSurfaceLayers(theme),
          ...buildLaneDetailLayers(theme),
          ...buildLaneConnectionLayers(theme),
          ...buildAmenityLayers(theme),
          ...buildIntersectionLayers(theme),
          buildTrafficLightLayer(theme),
          buildRoadLabelLayer(theme),
        ],
      });

      expect(errors).toEqual([]);
    },
  );
});
