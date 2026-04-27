import { resolve } from "node:path";
import { config } from "dotenv";

// Trigger CLI does not load Next.js env files — load `.env` then `.env.local` (local wins).
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

import { defineConfig } from "@trigger.dev/sdk/v3";

const project = process.env.TRIGGER_PROJECT_ID?.trim();
if (!project) {
  throw new Error(
    'Set TRIGGER_PROJECT_ID in `.env` or `.env.local` to your Trigger project ref (e.g. "proj_abc123"). Find it in Trigger dashboard → your project → Settings.',
  );
}

export default defineConfig({
  project,
  dirs: ["./src/trigger"],
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
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
