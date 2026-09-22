import type { WeatherIntensity } from "./useEnvironment";

export interface RainParticle {
  x: number;
  y: number;
  speed: number;
  length: number;
  width: number;
  drift: number;
  opacity: number;
}

export interface RainConfig {
  count: number;
  minSpeed: number;
  maxSpeed: number;
  minLength: number;
  maxLength: number;
  minOpacity: number;
  maxOpacity: number;
}

export const RAIN_CONFIG: Record<WeatherIntensity, RainConfig> = {
  light: {
    count: 42,
    minSpeed: 150,
    maxSpeed: 240,
    minLength: 4,
    maxLength: 8,
    minOpacity: 0.16,
    maxOpacity: 0.28,
  },
  medium: {
    count: 78,
    minSpeed: 190,
    maxSpeed: 310,
    minLength: 5,
    maxLength: 10,
    minOpacity: 0.18,
    maxOpacity: 0.34,
  },
  heavy: {
    count: 126,
    minSpeed: 240,
    maxSpeed: 390,
    minLength: 6,
    maxLength: 12,
    minOpacity: 0.2,
    maxOpacity: 0.38,
  },
};

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createRainParticles(
  intensity: WeatherIntensity,
  width: number,
  height: number,
  seed = 20260922,
): RainParticle[] {
  const config = RAIN_CONFIG[intensity];
  const random = seededRandom(seed);

  return Array.from({ length: config.count }, () => ({
    x: random() * width,
    y: random() * height,
    speed: config.minSpeed + random() * (config.maxSpeed - config.minSpeed),
    length: config.minLength + random() * (config.maxLength - config.minLength),
    width: 0.55 + random() * 0.5,
    drift: 5 + random() * 12,
    opacity:
      config.minOpacity + random() * (config.maxOpacity - config.minOpacity),
  }));
}

export function advanceRainParticle(
  particle: RainParticle,
  deltaSeconds: number,
  width: number,
  height: number,
): RainParticle {
  const nextY = particle.y + particle.speed * deltaSeconds;
  const cycleHeight = height + particle.length * 2;
  const wrappedY = ((nextY + particle.length) % cycleHeight) - particle.length;

  return {
    ...particle,
    x: (particle.x + particle.drift * deltaSeconds) % width,
    y: wrappedY,
  };
}
