import { apiRequest } from "./client";
import type {
  City,
  CitySummary,
  Intersection,
  Polyline,
  Road,
  MapRoad,
  LaneBoundaryMarking,
  RoadEdgeMarking,
  LaneConnection,
} from "../types/city";
import type { TrafficAnalysisResult } from "../types/traffic-analysis";
import type { BBox } from "../map/adapters/viewport";

export function getCities(): Promise<CitySummary[]> {
  return apiRequest<CitySummary[]>("/api/v1/cities");
}

export function getCity(cityId: string): Promise<City> {
  return apiRequest<City>(`/api/v1/cities/${cityId}`);
}

/** Resolve the persisted PL-005 editor document. */
export function getEditorWorkspace(): Promise<City> {
  return apiRequest<City>("/api/v1/cities/editor-workspace");
}

export async function getCityForMap(cityId: string): Promise<City> {
  const metadata = await apiRequest<
    Omit<
      City,
      | "roads"
      | "intersections"
      | "traffic_lights"
      | "parking_zones"
      | "bus_stops"
      | "crosswalks"
    >
  >(`/api/v1/cities/${cityId}/metadata`);
  if (metadata.coordinate_system === "LOCAL_CARTESIAN") return getCity(cityId);
  return {
    ...metadata,
    roads: [],
    intersections: [],
    traffic_lights: [],
    parking_zones: [],
    // Not yet bbox-scoped like roads/intersections -- see
    // docs/city-model.md's "Bus stops and pedestrian crossings" note.
    // WGS84/viewport cities show none until that follow-up exists.
    bus_stops: [],
    crosswalks: [],
  };
}

export function getRoad(
  cityId: string,
  roadId: string,
  signal?: AbortSignal,
): Promise<Road> {
  return apiRequest(`/api/v1/cities/${cityId}/roads/${roadId}`, { signal });
}

export function getIntersection(
  cityId: string,
  id: string,
  signal?: AbortSignal,
): Promise<Intersection> {
  return apiRequest(`/api/v1/cities/${cityId}/intersections/${id}`, { signal });
}

function bboxQueryParam(bbox: BBox): string {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
}

/** Roads intersecting `bbox` -- the viewport-driven map's data source
 * (see map/hooks/useViewportCityData.ts). Only ever non-empty for WGS84
 * cities; see the backend's `GET /cities/{id}/roads` docstring. */
export function getRoadsInBbox(
  cityId: string,
  bbox: BBox,
  signal?: AbortSignal,
  zoom = 20,
): Promise<MapRoad[]> {
  return apiRequest<MapRoad[]>(
    `/api/v1/cities/${cityId}/map-roads?bbox=${bboxQueryParam(bbox)}&zoom=${zoom}`,
    { signal },
  );
}

/** Intersections within `bbox` -- see `getRoadsInBbox`. */
export function getIntersectionsInBbox(
  cityId: string,
  bbox: BBox,
  signal?: AbortSignal,
): Promise<Intersection[]> {
  return apiRequest<Intersection[]>(
    `/api/v1/cities/${cityId}/intersections?bbox=${bboxQueryParam(bbox)}`,
    { signal },
  );
}

export function runTrafficAnalysis(
  cityId: string,
): Promise<TrafficAnalysisResult> {
  return apiRequest<TrafficAnalysisResult>(
    `/api/v1/cities/${cityId}/traffic-analysis`,
    {
      method: "POST",
    },
  );
}

/** Persists an edited road polyline -- the "apply edits" step of the map
 * editor. See `map/editor/` for the Terra Draw -> Polyline conversion. */
export function updateRoadGeometry(
  cityId: string,
  roadId: string,
  geometry: Polyline,
): Promise<Road> {
  return apiRequest<Road>(`/api/v1/cities/${cityId}/roads/${roadId}/geometry`, {
    method: "PATCH",
    body: JSON.stringify({ geometry }),
  });
}

export function updateRoadProperties(
  cityId: string,
  roadId: string,
  properties: Pick<Road, "name" | "width_m"> & {
    lane_count: number;
    lane_width_m: number;
    lane_directions: Road["lanes"][number]["direction"][];
    left_edge_marking: RoadEdgeMarking;
    right_edge_marking: RoadEdgeMarking;
    lane_boundary_markings: LaneBoundaryMarking[];
  },
): Promise<Road> {
  return apiRequest<Road>(
    `/api/v1/cities/${cityId}/roads/${roadId}/properties`,
    { method: "PATCH", body: JSON.stringify(properties) },
  );
}

export function createRoad(cityId: string, road: Road): Promise<Road> {
  return apiRequest<Road>(`/api/v1/cities/${cityId}/roads`, {
    method: "POST",
    body: JSON.stringify({ ...road, city_id: undefined }),
  });
}

export function deleteRoad(cityId: string, roadId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/cities/${cityId}/roads/${roadId}`, {
    method: "DELETE",
  });
}

export function replaceLaneConnections(
  cityId: string,
  connections: Omit<LaneConnection, "city_id">[],
): Promise<LaneConnection[]> {
  return apiRequest<LaneConnection[]>(
    `/api/v1/cities/${cityId}/lane-connections`,
    {
      method: "PUT",
      body: JSON.stringify({ connections }),
    },
  );
}

export function generateLaneConnections(cityId: string): Promise<{
  connections: LaneConnection[];
  warnings: string[];
}> {
  return apiRequest<{ connections: LaneConnection[]; warnings: string[] }>(
    `/api/v1/cities/${cityId}/lane-connections/auto`,
    { method: "POST" },
  );
}

export function replaceTopology(cityId: string, city: Pick<City, "roads" | "intersections">): Promise<void> {
  return apiRequest<void>(`/api/v1/cities/${cityId}/topology`, {
    method: "PUT",
    body: JSON.stringify({
      roads: city.roads.map((road) => ({ id: road.id, geometry: road.geometry })),
      intersections: city.intersections.map((intersection) => ({
        id: intersection.id,
        position: intersection.position,
        connected_road_ids: intersection.connected_road_ids,
        connected_lane_ids: intersection.connected_lane_ids,
        control_type: intersection.control_type,
        traffic_light_id: intersection.traffic_light_id,
      })),
    }),
  });
}

export function buildRoadPropertiesPayload(road: Road) {
  const laneCount = Math.max(road.lanes.length, 1);
  const requestedWidth = road.width_m ?? laneCount * 4;
  const laneWidth = Math.min(6, Math.max(2.5, requestedWidth / laneCount));
  return {
    name: road.name,
    width_m: laneWidth * laneCount,
    lane_count: laneCount,
    lane_width_m: laneWidth,
    lane_directions: road.lanes.map((lane) => lane.direction),
    left_edge_marking: road.left_edge_marking ?? "SOLID_YELLOW",
    right_edge_marking: road.right_edge_marking ?? "SOLID_YELLOW",
    lane_boundary_markings: road.lane_boundary_markings ?? [],
  } as const;
}
