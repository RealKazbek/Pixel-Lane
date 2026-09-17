import { describe, expect, it } from "vitest";
import { INITIAL_EDITOR_SESSION, reduceEditorSession } from "./editorState";

describe("editor session", () => {
  it("opens safely in view mode and enters edit with Select active", () => {
    expect(INITIAL_EDITOR_SESSION).toEqual({ mode: "view", activeTool: null });
    expect(
      reduceEditorSession(INITIAL_EDITOR_SESSION, { type: "enter-edit" }),
    ).toEqual({
      mode: "edit",
      activeTool: "select",
    });
  });

  it("allows only one active tool and exits to a clean view state", () => {
    const editing = reduceEditorSession(INITIAL_EDITOR_SESSION, {
      type: "enter-edit",
    });
    expect(
      reduceEditorSession(editing, { type: "set-tool", tool: "draw-road" })
        .activeTool,
    ).toBe("draw-road");
    expect(reduceEditorSession(editing, { type: "exit-edit" })).toEqual(
      INITIAL_EDITOR_SESSION,
    );
  });
});
