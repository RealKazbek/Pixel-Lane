/**
 * Adds/updates Pixel Lane's own sources and layers on a MapLibre map
 * instance. Kept imperative and separate from React state on purpose --
 * `PixelLaneMap.tsx` only decides *when* to call these, never how
 * MapLibre itself works (see map/README.md).
 *
 * Re-run `addPixelLaneSourcesAndLayers` after every `map.setStyle(...)`
 * (e.g. toggling the basemap): swapping styles removes every source and
 * layer that isn't part of the new style, including ours.
 */

import {
  GeoJSONSource,
  type ExpressionSpecification,
  type Map as MapLibreMap,
} from "maplibre-gl";
import {
  buildIntersectionLayer,
  buildRoadLabelLayer,
  buildTrafficLightLayer,
} from "./pointLayers";
import { buildRoadLayers } from "./roadLayers";
import { LAYER_DRAW_ORDER, SOURCE_IDS } from "./layerIds";
import type {
  IntersectionFeatureCollection,
  LabelFeatureCollection,
  RoadFeatureCollection,
  TrafficLightFeatureCollection,
} from "../adapters/cityModelToGeoJson";

export interface PixelLaneGeoJson {
  roads: RoadFeatureCollection;
  intersections: IntersectionFeatureCollection;
  trafficLights: TrafficLightFeatureCollection;
  labels: LabelFeatureCollection;
}

export function addPixelLaneSourcesAndLayers(
  map: MapLibreMap,
  data: PixelLaneGeoJson,
  referenceLatitudeDeg: number,
): void {
  if (!map.getSource(SOURCE_IDS.roads)) {
    map.addSource(SOURCE_IDS.roads, { type: "geojson", data: data.roads });
  }
  if (!map.getSource(SOURCE_IDS.intersections)) {
    map.addSource(SOURCE_IDS.intersections, {
      type: "geojson",
      data: data.intersections,
    });
  }
  if (!map.getSource(SOURCE_IDS.trafficLights)) {
    map.addSource(SOURCE_IDS.trafficLights, {
      type: "geojson",
      data: data.trafficLights,
    });
  }
  if (!map.getSource(SOURCE_IDS.labels)) {
    map.addSource(SOURCE_IDS.labels, { type: "geojson", data: data.labels });
  }

  const layers = [
    ...buildRoadLayers(referenceLatitudeDeg),
    buildIntersectionLayer(),
    buildTrafficLightLayer(),
    buildRoadLabelLayer(),
  ];
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }

  // Enforce the documented draw order even if layers were added out of
  // order (e.g. re-added after a basemap style swap).
  for (const layerId of LAYER_DRAW_ORDER) {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  }
}

export function updatePixelLaneData(
  map: MapLibreMap,
  data: PixelLaneGeoJson,
): void {
  const roadsSource = map.getSource(SOURCE_IDS.roads);
  if (roadsSource instanceof GeoJSONSource) roadsSource.setData(data.roads);

  const intersectionsSource = map.getSource(SOURCE_IDS.intersections);
  if (intersectionsSource instanceof GeoJSONSource)
    intersectionsSource.setData(data.intersections);

  const trafficLightsSource = map.getSource(SOURCE_IDS.trafficLights);
  if (trafficLightsSource instanceof GeoJSONSource)
    trafficLightsSource.setData(data.trafficLights);

  const labelsSource = map.getSource(SOURCE_IDS.labels);
  if (labelsSource instanceof GeoJSONSource) labelsSource.setData(data.labels);
}

/** Shows/hides every Pixel Lane layer at once -- a debugging aid for
 * comparing against the basemap alone (see the toolbar's "Overlay"
 * toggle). */
export function setPixelLaneLayersVisible(
  map: MapLibreMap,
  visible: boolean,
): void {
  const visibility = visible ? "visible" : "none";
  for (const layerId of LAYER_DRAW_ORDER) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

/** Hides Pixel Lane's normal road rendering for one road id (used while
 * that road is being edited via Terra Draw, so the same geometry isn't
 * drawn twice). Pass `null` to show everything again. */
export function setEditedRoadHidden(
  map: MapLibreMap,
  roadId: string | null,
): void {
  const filter: ExpressionSpecification | null = roadId
    ? (["!=", ["get", "id"], roadId] as ExpressionSpecification)
    : null;
  for (const layerId of [
    "pixel-lane-road-casing",
    "pixel-lane-road-surface",
    "pixel-lane-lane-markings",
  ]) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filter);
    }
  }
}
