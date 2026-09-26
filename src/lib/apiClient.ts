// Central API client — single fetch abstraction for all API calls
// Auth: access token in memory (Authorization header) + httpOnly cookies.
// Refresh uses the cookie only (no body fallback) — cookies-only hardening.

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("[apiClient] NEXT_PUBLIC_API_URL is not set — API calls will use relative paths and fail. Set it to http://localhost:4000 (dev) or your backend URL.");
}

export function requireApiBase(): string {
  if (!API_BASE && typeof window !== "undefined") {
    throw new Error("NEXT_PUBLIC_API_URL is not set — configure it to reach the backend");
  }
  return API_BASE;
}

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
  isUnauthorized(): boolean { return this.status === 401; }
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = (data.error as string) || `HTTP ${res.status}`;
    const code = (data.code as string) || undefined;
    // Hard auth failures: single source broadcasts, AuthGuard signs out centrally.
    if (typeof window !== "undefined" && (code === "ACCOUNT_DISABLED" || code === "SHOP_DISABLED" || code === "SESSION_REVOKED" || code === "REUSE_DETECTED" || code === "TOKEN_EXPIRED")) {
      window.dispatchEvent(new CustomEvent<string>("auth:revoked", { detail: code }));
    }
    throw new ApiError(msg, res.status, code);
  }
  return data as T;
}

export type RequestOpts = { signal?: AbortSignal; headers?: Record<string, string>; timeoutMs?: number };

function getMemoryToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Dynamic access avoids the store→apiClient import cycle at module load.
    const mod = (globalThis as any).__gbretailAuthStore as { getState?: () => { accessToken?: string | null } } | undefined;
    if (mod?.getState) return mod.getState().accessToken ?? null;
  } catch {
    // ignore
  }
  return null;
}

export function setMemoryTokenStore(ref: { getState: () => { accessToken: string | null } }): void {
  (globalThis as any).__gbretailAuthStore = ref;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...(extra || {}) };
  const token = getMemoryToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && String(v).trim() !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      // Cookie-only refresh — no body token (httpOnly hardening).
      const refreshRes = await fetch(`${requireApiBase()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      if (!refreshRes.ok) {
        const data = await refreshRes.json().catch(() => ({}));
        const code = (data as any)?.code;
        if (typeof window !== "undefined" && (code === "REUSE_DETECTED" || code === "SESSION_REVOKED" || code === "ACCOUNT_DISABLED" || code === "SHOP_DISABLED")) {
          window.dispatchEvent(new CustomEvent<string>("auth:revoked", { detail: code }));
        }
        return false;
      }
      const data = await refreshRes.json().catch(() => ({}));
      const newToken = (data as any).accessToken as string | undefined;
      if (newToken && typeof window !== "undefined") {
        try {
          const { useAuthStore } = await import("@/store/authStore");
          useAuthStore.getState().setToken(newToken);
        } catch {
          // store unavailable — header will miss token, next 401 re-triggers refresh
        }
      }
      return Boolean(newToken);
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function fetchWithAuth(url: string, init: RequestInit & { timeoutMs?: number }): Promise<Response> {
  requireApiBase();
  // include cookies for refresh flow (same-site localhost shares cookies across ports)
  init.credentials = "include";
  init.headers = buildHeaders(init.headers as Record<string, string>);
  const timeoutMs = init.timeoutMs ?? 15_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // Honor caller-provided AbortSignal by forwarding abort
  const userSignal = (init as RequestInit).signal;
  if (userSignal) {
    if (userSignal.aborted) ctrl.abort();
    else userSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    let res = await fetch(url, { ...init, signal: ctrl.signal });
    if (res.status === 401) {
      const path = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname;
      // don't infinite loop on auth endpoints
      if (!path.includes("/api/auth/")) {
        const ok = await doRefresh();
        if (ok) {
          // retry original request once with the fresh token
          const retryHeaders = buildHeaders(init.headers as Record<string, string>);
          res = await fetch(url, { ...init, headers: retryHeaders, signal: undefined });
        }
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>, opts?: RequestOpts): Promise<T> {
    const url = `${requireApiBase()}${path}${params ? qs(params) : ""}`;
    return fetchWithAuth(url, { signal: opts?.signal, headers: opts?.headers, method: "GET", timeoutMs: opts?.timeoutMs } as RequestInit & { timeoutMs?: number }).then(handleResponse<T>);
  },
  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${requireApiBase()}${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
      headers: opts?.headers,
      timeoutMs: opts?.timeoutMs,
    } as RequestInit & { timeoutMs?: number }).then(handleResponse<T>);
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${requireApiBase()}${path}`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
      headers: opts?.headers,
      timeoutMs: opts?.timeoutMs,
    } as RequestInit & { timeoutMs?: number }).then(handleResponse<T>);
  },
  delete<T>(path: string, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${requireApiBase()}${path}`, { method: "DELETE", signal: opts?.signal, headers: opts?.headers, timeoutMs: opts?.timeoutMs } as RequestInit & { timeoutMs?: number }).then(handleResponse<T>);
  },
  /** Authenticated file download (Authorization header + cookies, not window.open). */
  async download(path: string, params?: Record<string, string | number | undefined | null>, filename?: string): Promise<void> {
    const res = await fetchWithAuth(`${requireApiBase()}${path}${params ? qs(params) : ""}`, { method: "GET" } as RequestInit);
    if (!res.ok) {
      await handleResponse(res as Response);
      return;
    }
    const blob = await res.blob();
    const fallback = path.split("/").pop() || "export.csv";
    const name = filename || (res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ?? fallback);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
