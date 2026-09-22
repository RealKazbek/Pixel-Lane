# Buildings

Building data is a City Model concern, not map-component visual state.

`building.ts` defines the small domain contract: a closed footprint, optional
measured height/levels, use type, and terrain-compatible elevation metadata.
`map/adapters/buildingToGeoJson.ts` is the only building-to-GeoJSON adapter.
`map/layers/buildingLayers.ts` is the isolated MapLibre `fill-extrusion`
foundation for the future World Renderer.

The first rendering LOD is intentionally simple: buildings are omitted before
zoom 14 and use lightweight extrusions thereafter. Terrain alignment is left
to the future terrain-aware renderer; missing base elevation is represented as
`null` with `TERRAIN` as the default strategy rather than fabricated data.

The current backend City Model does not yet persist buildings, so the frontend
field is optional and this branch does not invent an API or migration. The
future persistence work should add a normal City child entity and feed this
same contract through the existing City service/schema boundary.
