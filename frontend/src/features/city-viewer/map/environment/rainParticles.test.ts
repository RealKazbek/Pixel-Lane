import { describe, expect, it } from "vitest";
import {
  advanceRainParticle,
  createRainParticles,
  RAIN_CONFIG,
} from "./rainParticles";

describe("rain particles", () => {
  it("uses bounded, intensity-specific particle populations", () => {
    expect(createRainParticles("light", 800, 600)).toHaveLength(
      RAIN_CONFIG.light.count,
    );
    expect(RAIN_CONFIG.light.count).toBeLessThan(RAIN_CONFIG.medium.count);
    expect(RAIN_CONFIG.medium.count).toBeLessThan(RAIN_CONFIG.heavy.count);
    expect(RAIN_CONFIG.heavy.count).toBeLessThan(200);
  });

  it("creates short varied drops instead of long slash textures", () => {
    const particles = createRainParticles("medium", 800, 600);
    const lengths = new Set(particles.map((particle) => particle.length));
    expect(
      Math.max(...particles.map((particle) => particle.length)),
    ).toBeLessThanOrEqual(10);
    expect(lengths.size).toBeGreaterThan(1);
    expect(particles.every((particle) => particle.opacity < 0.4)).toBe(true);
  });

  it("wraps each particle independently without a global reset", () => {
    const particle = createRainParticles("light", 100, 100, 1)[0];
    const advanced = advanceRainParticle(particle, 2, 100, 100);
    expect(advanced.y).toBeGreaterThanOrEqual(-particle.length);
    expect(advanced.y).toBeLessThanOrEqual(100 + particle.length);
    expect(advanced.x).toBeGreaterThanOrEqual(0);
    expect(advanced.x).toBeLessThan(100);
  });
});
