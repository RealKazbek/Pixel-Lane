export function compassRoseRotation(bearing: number): number {
  return bearing === 0 ? 0 : -bearing;
}
