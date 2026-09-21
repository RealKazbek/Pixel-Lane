import { useReducer } from "react";

export type TimeOfDay = "day" | "sunset" | "night";
export type Weather = "clear" | "rain" | "snow" | "fog";

export interface EnvironmentState {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

export type EnvironmentAction =
  | { type: "set-time-of-day"; timeOfDay: TimeOfDay }
  | { type: "set-weather"; weather: Weather };

export const INITIAL_ENVIRONMENT: EnvironmentState = {
  timeOfDay: "day",
  weather: "clear",
};

export function reduceEnvironment(
  state: EnvironmentState,
  action: EnvironmentAction,
): EnvironmentState {
  switch (action.type) {
    case "set-time-of-day":
      return state.timeOfDay === action.timeOfDay
        ? state
        : { ...state, timeOfDay: action.timeOfDay };
    case "set-weather":
      return state.weather === action.weather
        ? state
        : { ...state, weather: action.weather };
  }
}

export function useEnvironment() {
  return useReducer(reduceEnvironment, INITIAL_ENVIRONMENT);
}
