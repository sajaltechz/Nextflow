import type { Edge, Node } from "@xyflow/react";

const handleTypeMap: Record<string, "text" | "number" | "image" | "video"> = {
  system_prompt: "text",
  user_message: "text",
  images: "image",
  image_url: "image",
  x_percent: "number",
  y_percent: "number",
  width_percent: "number",
  height_percent: "number",
  video_url: "video",
  timestamp: "text",
};

export function getExpectedInputType(handle = "") {
  return handleTypeMap[handle] ?? "text";
}

export function isTypeCompatible(sourceNode: Node, targetHandle?: string | null) {
  const sourceType = String((sourceNode.data as Record<string, unknown>).outputType ?? "text");
  const expected = getExpectedInputType(targetHandle ?? "");
  return sourceType === expected;
}

export function createsCycle(connection: { source?: string | null; target?: string | null }, nodes: Node[], edges: Edge[]) {
  const { source, target } = connection;
  if (!source || !target) return false;
  const nextEdges = [...edges, { id: "__tmp__", source, target }];
  const stack = [target];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    if (current === source) return true;
    seen.add(current);
    const outgoing = nextEdges.filter((edge) => edge.source === current).map((edge) => edge.target);
    stack.push(...outgoing);
  }
  return false;
}
