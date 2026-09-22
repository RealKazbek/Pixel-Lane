// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapCompass } from "./MapCompass";

describe("MapCompass", () => {
  it("reflects bearing and resets only bearing", () => {
    const camera = { center: [12, 34], zoom: 11, bearing: 180 };
    const onReset = vi.fn(() => {
      camera.bearing = 0;
    });

    render(
      <MapCompass
        bearing={camera.bearing}
        label="Map compass"
        resetLabel="Reset north"
        onReset={onReset}
      />,
    );

    const compass = screen.getByRole("button", { name: "Reset north" });
    const rose = compass.querySelector("[aria-hidden='true']");
    expect(compass.textContent).toContain("N");
    expect(compass.textContent).toContain("S");
    expect(compass.className).toContain("h-[72px]");
    expect(compass.className).toContain("w-[72px]");
    expect(rose?.getAttribute("style")).toContain("rotate(-180deg)");

    fireEvent.click(compass);

    expect(onReset).toHaveBeenCalledOnce();
    expect(camera).toEqual({ center: [12, 34], zoom: 11, bearing: 0 });
  });
});
