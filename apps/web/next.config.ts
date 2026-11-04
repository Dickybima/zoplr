import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

// Satu file .env di root monorepo untuk semua app.
loadEnvConfig(path.resolve(process.cwd(), "../.."));

const config: NextConfig = {
  transpilePackages: ["@zoplr/core", "@zoplr/db", "@zoplr/launch", "@zoplr/pons"],
  serverExternalPackages: ["postgres"],
};

export default config;
