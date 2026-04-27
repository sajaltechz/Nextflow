import { auth } from "@clerk/nextjs/server";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { Transloadit } from "transloadit";
import { pickSslUrlFromAssemblyResults } from "@/lib/transloadit-result";

export const runtime = "nodejs";

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/m4v"]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_SECRET;
  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit is not configured (TRANSLOADIT_AUTH_KEY / TRANSLOADIT_SECRET)." }, { status: 500 });
  }

  const formData = await req.formData();
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");

  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "kind must be image or video" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").split(";")[0]?.trim().toLowerCase() ?? "";
  if (kind === "image" && !IMAGE_MIMES.has(mime)) {
    return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 400 });
  }
  if (kind === "video" && !VIDEO_MIMES.has(mime)) {
    return NextResponse.json({ error: `Unsupported video type: ${mime}` }, { status: 400 });
  }

  const dir = await mkdtemp(join(tmpdir(), "nf-upload-"));
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.bin";
  const filePath = join(dir, safeName);

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buf);

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
      return NextResponse.json(
        { error: assembly.error ?? assembly.message ?? "Transloadit assembly failed" },
        { status: 502 },
      );
    }

    const url = pickSslUrlFromAssemblyResults(assembly);
    return NextResponse.json({ url, mimeType: mime, kind });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: `Upload failed: ${message}`,
        kind,
        mimeType: mime,
        fileName: file.name,
        fileSize: file.size,
      },
      { status: 500 },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
