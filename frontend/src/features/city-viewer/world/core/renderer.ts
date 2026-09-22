/**
 * Lifecycle shared by world render layers.
 *
 * A renderer consumes snapshots supplied by the City Model/application layer;
 * it does not own or mutate that source data.
 */
export interface WorldRenderer<RenderData, RendererContext = void> {
  mount(context: RendererContext, data: RenderData): void;
  update(data: RenderData): void;
  unmount(): void;
}
