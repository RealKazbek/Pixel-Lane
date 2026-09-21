import { describe, expect, it } from "vitest";
import {
  INITIAL_ENVIRONMENT,
  reduceEnvironment,
  resolveTimeOfDay,
  shouldShowWeatherIntensity,
  type EnvironmentState,
} from "./useEnvironment";
import {
  INITIAL_SIMULATION_CLOCK,
  reduceSimulationClock,
  formatSimulationDate,
} from "./simulationClock";

describe("environment state", () => {
  it("defaults to auto time and clear weather", () => {
    expect(INITIAL_ENVIRONMENT).toEqual({
      timeMode: "auto",
      weather: "clear",
      weatherIntensity: "medium",
    });
  });

  it("keeps time mode and weather independent", () => {
    let state = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-time-mode",
      timeMode: "evening",
    });
    state = reduceEnvironment(state, { type: "set-weather", weather: "rain" });
    state = reduceEnvironment(state, {
      type: "set-weather-intensity",
      intensity: "heavy",
    });
    expect(state).toEqual({
      timeMode: "evening",
      weather: "rain",
      weatherIntensity: "heavy",
    });
  });

  it("supports manual time overrides", () => {
    const state = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-time-mode",
      timeMode: "morning",
    });
    expect(resolveTimeOfDay(state.timeMode, "12:00")).toBe("morning");
  });

  it("keeps unrelated editor state outside the environment contract", () => {
    const editorState = {
      selectedRoadId: "road-1",
      selectedIntersectionId: "intersection-1",
    };
    const environment: EnvironmentState = {
      timeMode: "night",
      weather: "rain",
      weatherIntensity: "medium",
    };
    const next = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-weather",
      weather: environment.weather,
    });
    expect(editorState).toEqual({
      selectedRoadId: "road-1",
      selectedIntersectionId: "intersection-1",
    });
    expect(next).toEqual({
      timeMode: "auto",
      weather: "rain",
      weatherIntensity: "medium",
    });
  });
});

describe("resolveTimeOfDay", () => {
  it.each([
    ["04:59", "night"],
    ["05:00", "morning"],
    ["10:59", "morning"],
    ["11:00", "day"],
    ["16:59", "day"],
    ["17:00", "evening"],
    ["20:59", "evening"],
    ["21:00", "night"],
  ] as const)("maps %s to %s", (time, expected) => {
    expect(resolveTimeOfDay("auto", time)).toBe(expected);
  });

  it("falls back to daytime for malformed simulation time", () => {
    expect(resolveTimeOfDay("auto", "not-a-time")).toBe("day");
    expect(resolveTimeOfDay("auto", "25:00")).toBe("day");
  });

  it("manual modes immediately resolve to their own visual mode", () => {
    expect(resolveTimeOfDay("morning", "21:00")).toBe("morning");
    expect(resolveTimeOfDay("day", "21:00")).toBe("day");
    expect(resolveTimeOfDay("evening", "12:00")).toBe("evening");
    expect(resolveTimeOfDay("night", "12:00")).toBe("night");
  });
});

describe("weather intensity", () => {
  it("shows intensity for precipitation and fog, but not clear weather", () => {
    expect(shouldShowWeatherIntensity("clear")).toBe(false);
    expect(shouldShowWeatherIntensity("rain")).toBe(true);
    expect(shouldShowWeatherIntensity("snow")).toBe(true);
    expect(shouldShowWeatherIntensity("fog")).toBe(true);
  });
});

describe("simulation clock", () => {
  it("stores date and time independently", () => {
    let state = INITIAL_SIMULATION_CLOCK;
    state = reduceSimulationClock(state, {
      type: "set-date",
      date: "2027-01-02",
    });
    state = reduceSimulationClock(state, { type: "set-time", time: "21:30" });
    expect(state).toEqual({ date: "2027-01-02", time: "21:30" });
    expect(formatSimulationDate(state.date)).toBe("02.01.2027");
  });
});
