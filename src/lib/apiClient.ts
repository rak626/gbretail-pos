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
  isUnauthorized(): boolean { return this.status === 401; }
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({} as Record<string, unknown>));
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = (data.error as string) || `HTTP ${res.status}`;
    const code = (data.code as string) || undefined;
    // Hard auth failures: single source broadcasts, AuthGuard signs out centrally.
    // (Direct import would cycle: apiClient -> authStore -> authApi -> apiClient.)
    if (typeof window !== "undefined" && (code === "ACCOUNT_DISABLED" || code === "SHOP_DISABLED" || code === "SESSION_REVOKED")) {
      window.dispatchEvent(new CustomEvent<string>("auth:revoked", { detail: code }));
    }
    throw new ApiError(msg, res.status, code);
  }
  return data as T;
}

export type RequestOpts = { signal?: AbortSignal; headers?: Record<string, string> };

// Token helpers — client side only
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...(extra || {}) };
  const token = getAuthToken();
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

async function fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
  // include cookies for refresh flow
  init.credentials = "include";
  init.headers = buildHeaders(init.headers as Record<string, string>);
  let res = await fetch(url, init);
  // on 401, try refresh once
  if (res.status === 401 && !init.headers) {
    // already tried
  }
  if (res.status === 401) {
    const path = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname;
    // don't infinite loop on auth endpoints
    if (!path.includes("/api/auth/")) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: buildHeaders(),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json().catch(() => ({}));
          const newToken = (data as any).accessToken;
          if (newToken && typeof window !== "undefined") {
            // Single token truth lives in the auth store — write through so a
            // later reload rehydrates the FRESH token, not the stale persisted one.
            localStorage.setItem("accessToken", newToken);
            try {
              const mod = await import("@/store/authStore");
              mod.useAuthStore.setState({ accessToken: newToken });
            } catch {
              // store unavailable (tests) — localStorage copy still works
            }
          }
          // retry original request with new token
          init.headers = buildHeaders(init.headers as Record<string, string>);
          res = await fetch(url, init);
        }
      } catch {
        // refresh failed — will handle as 401 below
      }
    }
  }
  return res;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>, opts?: RequestOpts): Promise<T> {
    const url = `${API_BASE}${path}${params ? qs(params) : ""}`;
    return fetchWithAuth(url, { signal: opts?.signal, headers: opts?.headers, method: "GET" } as RequestInit).then(handleResponse<T>);
  },
  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${API_BASE}${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
      headers: opts?.headers,
    } as RequestInit).then(handleResponse<T>);
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${API_BASE}${path}`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
      headers: opts?.headers,
    } as RequestInit).then(handleResponse<T>);
  },
  delete<T>(path: string, opts?: RequestOpts): Promise<T> {
    return fetchWithAuth(`${API_BASE}${path}`, { method: "DELETE", signal: opts?.signal, headers: opts?.headers } as RequestInit).then(handleResponse<T>);
  },
  exportUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
    // export needs auth via header? For now return URL — caller can fetch with auth or window.open (cookie)
    return `${API_BASE}${path}${params ? qs(params) : ""}`;
  },
  /** Authenticated file download (Authorization header, not window.open). */
  async download(path: string, params?: Record<string, string | number | undefined | null>, filename?: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}${path}${params ? qs(params) : ""}`, { method: "GET" } as RequestInit);
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
