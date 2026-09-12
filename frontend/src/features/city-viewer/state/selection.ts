export type SelectedEntity =
  | { type: "road"; id: string }
  | { type: "lane"; id: string }
  | { type: "intersection"; id: string };
