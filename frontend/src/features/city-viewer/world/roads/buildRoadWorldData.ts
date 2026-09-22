import {
  buildBusStopFeatureCollection,
  buildCrosswalkFeatureCollection,
} from "../../map/adapters/cityAmenitiesToGeoJson";
import {
  buildIntersectionFeatureCollection,
  buildRoadFeatureCollection,
  buildRoadLabelFeatureCollection,
  buildTrafficLightFeatureCollection,
} from "../../map/adapters/cityModelToGeoJson";
import { buildJunctionLaneDirectionFeatureCollection } from "../../map/adapters/junctionLaneDirection";
import { buildLaneConnectionFeatureCollection } from "../../map/adapters/laneConnectionGeometry";
import {
  buildLaneBoundaryFeatureCollection,
  buildLaneSurfaceFeatureCollection,
  buildLaneUseMarkingFeatureCollection,
  buildTurnArrowFeatureCollection,
} from "../../map/adapters/laneGeometry";
import { buildRoadSurfaceFeatureCollection } from "../../map/adapters/roadSurfaceGeometry";
import type { PixelLaneGeoJson } from "../../map/layers/setupLayers";
import type { City, MapRoad, Road } from "../../types/city";
import { buildEditorGrid } from "../../map/grid";
import type { EditorWorldBounds } from "../../editor/editorWorld";

interface BuildRoadWorldDataOptions {
  city: City;
  visibleRoads: (Road | MapRoad)[];
  visibleIntersections: City["intersections"];
  selectedIntersectionId: string | null;
  editorWorld?: EditorWorldBounds;
  gridZoom: number;
}

/** Builds a renderer snapshot without mutating or storing City Model data. */
export function buildRoadWorldData({
  city,
  visibleRoads,
  visibleIntersections,
  selectedIntersectionId,
  editorWorld,
  gridZoom,
}: BuildRoadWorldDataOptions): PixelLaneGeoJson {
  const trafficLights = visibleIntersections
    .filter((intersection) => intersection.traffic_light_id !== null)
    .map((intersection) => ({
      id: intersection.traffic_light_id as string,
      intersection_id: intersection.id,
    }));

  return {
    grid: editorWorld
      ? buildEditorGrid(editorWorld, city.coordinate_system, gridZoom)
      : { type: "FeatureCollection", features: [] },
    roads: buildRoadFeatureCollection({
      roads: visibleRoads,
      coordinate_system: city.coordinate_system,
    }),
    intersections: buildIntersectionFeatureCollection({
      intersections: visibleIntersections,
      coordinate_system: city.coordinate_system,
    }),
    trafficLights: buildTrafficLightFeatureCollection({
      traffic_lights: trafficLights,
      intersections: visibleIntersections,
      coordinate_system: city.coordinate_system,
    }),
    labels: buildRoadLabelFeatureCollection({
      roads: visibleRoads,
      coordinate_system: city.coordinate_system,
    }),
    laneSurfaces: buildLaneSurfaceFeatureCollection(
      visibleRoads,
      city.coordinate_system,
      visibleIntersections,
    ),
    laneBoundaries: buildLaneBoundaryFeatureCollection(
      visibleRoads,
      city.coordinate_system,
      visibleIntersections,
    ),
    turnArrows: buildTurnArrowFeatureCollection(
      visibleRoads,
      city.coordinate_system,
      selectedIntersectionId
        ? visibleIntersections.filter(({ id }) => id === selectedIntersectionId)
        : [],
      city.lane_connections ?? [],
    ),
    laneConnections: buildLaneConnectionFeatureCollection(
      {
        roads: city.coordinate_system === "LOCAL_CARTESIAN" ? city.roads : [],
        intersections:
          city.coordinate_system === "LOCAL_CARTESIAN"
            ? city.intersections
            : [],
        lane_connections: city.lane_connections,
      },
      city.coordinate_system,
    ),
    junctionLaneDirections: buildJunctionLaneDirectionFeatureCollection(
      city.coordinate_system === "LOCAL_CARTESIAN" ? city.roads : [],
      null,
      city.coordinate_system,
    ),
    laneUseMarkings: buildLaneUseMarkingFeatureCollection(
      visibleRoads,
      city.coordinate_system,
      visibleIntersections,
    ),
    roadSurfaces: buildRoadSurfaceFeatureCollection(
      visibleRoads,
      visibleIntersections,
      city.coordinate_system,
    ),
    busStops: buildBusStopFeatureCollection(
      city.bus_stops,
      city.coordinate_system,
    ),
    crosswalks: buildCrosswalkFeatureCollection(
      city.crosswalks,
      city.roads,
      city.coordinate_system,
    ),
  };
}
