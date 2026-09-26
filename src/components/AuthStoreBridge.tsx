"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { setMemoryTokenStore } from "@/lib/apiClient";

// Bridges the zustand store to apiClient's memory-token reader without
// creating a module import cycle (apiClient ↔ authStore).
export default function AuthStoreBridge() {
  useEffect(() => {
    setMemoryTokenStore(useAuthStore as unknown as { getState: () => { accessToken: string | null } });
  }, []);
  return null;
}
