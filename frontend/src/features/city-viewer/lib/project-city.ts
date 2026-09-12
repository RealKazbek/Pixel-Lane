import type { City, Point } from "../types/city";
import { meanLatitude, projectPoint, projectPoints } from "./projection";

export interface ProjectedRoad {
  id: string;
  points: Point[];
}

export interface ProjectedIntersection {
  id: string;
  position: Point;
}

/** The whole city translated into one flat local coordinate plane, ready
 * for bounds computation and Canvas rendering -- see projection.ts for
 * what "local" means for a WGS84 city. */
export interface ProjectedCity {
  roads: ProjectedRoad[];
  intersections: ProjectedIntersection[];
  allPoints: Point[];
}

export function projectCity(city: City): ProjectedCity {
  const rawPoints = [
    ...city.roads.flatMap((road) => road.geometry.points),
    ...city.intersections.map((i) => i.position),
  ];
  const referenceLatitudeDeg = meanLatitude(rawPoints);

  const roads: ProjectedRoad[] = city.roads.map((road) => ({
    id: road.id,
    points: projectPoints(
      city.coordinate_system,
      road.geometry.points,
      referenceLatitudeDeg,
    ),
  }));

  const intersections: ProjectedIntersection[] = city.intersections.map(
    (intersection) => ({
      id: intersection.id,
      position: projectPoint(
        city.coordinate_system,
        intersection.position,
        referenceLatitudeDeg,
      ),
    }),
  );

  return {
    roads,
    intersections,
    allPoints: [
      ...roads.flatMap((r) => r.points),
      ...intersections.map((i) => i.position),
    ],
  };
}
