import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
    setupFiles: ["./vitest.setup.ts"],
    env: { NEXT_PUBLIC_API_URL: "http://localhost:4000" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
