import { describe, expect, it } from "vitest";
import {
  INITIAL_ENVIRONMENT,
  reduceEnvironment,
  type EnvironmentState,
} from "./useEnvironment";

describe("environment state", () => {
  it("defaults to day and clear", () => {
    expect(INITIAL_ENVIRONMENT).toEqual({ timeOfDay: "day", weather: "clear" });
  });

  it("switches time modes without changing weather", () => {
    let state = INITIAL_ENVIRONMENT;
    state = reduceEnvironment(state, {
      type: "set-time-of-day",
      timeOfDay: "sunset",
    });
    state = reduceEnvironment(state, {
      type: "set-time-of-day",
      timeOfDay: "night",
    });
    expect(state).toEqual({ timeOfDay: "night", weather: "clear" });
  });

  it("switches weather without changing time", () => {
    let state = INITIAL_ENVIRONMENT;
    for (const weather of ["rain", "snow", "fog"] as const) {
      state = reduceEnvironment(state, { type: "set-weather", weather });
    }
    expect(state).toEqual({ timeOfDay: "day", weather: "fog" });
  });

  it("keeps unrelated editor state outside the environment contract", () => {
    const editorState = {
      selectedRoadId: "road-1",
      selectedIntersectionId: "intersection-1",
    };
    const environment: EnvironmentState = {
      timeOfDay: "night",
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
    expect(next).toEqual({ timeOfDay: "day", weather: "rain" });
  });
});
