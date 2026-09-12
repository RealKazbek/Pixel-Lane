"use client";

import { useEffect, useState } from "react";
import { backendUrl } from "@/lib/config";

type Status = "checking" | "ok" | "error";

export function StatusCheck() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch(`${backendUrl}/api/v1/health`)
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "ok" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "checking"
      ? "Checking..."
      : status === "ok"
        ? "Reachable"
        : "Unreachable";

  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
      <span>Backend API: {label}</span>
    </div>
  );
}
