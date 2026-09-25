// Central API client — single fetch abstraction for all API calls
// Handles BASE, typed errors, and uniform JSON parsing

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
  isNotFound(): boolean { return this.status === 404; }
  isConflict(): boolean { return this.status === 409; }
  isDbNotConfigured(): boolean { return this.status === 503 || this.code === "DB_NOT_CONFIGURED"; }
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({} as Record<string, unknown>));
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = (data.error as string) || `HTTP ${res.status}`;
    const code = (data.code as string) || undefined;
    throw new ApiError(msg, res.status, code);
  }
  return data as T;
}

export type RequestOpts = { signal?: AbortSignal };

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && String(v).trim() !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>, opts?: RequestOpts): Promise<T> {
    const url = `${API_BASE}${path}${params ? qs(params) : ""}`;
    return fetch(url, { signal: opts?.signal }).then(handleResponse<T>);
  },
  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
    }).then(handleResponse<T>);
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
    }).then(handleResponse<T>);
  },
  delete<T>(path: string, opts?: RequestOpts): Promise<T> {
    return fetch(`${API_BASE}${path}`, { method: "DELETE", signal: opts?.signal }).then(handleResponse<T>);
  },
  exportUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
    return `${API_BASE}${path}${params ? qs(params) : ""}`;
  },
};
