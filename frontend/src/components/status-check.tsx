"use client";

import { useEffect, useState } from "react";
import { backendUrl } from "@/lib/config";

type Status = "checking" | "ok" | "error";

export interface StatusCheckMessages {
  checking: string;
  reachable: string;
  unreachable: string;
}

const DEFAULT_MESSAGES: StatusCheckMessages = {
  checking: "Backend API: Checking...",
  reachable: "Backend API: Reachable",
  unreachable: "Backend API: Unreachable",
};

/**
 * Used both inside the localized app shell (`AppHeader`/dashboard, which
 * pass pre-translated `messages` -- plain strings, not functions, since
 * this is a Client Component and Server Component callers can't pass a
 * closure across that boundary) and on the unlocalized `/health` status
 * page (see `docs/i18n.md` -- `/health` intentionally sits outside the
 * `[locale]` route segment, so it has no translation context and this
 * component falls back to English defaults there).
 */
export function StatusCheck({
  messages = DEFAULT_MESSAGES,
}: {
  messages?: StatusCheckMessages;
}) {
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

  const text =
    status === "checking"
      ? messages.checking
      : status === "ok"
        ? messages.reachable
        : messages.unreachable;

  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
      <span>{text}</span>
    </div>
  );
}
