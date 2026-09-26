import { apiClient } from "@/lib/apiClient";

export async function loginApi(payload: { email: string; password: string; counterId?: string }) {
  const data = await apiClient.post<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; shopId: string | null; email: string; name: string; role: string; canManageInventory?: boolean; counterId?: string | null; counter?: { id: string; name: string } | null; shop?: { id: string; code?: string | null; name: string } | null };
    shop?: { id: string; code?: string | null; name: string } | null;
    counterId?: string | null;
    counter?: { id: string; name: string } | null;
  }>("/api/auth/login", payload);
  return data;
}

export async function fetchMe() {
  return apiClient.get<{
    user: { id: string; shopId: string | null; email: string; name: string; role: string; canManageInventory?: boolean; counterId?: string | null; counter?: { id: string; name: string } | null; shop?: { id: string; code?: string | null; name: string } | null };
    shop: { id: string; code?: string | null; name: string } | null;
    counters: { id: string; shopId: string; name: string; isActive: boolean }[];
    shops?: { id: string; code?: string | null; name: string }[];
  }>("/api/auth/me");
}

export async function fetchCounters(shopId?: string) {
  const params: Record<string, string> = {};
  if (shopId) params.shopId = shopId;
  return apiClient.get<{ counters: { id: string; shopId: string; name: string; isActive: boolean }[] }>("/api/counters", params);
}

export async function fetchShops() {
  return apiClient.get<{ shops: { id: string; code?: string | null; name: string; address?: string }[] }>("/api/shops");
}

export async function logoutApi() {
  return apiClient.post<{ success: boolean }>("/api/auth/logout");
}
