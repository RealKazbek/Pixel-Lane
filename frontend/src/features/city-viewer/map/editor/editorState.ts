export type EditorMode = "view" | "edit";
export type EditorTool = "select" | "draw-road" | "split-road" | "delete-road";

export interface EditorSession {
  mode: EditorMode;
  activeTool: EditorTool | null;
}

export type EditorAction =
  | { type: "enter-edit" }
  | { type: "exit-edit" }
  | { type: "set-tool"; tool: EditorTool };

export const INITIAL_EDITOR_SESSION: EditorSession = {
  mode: "view",
  activeTool: null,
};

export function reduceEditorSession(
  state: EditorSession,
  action: EditorAction,
): EditorSession {
  if (action.type === "enter-edit") {
    return { mode: "edit", activeTool: "select" };
  }
  if (action.type === "exit-edit") return INITIAL_EDITOR_SESSION;
  if (state.mode !== "edit") return state;
  return { ...state, activeTool: action.tool };
}
