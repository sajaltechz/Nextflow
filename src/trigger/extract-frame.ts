import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { task } from "@trigger.dev/sdk/v3";
import { uploadLocalFileToTransloadit } from "@/trigger/transloadit-upload";

const execFileAsync = promisify(execFile);

async function probeDurationSeconds(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath],
    { maxBuffer: 1024 * 1024 },
  );
  const v = parseFloat(String(stdout).trim());
  if (!Number.isFinite(v) || v <= 0) throw new Error("ffprobe could not read video duration");
  return v;
}

function parseTimestamp(raw: string | undefined, durationSec: number): number {
  const s = (raw ?? "0").trim();
  if (!s) return 0;
  if (s.endsWith("%")) {
    const pct = parseFloat(s.slice(0, -1));
    if (!Number.isFinite(pct)) throw new Error(`Invalid percentage timestamp: ${raw}`);
    return (durationSec * pct) / 100;
  }
  const sec = parseFloat(s);
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`Invalid timestamp: ${raw}`);
  return sec;
}

export const extractFrameTask = task({
  id: "extract-frame",
  maxDuration: 900,
  run: async (payload: { videoUrl: string; timestamp?: string }) => {
    const dir = await mkdtemp(join(tmpdir(), "nf-extract-"));
    try {
      const videoPath = join(dir, "input.bin");
      const framePath = join(dir, "frame.jpg");

      const res = await fetch(payload.videoUrl);
      if (!res.ok) throw new Error(`Failed to download video: ${payload.videoUrl}`);
      await writeFile(videoPath, Buffer.from(await res.arrayBuffer()));

      const duration = await probeDurationSeconds(videoPath);
      const ss = parseTimestamp(payload.timestamp, duration);

      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", videoPath, "-ss", String(ss), "-vframes", "1", "-q:v", "2", framePath],
        { maxBuffer: 10 * 1024 * 1024 },
      );

      const url = await uploadLocalFileToTransloadit(framePath);
      return { kind: "image" as const, url };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
