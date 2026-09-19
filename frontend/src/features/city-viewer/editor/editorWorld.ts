/** Logical coordinate extent for the initial editor document. */
export interface EditorWorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const EDITOR_WORLD_BOUNDS: EditorWorldBounds = {
  // A deliberately generous Stage 1 canvas: roads occupy a small inspection
  // area while the surrounding world remains usable editor space.
  minX: -1500,
  maxX: 1500,
  minY: -1000,
  maxY: 1000,
};
