import type { Edge, Node } from "@xyflow/react";

/** Positions spaced for tall nodes (handles + controls); avoids overlap on typical laptop widths. */
export const sampleNodes: Node[] = [
  { id: "img-upload", type: "workflow", position: { x: 40, y: 40 }, data: { label: "Upload Image Node", kind: "uploadImage", outputType: "image", values: {} } },
  { id: "crop", type: "workflow", position: { x: 400, y: 40 }, data: { label: "Crop Image Node", kind: "cropImage", outputType: "image", values: { x_percent: 10, y_percent: 10, width_percent: 80, height_percent: 80 } } },
  { id: "sys-a", type: "workflow", position: { x: 40, y: 320 }, data: { label: "Text Node #1", kind: "text", outputType: "text", values: { text: "You are a professional marketing copywriter" } } },
  { id: "usr-a", type: "workflow", position: { x: 40, y: 520 }, data: { label: "Text Node #2", kind: "text", outputType: "text", values: { text: "Product: Wireless Headphones with noise cancellation" } } },
  { id: "llm-a", type: "workflow", position: { x: 800, y: 200 }, data: { label: "LLM Node #1", kind: "llm", outputType: "text", values: { model: "gemini-1.5-flash", temperature: 0.7, maxTokens: 400 } } },
  { id: "video-upload", type: "workflow", position: { x: 40, y: 780 }, data: { label: "Upload Video Node", kind: "uploadVideo", outputType: "video", values: {} } },
  { id: "extract", type: "workflow", position: { x: 400, y: 780 }, data: { label: "Extract Frame Node", kind: "extractFrame", outputType: "image", values: { timestamp: "50%" } } },
  { id: "sys-b", type: "workflow", position: { x: 800, y: 640 }, data: { label: "Text Node #3", kind: "text", outputType: "text", values: { text: "You are a social media manager creating a tweet" } } },
  { id: "llm-b", type: "workflow", position: { x: 1220, y: 360 }, data: { label: "LLM Node #2", kind: "llm", outputType: "text", values: { model: "gemini-1.5-pro", temperature: 0.7, maxTokens: 220 } } },
];

export const sampleEdges: Edge[] = [
  { id: "e1", source: "img-upload", target: "crop", targetHandle: "image_url" },
  { id: "e2", source: "crop", target: "llm-a", targetHandle: "images" },
  { id: "e3", source: "sys-a", target: "llm-a", targetHandle: "system_prompt" },
  { id: "e4", source: "usr-a", target: "llm-a", targetHandle: "user_message" },
  { id: "e5", source: "video-upload", target: "extract", targetHandle: "video_url" },
  { id: "e6", source: "llm-a", target: "llm-b", targetHandle: "user_message" },
  { id: "e7", source: "sys-b", target: "llm-b", targetHandle: "system_prompt" },
  { id: "e8", source: "crop", target: "llm-b", targetHandle: "images" },
  { id: "e9", source: "extract", target: "llm-b", targetHandle: "images" },
];
