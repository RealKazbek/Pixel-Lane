import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import {
  buildIntersectionLayers,
  buildRoadLabelLayer,
  buildTrafficLightLayer,
} from "../layers/pointLayers";
import { buildRoadLayers } from "../layers/roadLayers";
import { buildLaneDetailLayers } from "../layers/laneDetailLayers";
import { SOURCE_IDS } from "../layers/layerIds";

describe("Pixel Lane layer expressions", () => {
  it("uses style-spec-valid expressions for every custom layer", () => {
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
        ...buildRoadLayers(43.24),
        ...buildLaneDetailLayers(),
        ...buildIntersectionLayers(),
        buildTrafficLightLayer(),
        buildRoadLabelLayer(),
      ],
    });

    expect(errors).toEqual([]);
  });
});
