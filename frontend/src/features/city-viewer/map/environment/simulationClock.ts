import { useReducer } from "react";

export interface SimulationClockState {
  date: string;
  time: string;
}

export function formatSimulationDate(date: string): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}.${month}.${year}` : date;
}

export type SimulationClockAction =
  { type: "set-date"; date: string } | { type: "set-time"; time: string };

export const INITIAL_SIMULATION_CLOCK: SimulationClockState = {
  date: "2026-09-22",
  time: "12:00",
};

export function reduceSimulationClock(
  state: SimulationClockState,
  action: SimulationClockAction,
): SimulationClockState {
  switch (action.type) {
    case "set-date":
      return state.date === action.date
        ? state
        : { ...state, date: action.date };
    case "set-time":
      return state.time === action.time
        ? state
        : { ...state, time: action.time };
  }
}

export function useSimulationClock() {
  return useReducer(reduceSimulationClock, INITIAL_SIMULATION_CLOCK);
}
