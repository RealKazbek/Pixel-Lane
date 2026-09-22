/** A geographic world position with an optional sampled ground elevation. */
export interface WorldPosition {
  lng: number;
  lat: number;
  elevation: number | null;
}

/** The smallest contract needed by world objects to query the ground surface. */
export interface TerrainProvider {
  getElevation(lng: number, lat: number): number | null;
}

export function worldPosition(
  lng: number,
  lat: number,
  elevation: number | null = null,
): WorldPosition {
  return { lng, lat, elevation };
}
