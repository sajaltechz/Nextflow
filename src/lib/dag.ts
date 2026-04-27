import type { Edge } from "@xyflow/react";

export type RunScope = "full" | "partial" | "single";

export type FlowNode = {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Collect scope nodes plus all ancestors (needed inputs). */
export function executionNodeIds(
  nodes: FlowNode[],
  edges: Edge[],
  scope: RunScope,
  selectedNodeIds: string[],
  singleNodeId: string | null,
): Set<string> {
  const ids = new Set<string>();
  const allIds = new Set(nodes.map((n) => n.id));

  if (scope === "full") {
    nodes.forEach((n) => ids.add(n.id));
    return ids;
  }

  const seeds =
    scope === "single" && singleNodeId ? [singleNodeId] : selectedNodeIds.filter((id) => allIds.has(id));

  for (const id of seeds) {
    ids.add(id);
  }

  const reverseAdj = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const arr = reverseAdj.get(e.target) ?? [];
    arr.push(e.source);
    reverseAdj.set(e.target, arr);
  }

  const stack = [...seeds];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    for (const pred of reverseAdj.get(cur) ?? []) {
      if (!allIds.has(pred)) continue;
      if (!ids.has(pred)) {
        ids.add(pred);
        stack.push(pred);
      }
    }
  }
  return ids;
}

export function subgraphEdges(edges: Edge[], nodeIds: Set<string>): Edge[] {
  return edges.filter((e) => e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));
}

/** Returns true if subgraph has a cycle (only edges inside nodeIds). */
export function subgraphHasCycle(nodeIds: Set<string>, edges: Edge[]): boolean {
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of nodeIds) indeg.set(id, 0);
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    const arr = adj.get(e.source) ?? [];
    arr.push(e.target);
    adj.set(e.source, arr);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const q = [...nodeIds].filter((id) => (indeg.get(id) ?? 0) === 0);
  let seen = 0;
  while (q.length) {
    const n = q.pop();
    if (!n) continue;
    seen++;
    for (const t of adj.get(n) ?? []) {
      const v = (indeg.get(t) ?? 0) - 1;
      indeg.set(t, v);
      if (v === 0) q.push(t);
    }
  }
  return seen !== nodeIds.size;
}

export function predecessorsInSet(nodeId: string, edges: Edge[], nodeIds: Set<string>): string[] {
  const preds: string[] = [];
  for (const e of edges) {
    if (e.target === nodeId && e.source && nodeIds.has(e.source)) preds.push(e.source);
  }
  return preds;
}
