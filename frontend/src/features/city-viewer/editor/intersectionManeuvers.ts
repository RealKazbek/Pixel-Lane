import type { Intersection, MovementType, Road } from "../types/city";
import {
  getLaneDirectionRelativeToIntersection,
  getRoadEndpointAtIntersection,
} from "./intersectionLaneDirection";

function outwardBearing(road: Road, intersection: Intersection): number | null {
  const endpoint = getRoadEndpointAtIntersection(road, intersection);
  if (!endpoint || road.geometry.points.length < 2) return null;
  const at =
    endpoint === "A" ? road.geometry.points[0] : road.geometry.points.at(-1)!;
  const adjacent =
    endpoint === "A" ? road.geometry.points[1] : road.geometry.points.at(-2)!;
  return (
    ((Math.atan2(adjacent.x - at.x, adjacent.y - at.y) * 180) / Math.PI + 360) %
    360
  );
}

function turnFor(incoming: number, outgoing: number): MovementType {
  const delta = ((outgoing - ((incoming + 180) % 360) + 540) % 360) - 180;
  if (Math.abs(delta) <= 45) return "STRAIGHT";
  if (delta > 135 || delta < -135) return "U_TURN";
  return delta > 0 ? "RIGHT" : "LEFT";
}

/** Returns only movements that have a physically connected destination. */
export function getAvailableManeuvers(
  incomingRoad: Road,
  intersection: Intersection,
  connectedRoads: Road[],
): MovementType[] {
  const incoming = outwardBearing(incomingRoad, intersection);
  if (incoming === null) return [];
  const movements = new Set<MovementType>();
  for (const candidate of connectedRoads) {
    if (candidate.id === incomingRoad.id) continue;
    if (
      !candidate.lanes.some(
        (lane) =>
          getLaneDirectionRelativeToIntersection(
            candidate,
            lane,
            intersection,
          ) === "OUTBOUND",
      )
    )
      continue;
    const outgoing = outwardBearing(candidate, intersection);
    if (outgoing !== null) movements.add(turnFor(incoming, outgoing));
  }
  const ordered: MovementType[] = ["LEFT", "STRAIGHT", "RIGHT", "U_TURN"];
  return ordered.filter((movement) => movements.has(movement));
}
