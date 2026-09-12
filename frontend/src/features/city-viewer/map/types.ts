export type MapMode = "view" | "edit-geometry";

export interface MapSelection {
  type: "road" | "intersection";
  id: string;
}
