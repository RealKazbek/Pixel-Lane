import { useReducer } from "react";

export type TimeMode = "auto" | "day" | "sunset" | "night";
export type TimeOfDay = "day" | "sunset" | "night";
export type Weather = "clear" | "rain" | "snow" | "fog";

export interface EnvironmentState {
  timeMode: TimeMode;
  weather: Weather;
}

export type EnvironmentAction =
  | { type: "set-time-mode"; timeMode: TimeMode }
  | { type: "set-weather"; weather: Weather };

export const INITIAL_ENVIRONMENT: EnvironmentState = {
  timeMode: "auto",
  weather: "clear",
};

export function reduceEnvironment(
  state: EnvironmentState,
  action: EnvironmentAction,
): EnvironmentState {
  switch (action.type) {
    case "set-time-mode":
      return state.timeMode === action.timeMode
        ? state
        : { ...state, timeMode: action.timeMode };
    case "set-weather":
      return state.weather === action.weather
        ? state
        : { ...state, weather: action.weather };
  }
}

export function resolveTimeOfDay(
  timeMode: TimeMode,
  simulationTime: string,
): TimeOfDay {
  if (timeMode !== "auto") return timeMode;

  const [hours, minutes] = simulationTime.split(":").map(Number);
  const isValidTime =
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59;
  const totalMinutes = isValidTime ? hours * 60 + minutes : 12 * 60;

  if (totalMinutes >= 6 * 60 + 30 && totalMinutes < 17 * 60 + 30) {
    return "day";
  }
  if (
    (totalMinutes >= 5 * 60 + 30 && totalMinutes < 6 * 60 + 30) ||
    (totalMinutes >= 17 * 60 + 30 && totalMinutes < 19 * 60 + 30)
  ) {
    return "sunset";
  }
  return "night";
}

export function useEnvironment() {
  return useReducer(reduceEnvironment, INITIAL_ENVIRONMENT);
}
