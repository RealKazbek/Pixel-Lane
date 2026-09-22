import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import {
  buildManeuverSymbolGeometry,
  normalizeManeuverDirections,
} from "../geometry/maneuverSymbol";

describe("buildManeuverSymbolGeometry", () => {
  it("normalizes aliases and removes duplicate directions", () => {
    expect(
      normalizeManeuverDirections([
        "THROUGH",
        "STRAIGHT",
        "SLIGHT_LEFT",
        "LEFT",
        "NONE",
      ]),
    ).toEqual(["LEFT", "STRAIGHT"]);
  });

  it("builds one integrated straight-left symbol with compact heads", () => {
    const geometry = buildManeuverSymbolGeometry([0, 0], 0, [
      "STRAIGHT",
      "LEFT",
    ]);

    expect(geometry).not.toBeNull();
    expect(geometry!.coordinates).toHaveLength(5);
    const [stem, leftBranch, straightBranch, leftHead, straightHead] =
      geometry!.coordinates;
    expect(leftBranch[0]).toEqual(stem.at(-1));
    expect(straightBranch[0]).toEqual(stem.at(-1));
    for (const head of [leftHead, straightHead]) {
      expect(head).toHaveLength(3);
      expect(
        distance(point(head[0]), point(head[1]), { units: "meters" }),
      ).toBeLessThan(0.9);
    }
  });

  it("returns null for NONE-only markings", () => {
    expect(buildManeuverSymbolGeometry([0, 0], 90, ["NONE"])).toBeNull();
  });
});
