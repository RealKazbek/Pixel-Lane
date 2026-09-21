import { describe, expect, it } from "vitest";
import {
  INITIAL_ENVIRONMENT,
  reduceEnvironment,
  resolveTimeOfDay,
  type EnvironmentState,
} from "./useEnvironment";
import {
  INITIAL_SIMULATION_CLOCK,
  reduceSimulationClock,
} from "./simulationClock";

describe("environment state", () => {
  it("defaults to auto time and clear weather", () => {
    expect(INITIAL_ENVIRONMENT).toEqual({ timeMode: "auto", weather: "clear" });
  });

  it("keeps time mode and weather independent", () => {
    let state = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-time-mode",
      timeMode: "night",
    });
    state = reduceEnvironment(state, { type: "set-weather", weather: "rain" });
    expect(state).toEqual({ timeMode: "night", weather: "rain" });
  });

  it("supports manual time overrides", () => {
    const state = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-time-mode",
      timeMode: "sunset",
    });
    expect(resolveTimeOfDay(state.timeMode, "12:00")).toBe("sunset");
  });

  it("keeps unrelated editor state outside the environment contract", () => {
    const editorState = {
      selectedRoadId: "road-1",
      selectedIntersectionId: "intersection-1",
    };
    const environment: EnvironmentState = {
      timeMode: "night",
      weather: "rain",
    };
    const next = reduceEnvironment(INITIAL_ENVIRONMENT, {
      type: "set-weather",
      weather: environment.weather,
    });
    expect(editorState).toEqual({
      selectedRoadId: "road-1",
      selectedIntersectionId: "intersection-1",
    });
    expect(next).toEqual({ timeMode: "auto", weather: "rain" });
  });
});

describe("resolveTimeOfDay", () => {
  it.each([
    ["05:29", "night"],
    ["05:30", "sunset"],
    ["06:29", "sunset"],
    ["06:30", "day"],
    ["17:29", "day"],
    ["17:30", "sunset"],
    ["19:29", "sunset"],
    ["19:30", "night"],
  ] as const)("maps %s to %s", (time, expected) => {
    expect(resolveTimeOfDay("auto", time)).toBe(expected);
  });

  it("falls back to daytime for malformed simulation time", () => {
    expect(resolveTimeOfDay("auto", "not-a-time")).toBe("day");
    expect(resolveTimeOfDay("auto", "25:00")).toBe("day");
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
  });
});
