/**
 * Extract first public URL from a Transloadit response.
 * Handles both `assembly.results` maps and full assembly objects because
 * Transloadit responses can vary by robot/SDK versions.
 */
export function pickSslUrlFromAssemblyResults(input: unknown): string {
  if (!input || typeof input !== "object") {
    throw new Error("Transloadit assembly returned no response object");
  }

  const queue: unknown[] = [input];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    const row = current as { ssl_url?: string | null; url?: string | null };
    if (typeof row.ssl_url === "string" && row.ssl_url.trim()) return row.ssl_url;
    if (typeof row.url === "string" && row.url.trim()) return row.url;

    if (Array.isArray(current)) {
      queue.push(...current);
    } else {
      queue.push(...Object.values(current as Record<string, unknown>));
    }
  }

  throw new Error("Transloadit assembly missing file URL in response");
}
