import { describe, expect, it } from "vitest";
import {
  insertPolylinePoint,
  midpoint,
  updatePolylineVertex,
} from "./polylineEditing";

const points = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
];

describe("polyline editing", () => {
  it("inserts before the first point", () =>
    expect(insertPolylinePoint(points, -1, { x: -5, y: 0 })).toEqual([
      { x: -5, y: 0 },
      ...points,
    ]));
  it("inserts between two points", () =>
    expect(
      insertPolylinePoint(points, 0, midpoint(points[0], points[1])),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ]));
  it("inserts after the last point", () =>
    expect(insertPolylinePoint(points, 1, { x: 15, y: 0 })).toEqual([
      ...points,
      { x: 15, y: 0 },
    ]));
  it("inserts at an arbitrary internal segment", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ];
    expect(
      insertPolylinePoint(line, 1, midpoint(line[1], line[2])),
    ).toHaveLength(4);
  });
  it("updates only the requested vertex", () => {
    expect(
      updatePolylineVertex(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 20, y: 0 },
        ],
        1,
        { x: 10, y: 4 },
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 4 },
      { x: 20, y: 0 },
    ]);
  });
});
