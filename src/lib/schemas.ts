import { z } from "zod";
import { runScopeSchema } from "@/lib/workflow-types";

export const workflowPayloadSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.record(z.string(), z.any())),
  edges: z.array(z.record(z.string(), z.any())),
});

export const runWorkflowSchema = z
  .object({
    workflowId: z.string().min(1).optional(),
    workflowName: z.string().min(1).optional(),
    nodes: z.array(z.record(z.string(), z.any())).optional(),
    edges: z.array(z.record(z.string(), z.any())).optional(),
    scope: runScopeSchema,
    selectedNodeIds: z.array(z.string()).optional(),
    singleNodeId: z.string().optional(),
  })
  .refine((d) => Boolean(d.workflowId) || (Array.isArray(d.nodes) && Array.isArray(d.edges)), {
    message: "Provide workflowId or both nodes and edges",
  })
  .refine((d) => d.scope !== "partial" || (d.selectedNodeIds && d.selectedNodeIds.length > 0), {
    message: "partial scope requires selectedNodeIds",
  })
  .refine((d) => d.scope !== "single" || Boolean(d.singleNodeId), {
    message: "single scope requires singleNodeId",
  });

