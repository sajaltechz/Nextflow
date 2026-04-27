import { task } from "@trigger.dev/sdk/v3";

export const nodeTextTask = task({
  id: "node-text",
  maxDuration: 120,
  run: async (payload: { text: string }) => ({
    kind: "text" as const,
    text: payload.text ?? "",
  }),
});

export const nodeUploadImageTask = task({
  id: "node-upload-image",
  maxDuration: 120,
  run: async (payload: { imageUrl: string }) => {
    if (!payload.imageUrl) throw new Error("Upload Image node has no image URL yet. Upload a file in the UI first.");
    return { kind: "image" as const, url: payload.imageUrl };
  },
});

export const nodeUploadVideoTask = task({
  id: "node-upload-video",
  maxDuration: 120,
  run: async (payload: { videoUrl: string }) => {
    if (!payload.videoUrl) throw new Error("Upload Video node has no video URL yet. Upload a file in the UI first.");
    return { kind: "video" as const, url: payload.videoUrl };
  },
});
