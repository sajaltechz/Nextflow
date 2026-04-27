import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { task } from "@trigger.dev/sdk/v3";
import { uploadLocalFileToTransloadit } from "@/trigger/transloadit-upload";

const execFileAsync = promisify(execFile);

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 900,
  run: async (payload: {
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }) => {
    const dir = await mkdtemp(join(tmpdir(), "nf-crop-"));
    try {
      const inputPath = join(dir, "input.bin");
      const outputPath = join(dir, "out.jpg");

      const res = await fetch(payload.imageUrl);
      if (!res.ok) throw new Error(`Failed to download image: ${payload.imageUrl}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(inputPath, buf);

      const { xPercent, yPercent, widthPercent, heightPercent } = payload;
      const vf = `crop=iw*${widthPercent}/100:ih*${heightPercent}/100:iw*${xPercent}/100:ih*${yPercent}/100`;

      await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-vf", vf, "-frames:v", "1", outputPath], {
        maxBuffer: 10 * 1024 * 1024,
      });

      const url = await uploadLocalFileToTransloadit(outputPath);
      return { kind: "image" as const, url };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
