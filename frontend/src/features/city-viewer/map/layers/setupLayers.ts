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
  type LayerSpecification,
  type Map as MapLibreMap,
} from "maplibre-gl";
import {
  buildIntersectionLayers,
  buildRoadLabelLayer,
  buildTrafficLightLayer,
} from "./pointLayers";
import { buildRoadLayers } from "./roadLayers";
import { buildRoadSurfaceLayers } from "./roadSurfaceLayers";
import { buildLaneDetailLayers } from "./laneDetailLayers";
import { buildAmenityLayers } from "./amenityLayers";
import { ensurePixelLaneIcons } from "./icons";
import {
  LAYER_DRAW_ORDER,
  LAYER_GROUPS,
  LAYER_IDS,
  SOURCE_IDS,
} from "./layerIds";
import type { LayerVisibility } from "../types";
import type { MapThemeColors } from "../styles/mapTheme";
import type {
  IntersectionFeatureCollection,
  LabelFeatureCollection,
  RoadFeatureCollection,
  TrafficLightFeatureCollection,
} from "../adapters/cityModelToGeoJson";
import type {
  LaneBoundaryFeatureCollection,
  LaneSurfaceFeatureCollection,
  LaneUseMarkingFeatureCollection,
  TurnArrowFeatureCollection,
} from "../adapters/laneGeometry";
import type { RoadSurfaceFeatureCollection } from "../adapters/roadSurfaceGeometry";
import type {
  BusStopFeatureCollection,
  CrosswalkFeatureCollection,
} from "../adapters/cityAmenitiesToGeoJson";

export interface PixelLaneGeoJson {
  grid: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  roads: RoadFeatureCollection;
  intersections: IntersectionFeatureCollection;
  trafficLights: TrafficLightFeatureCollection;
  labels: LabelFeatureCollection;
  laneSurfaces: LaneSurfaceFeatureCollection;
  laneBoundaries: LaneBoundaryFeatureCollection;
  turnArrows: TurnArrowFeatureCollection;
  laneUseMarkings: LaneUseMarkingFeatureCollection;
  roadSurfaces: RoadSurfaceFeatureCollection;
  busStops: BusStopFeatureCollection;
  crosswalks: CrosswalkFeatureCollection;
}

function buildAllLayers(
  referenceLatitudeDeg: number,
  theme: MapThemeColors,
): LayerSpecification[] {
  return [
    {
      id: LAYER_IDS.gridMinor,
      type: "line",
      source: SOURCE_IDS.grid,
      filter: ["==", ["get", "major"], false],
      paint: { "line-color": theme.gridMinor, "line-width": 1 },
    } as LayerSpecification,
    {
      id: LAYER_IDS.gridMajor,
      type: "line",
      source: SOURCE_IDS.grid,
      filter: ["==", ["get", "major"], true],
      paint: { "line-color": theme.gridMajor, "line-width": 1.2 },
    } as LayerSpecification,
    ...buildRoadLayers(referenceLatitudeDeg, theme),
    ...buildRoadSurfaceLayers(theme),
    ...buildLaneDetailLayers(theme),
    ...buildAmenityLayers(theme),
    ...buildIntersectionLayers(theme),
    buildTrafficLightLayer(theme),
    buildRoadLabelLayer(theme),
  ];
}

export function addPixelLaneSourcesAndLayers(
  map: MapLibreMap,
  data: PixelLaneGeoJson,
  referenceLatitudeDeg: number,
  theme: MapThemeColors,
): void {
  ensurePixelLaneIcons(map, theme.busBadge, theme.parkingBadge, [
    theme.roadLabel,
    theme.roadLabelHalo,
  ]);
  if (!map.getSource(SOURCE_IDS.grid)) {
    map.addSource(SOURCE_IDS.grid, { type: "geojson", data: data.grid });
  }
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
  if (!map.getSource(SOURCE_IDS.laneSurfaces)) {
    map.addSource(SOURCE_IDS.laneSurfaces, {
      type: "geojson",
      data: data.laneSurfaces,
    });
  }
  if (!map.getSource(SOURCE_IDS.laneBoundaries)) {
    map.addSource(SOURCE_IDS.laneBoundaries, {
      type: "geojson",
      data: data.laneBoundaries,
    });
  }
  if (!map.getSource(SOURCE_IDS.turnArrows)) {
    map.addSource(SOURCE_IDS.turnArrows, {
      type: "geojson",
      data: data.turnArrows,
    });
  }
  if (!map.getSource(SOURCE_IDS.laneUseMarkings)) {
    map.addSource(SOURCE_IDS.laneUseMarkings, {
      type: "geojson",
      data: data.laneUseMarkings,
    });
  }
  if (!map.getSource(SOURCE_IDS.roadSurfaces)) {
    map.addSource(SOURCE_IDS.roadSurfaces, {
      type: "geojson",
      data: data.roadSurfaces,
    });
  }
  if (!map.getSource(SOURCE_IDS.busStops)) {
    map.addSource(SOURCE_IDS.busStops, {
      type: "geojson",
      data: data.busStops,
    });
  }
  if (!map.getSource(SOURCE_IDS.crosswalks)) {
    map.addSource(SOURCE_IDS.crosswalks, {
      type: "geojson",
      data: data.crosswalks,
    });
  }

  const layers = buildAllLayers(referenceLatitudeDeg, theme);
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

/** Re-applies every Pixel Lane layer's paint for a new theme without
 * touching sources/data -- layers are cheap metadata, so this removes
 * and re-adds them with the new theme's colors baked in, rather than
 * hand-tracking every individual `setPaintProperty` call across each
 * layer file. Icon badges are re-registered too (`ensurePixelLaneIcons`
 * is idempotent). Callers must re-apply layer-group visibility and
 * selection feature-state afterward (both are independent of layer
 * identity) -- see `PixelLaneMap.tsx`'s `ensurePixelLaneLayers`. */
export function updatePixelLaneTheme(
  map: MapLibreMap,
  referenceLatitudeDeg: number,
  theme: MapThemeColors,
): void {
  ensurePixelLaneIcons(map, theme.busBadge, theme.parkingBadge, [
    theme.roadLabel,
    theme.roadLabelHalo,
  ]);
  for (const layerId of LAYER_DRAW_ORDER) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  for (const layer of buildAllLayers(referenceLatitudeDeg, theme)) {
    map.addLayer(layer);
  }
  for (const layerId of LAYER_DRAW_ORDER) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
}

export function updatePixelLaneData(
  map: MapLibreMap,
  data: PixelLaneGeoJson,
): void {
  const gridSource = map.getSource(SOURCE_IDS.grid);
  if (gridSource instanceof GeoJSONSource) gridSource.setData(data.grid);
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

  const laneSurfacesSource = map.getSource(SOURCE_IDS.laneSurfaces);
  if (laneSurfacesSource instanceof GeoJSONSource)
    laneSurfacesSource.setData(data.laneSurfaces);

  const laneBoundariesSource = map.getSource(SOURCE_IDS.laneBoundaries);
  if (laneBoundariesSource instanceof GeoJSONSource)
    laneBoundariesSource.setData(data.laneBoundaries);

  const turnArrowsSource = map.getSource(SOURCE_IDS.turnArrows);
  if (turnArrowsSource instanceof GeoJSONSource)
    turnArrowsSource.setData(data.turnArrows);

  const laneUseMarkingsSource = map.getSource(SOURCE_IDS.laneUseMarkings);
  if (laneUseMarkingsSource instanceof GeoJSONSource)
    laneUseMarkingsSource.setData(data.laneUseMarkings);

  const roadSurfacesSource = map.getSource(SOURCE_IDS.roadSurfaces);
  if (roadSurfacesSource instanceof GeoJSONSource)
    roadSurfacesSource.setData(data.roadSurfaces);

  const busStopsSource = map.getSource(SOURCE_IDS.busStops);
  if (busStopsSource instanceof GeoJSONSource)
    busStopsSource.setData(data.busStops);

  const crosswalksSource = map.getSource(SOURCE_IDS.crosswalks);
  if (crosswalksSource instanceof GeoJSONSource)
    crosswalksSource.setData(data.crosswalks);
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

/** Base filters for lane-detail layers whose feature property is
 * `road_id` rather than `id` -- duplicated from laneDetailLayers.ts's
 * definitions (rather than reading them back off the map) so
 * `setEditedRoadHidden` can AND in its own exclusion without clobbering
 * each layer's own `kind`/`is_bus` filter. Keep in sync if those change. */
const LANE_DETAIL_ROAD_ID_FILTERS: Partial<
  Record<string, ExpressionSpecification>
> = {
  [LAYER_IDS.laneBusSurface]: [
    "==",
    ["get", "is_bus"],
    true,
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneBusLabel]: [
    "==",
    ["get", "is_bus"],
    true,
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneBoundaryEdge]: [
    "==",
    ["get", "kind"],
    "edge",
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneBoundarySeparator]: [
    "==",
    ["get", "kind"],
    "separator",
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneBoundaryCenter]: [
    "==",
    ["get", "kind"],
    "center",
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.turnArrows]: undefined,
  [LAYER_IDS.laneParkingLine]: [
    "==",
    ["get", "kind"],
    "parking",
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneParkingLabel]: [
    "==",
    ["get", "kind"],
    "parking",
  ] as unknown as ExpressionSpecification,
  [LAYER_IDS.laneCyclewayLine]: [
    "==",
    ["get", "kind"],
    "cycleway",
  ] as unknown as ExpressionSpecification,
};

/** Hides Pixel Lane's normal road rendering for one road id (used while
 * that road is being edited via Terra Draw, so the same geometry isn't
 * drawn twice). Pass `null` to show everything again. */
export function setEditedRoadHidden(
  map: MapLibreMap,
  roadId: string | null,
): void {
  const roadFilter: ExpressionSpecification | null = roadId
    ? (["!=", ["get", "id"], roadId] as ExpressionSpecification)
    : null;
  for (const layerId of [
    "pixel-lane-road-casing",
    "pixel-lane-road-surface",
    "pixel-lane-road-interaction",
    "pixel-lane-lane-markings",
  ]) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, roadFilter);
    }
  }

  // The polygon fill/edge (see roadSurfaceLayers.ts) uses `properties.id`
  // like the line-based road layers above, but a merged junction polygon
  // has no `id` at all -- excluding by `!= roadId` still hides only the
  // edited road's own standalone polygon, never a junction it belongs to
  // (that junction polygon is regenerated once the edit is applied).
  for (const layerId of [
    "pixel-lane-road-surface-fill",
    "pixel-lane-road-surface-edge",
  ]) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, roadFilter);
    }
  }

  for (const [layerId, baseFilter] of Object.entries(
    LANE_DETAIL_ROAD_ID_FILTERS,
  )) {
    if (!map.getLayer(layerId)) continue;
    const roadIdExclusion: ExpressionSpecification | null = roadId
      ? (["!=", ["get", "road_id"], roadId] as ExpressionSpecification)
      : null;
    if (!roadIdExclusion) {
      map.setFilter(layerId, baseFilter ?? null);
      continue;
    }
    map.setFilter(
      layerId,
      (baseFilter
        ? ["all", baseFilter, roadIdExclusion]
        : roadIdExclusion) as ExpressionSpecification,
    );
  }
}
