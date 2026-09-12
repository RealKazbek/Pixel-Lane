"use client";

import { useEffect, useState } from "react";

function getPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Tracks `prefers-color-scheme: dark` so the Canvas (which can't read CSS
 * variables) can pick a matching background. */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(getPrefersDark);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersDark;
}
