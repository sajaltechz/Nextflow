import { z } from "zod";

export const nodeKindSchema = z.enum([
  "text",
  "uploadImage",
  "uploadVideo",
  "llm",
  "cropImage",
  "extractFrame",
]);

export type NodeKind = z.infer<typeof nodeKindSchema>;

export const valueTypeSchema = z.enum(["text", "number", "image", "video"]);
export type ValueType = z.infer<typeof valueTypeSchema>;

export const workflowNodeDataSchema = z.object({
  label: z.string(),
  kind: nodeKindSchema,
  outputType: valueTypeSchema.optional(),
  values: z.record(z.string(), z.any()).default({}),
  result: z.string().optional(),
  running: z.boolean().default(false),
  error: z.string().optional(),
});

export const workflowEdgeDataSchema = z.object({
  inputType: valueTypeSchema,
  key: z.string(),
});

export const runScopeSchema = z.enum(["full", "partial", "single"]);
