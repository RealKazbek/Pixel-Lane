# Map and editor

MapLibre is the renderer and interaction layer; Terra Draw is temporary geometry-edit state. The optional basemap is reference infrastructure, while Pixel Lane's overlay is built from City Model GeoJSON sources for roads, intersections, traffic lights, and labels. With basemap disabled, the map uses Pixel Lane-only mode; glyphs currently use MapLibre's demo endpoint.

Road casing/surface, markings, selection, junctions, signals, and labels have an explicit draw order. Selection uses MapLibre feature-state, not source mutation. Labels choose one longest segment per street name; pass-through topology nodes are shown only at detailed zoom.

```text
City Model → GeoJSON adapter → MapLibre → Terra Draw temporary edit
→ Apply → PATCH road geometry → City Model → refetch
```

Only an existing road polyline can currently be edited. No lane, intersection, signal, new-road, or congestion-overlay editor exists. See the implementation [map README](../frontend/src/features/city-viewer/map/README.md).
