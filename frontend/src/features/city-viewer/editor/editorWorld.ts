/** Logical coordinate extent for the initial editor document. */
export interface EditorWorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const EDITOR_WORLD_BOUNDS: EditorWorldBounds = {
  minX: -400,
  maxX: 600,
  minY: -300,
  maxY: 300,
};
