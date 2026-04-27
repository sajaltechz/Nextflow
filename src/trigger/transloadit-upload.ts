import { Transloadit } from "transloadit";
import { pickSslUrlFromAssemblyResults } from "@/lib/transloadit-result";

/** Upload a local file via Transloadit `/upload/handle` and return a public HTTPS URL. */
export async function uploadLocalFileToTransloadit(filePath: string): Promise<string> {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_SECRET;
  if (!authKey || !authSecret) {
    throw new Error("TRANSLOADIT_AUTH_KEY and TRANSLOADIT_SECRET must be set for Trigger tasks.");
  }

  const client = new Transloadit({ authKey, authSecret });
  const assembly = await client.createAssembly({
    params: {
      steps: {
        ":original": { robot: "/upload/handle" },
      },
    },
    files: { file: filePath },
    waitForCompletion: true,
  });

  if (!assembly.ok) {
    throw new Error(`Transloadit assembly failed: ${assembly.error ?? assembly.message ?? "unknown"}`);
  }

  return pickSslUrlFromAssemblyResults(assembly);
}
