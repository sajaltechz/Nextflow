/** Extract first public HTTPS URL from a completed Transloadit assembly `results` map. */
export function pickSslUrlFromAssemblyResults(results: unknown): string {
  if (!results || typeof results !== "object") throw new Error("Transloadit assembly returned no results");
  for (const items of Object.values(results as Record<string, unknown>)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = item as { ssl_url?: string | null; url?: string | null };
      if (row.ssl_url) return row.ssl_url;
      if (row.url) return row.url;
    }
  }
  throw new Error("Transloadit assembly missing file URL in results");
}
