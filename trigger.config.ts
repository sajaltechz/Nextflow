import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const configDir = dirname(fileURLToPath(import.meta.url));

// Trigger CLI deploy can run from a different cwd, so resolve relative to this file.
// Also allow shell env (TRIGGER_PROJECT_ID=...) to override file values naturally.
config({ path: resolve(configDir, ".env") });
config({ path: resolve(configDir, ".env.local") });

import { defineConfig } from "@trigger.dev/sdk/v3";

// Prefer explicit env override, otherwise use your fixed project ref.
const project = process.env.TRIGGER_PROJECT_ID?.trim() || "proj_ifartnbvijaewppilkyv";

export default defineConfig({
  project,
  dirs: ["./src/trigger"],
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  build: {
    // Prisma uses native query engine binaries; keep these packages external so
    // Trigger's image includes the engine files instead of bundling away paths.
    external: ["@prisma/client", "prisma", ".prisma/client", "@prisma/engines"],
    autoDetectExternal: true,
  },
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },
});
