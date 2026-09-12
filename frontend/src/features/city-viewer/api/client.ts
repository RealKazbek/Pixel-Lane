import { backendUrl } from "@/lib/config";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Thin fetch wrapper: JSON in/out, backend base URL, no scattered fetch() calls. */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (cause) {
    console.error(`Request to ${path} failed`, cause);
    throw new ApiError(0, "Backend unavailable");
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (body?.detail) detail = JSON.stringify(body.detail);
    } catch {
      // response had no JSON body -- keep statusText
    }
    console.error(`Request to ${path} failed: ${response.status} ${detail}`);
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}
