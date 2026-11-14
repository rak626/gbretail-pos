import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "node_modules/@gbretail/backend/prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/postgres" },
});
