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
  buildIntersectionLayers,
  buildRoadLabelLayer,
  buildTrafficLightLayer,
} from "./pointLayers";
import { buildRoadLayers } from "./roadLayers";
import { LAYER_DRAW_ORDER, LAYER_GROUPS, SOURCE_IDS } from "./layerIds";
import type { LayerVisibility } from "../types";
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
    ...buildIntersectionLayers(),
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

/** Applies the master "Overlay" toggle (a debugging aid for comparing
 * against the basemap alone) together with the per-entity-type toggles
 * from `MapLayersPanel`. A layer is visible only when both the overlay
 * master switch and its own group are on -- this is the single place
 * that combines the two, so `PixelLaneMap` never has to reason about
 * layer ids directly. */
export function setLayerGroupVisibility(
  map: MapLibreMap,
  overlayVisible: boolean,
  layerVisibility: LayerVisibility,
): void {
  for (const [group, layerIds] of Object.entries(LAYER_GROUPS)) {
    const visible =
      overlayVisible && layerVisibility[group as keyof LayerVisibility];
    const visibility = visible ? "visible" : "none";
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  }
  // Anything not covered by a group (currently nothing, kept for safety
  // if a future layer is added to LAYER_DRAW_ORDER before a group).
  const groupedIds = new Set(Object.values(LAYER_GROUPS).flat() as string[]);
  const visibility = overlayVisible ? "visible" : "none";
  for (const layerId of LAYER_DRAW_ORDER) {
    if (!groupedIds.has(layerId) && map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}

/** Moves the "selected" feature-state flag from `previousId` to `nextId`
 * on one source, without touching the source's data. Selection is
 * intentionally never baked into the GeoJSON payload itself -- clicking a
 * road/intersection/signal shouldn't require rebuilding or re-sending the
 * whole dataset (see map/README.md's performance notes). */
export function setSelectedFeature(
  map: MapLibreMap,
  sourceId: string,
  previousId: string | null,
  nextId: string | null,
): void {
  if (previousId && previousId !== nextId) {
    map.setFeatureState(
      { source: sourceId, id: previousId },
      { selected: false },
    );
  }
  if (nextId) {
    map.setFeatureState({ source: sourceId, id: nextId }, { selected: true });
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
