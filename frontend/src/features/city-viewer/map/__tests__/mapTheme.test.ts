import { describe, expect, it } from "vitest";
import { DARK_MAP_THEME, LIGHT_MAP_THEME, resolveMapTheme } from "../styles/mapTheme";
import { HIERARCHY_LABEL_RANK } from "../styles/roadStyle";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isHex(value: string): boolean {
  return HEX_COLOR.test(value);
}

describe("map theme tokens", () => {
  it("resolves 'dark' to the dark theme and anything else to light", () => {
    expect(resolveMapTheme("dark")).toBe(DARK_MAP_THEME);
    expect(resolveMapTheme("light")).toBe(LIGHT_MAP_THEME);
  });

  it("defines a road asphalt/casing color for every hierarchy in both themes", () => {
    const hierarchies = Object.keys(HIERARCHY_LABEL_RANK);
    for (const theme of [LIGHT_MAP_THEME, DARK_MAP_THEME]) {
      for (const hierarchy of hierarchies) {
        expect(isHex(theme.roadAsphalt[hierarchy as keyof typeof theme.roadAsphalt])).toBe(true);
        expect(isHex(theme.roadCasing[hierarchy as keyof typeof theme.roadCasing])).toBe(true);
      }
    }
  });

  it("never uses the exact same label/halo pair for both themes (never a no-op theme switch)", () => {
    expect(LIGHT_MAP_THEME.roadLabel).not.toBe(DARK_MAP_THEME.roadLabel);
    expect(LIGHT_MAP_THEME.roadLabelHalo).not.toBe(DARK_MAP_THEME.roadLabelHalo);
  });

  it("keeps label and halo visually distinct within each theme (not identical colors)", () => {
    expect(LIGHT_MAP_THEME.roadLabel).not.toBe(LIGHT_MAP_THEME.roadLabelHalo);
    expect(DARK_MAP_THEME.roadLabel).not.toBe(DARK_MAP_THEME.roadLabelHalo);
  });

  it("gives every badge a text color distinct from its own fill (readable glyph)", () => {
    for (const theme of [LIGHT_MAP_THEME, DARK_MAP_THEME]) {
      expect(theme.busBadge.text).not.toBe(theme.busBadge.fill);
      expect(theme.parkingBadge.text).not.toBe(theme.parkingBadge.fill);
    }
  });
});
