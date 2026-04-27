import type { Edge } from "@xyflow/react";
import type { Prisma } from "@prisma/client";
import { tasks } from "@trigger.dev/sdk/v3";
import { task } from "@trigger.dev/sdk/v3";
import {
  executionNodeIds,
  predecessorsInSet,
  subgraphEdges,
  subgraphHasCycle,
  type FlowNode,
  type RunScope,
} from "@/lib/dag";
import { prisma } from "@/lib/prisma";

export type NodeRunValue =
  | { kind: "text"; text: string }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string };

type OrchestratorPayload = {
  runId: string;
  workflowId: string;
  userId: string;
  scope: RunScope;
  selectedNodeIds: string[];
  singleNodeId: string | null;
};

async function triggerChild<T>(taskId: string, payload: unknown): Promise<T> {
  const result = await tasks.triggerAndWait(taskId as never, payload as never);
  if (!result.ok) {
    const err = result.error as { message?: string } | undefined;
    throw new Error(err?.message ?? String(result.error ?? "Child task failed"));
  }
  return result.output as T;
}

function getKind(n: FlowNode): string {
  return String(n.data?.kind ?? "text");
}

function getValues(n: FlowNode): Record<string, unknown> {
  const v = n.data?.values;
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function getLabel(n: FlowNode): string {
  return String(n.data?.label ?? n.id);
}

function incoming(nodeId: string, edges: Edge[], handle?: string): Edge[] {
  return edges.filter((e) => e.target === nodeId && (!handle || e.targetHandle === handle));
}

function outputToDisplay(o: NodeRunValue): string {
  if (o.kind === "text") return o.text;
  return o.url;
}

function readTextOutput(outputs: Map<string, NodeRunValue>, sourceId: string): string | undefined {
  const o = outputs.get(sourceId);
  if (o?.kind === "text") return o.text;
  return undefined;
}

function readImageUrl(outputs: Map<string, NodeRunValue>, sourceId: string): string | undefined {
  const o = outputs.get(sourceId);
  if (o?.kind === "image") return o.url;
  return undefined;
}

function readVideoUrl(outputs: Map<string, NodeRunValue>, sourceId: string): string | undefined {
  const o = outputs.get(sourceId);
  if (o?.kind === "video") return o.url;
  return undefined;
}

export const workflowOrchestratorTask = task({
  id: "workflow-orchestrator",
  maxDuration: 3600,
  run: async (payload: OrchestratorPayload) => {
    const t0 = Date.now();
    const { runId, workflowId, userId } = payload;

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "running" },
    });

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });
    if (!workflow) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "failed", durationMs: Date.now() - t0 },
      });
      throw new Error("Workflow not found");
    }

    const nodes = workflow.nodesJson as unknown as FlowNode[];
    const edges = workflow.edgesJson as unknown as Edge[];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const exeSet = executionNodeIds(
      nodes,
      edges,
      payload.scope,
      payload.selectedNodeIds,
      payload.singleNodeId,
    );
    const subEdges = subgraphEdges(edges, exeSet);

    if (exeSet.size === 0) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "failed", durationMs: Date.now() - t0 },
      });
      throw new Error("No nodes selected for execution");
    }

    if (subgraphHasCycle(exeSet, subEdges)) {
      await prisma.workflowRun.update({
        where: { id: runId },
        data: { status: "failed", durationMs: Date.now() - t0 },
      });
      throw new Error("Workflow subgraph contains a cycle");
    }

    const pending = new Set(exeSet);
    const outputs = new Map<string, NodeRunValue>();
    const failed = new Set<string>();
    let hadSuccess = false;

    while (pending.size > 0) {
      const readyRun: string[] = [];
      const readyFail: string[] = [];

      for (const id of pending) {
        const preds = predecessorsInSet(id, subEdges, exeSet);
        const waiting = preds.some((p) => !outputs.has(p) && !failed.has(p));
        if (waiting) continue;
        if (preds.some((p) => failed.has(p))) {
          readyFail.push(id);
        } else {
          readyRun.push(id);
        }
      }

      if (readyRun.length === 0 && readyFail.length === 0) {
        break;
      }

      for (const id of readyFail) {
        pending.delete(id);
        failed.add(id);
        await prisma.nodeExecution.create({
          data: {
            runId,
            nodeId: id,
            nodeLabel: getLabel(nodeMap.get(id)!),
            status: "failed",
            durationMs: 0,
            inputJson: { reason: "upstream_dependency_failed" } as Prisma.InputJsonValue,
            error: "An upstream node failed or was skipped.",
          },
        });
      }

      // Trigger.dev wait APIs cannot be wrapped in Promise.all inside a task.
      // Execute ready nodes one-by-one in this phase.
      for (const nodeId of readyRun) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        const started = Date.now();
        const values = getValues(node);
        const kind = getKind(node);
        const label = getLabel(node);

        const inputJson: Record<string, unknown> = { kind };

        try {
          let out: NodeRunValue;

          if (kind === "text") {
            const text = String(values.text ?? "");
            inputJson.text = text;
            out = await triggerChild("node-text", { text });
          } else if (kind === "uploadImage") {
            const imageUrl = String(values.imageUrl ?? "");
            inputJson.imageUrl = imageUrl;
            out = await triggerChild("node-upload-image", { imageUrl });
          } else if (kind === "uploadVideo") {
            const videoUrl = String(values.videoUrl ?? "");
            inputJson.videoUrl = videoUrl;
            out = await triggerChild("node-upload-video", { videoUrl });
          } else if (kind === "cropImage") {
            const imgEdge = incoming(nodeId, edges, "image_url")[0];
            const imageUrl = imgEdge
              ? readImageUrl(outputs, imgEdge.source)
              : String(values.image_url ?? values.imageUrl ?? "");
            const pickNum = (handle: string, fallback: number) => {
              const e = incoming(nodeId, edges, handle)[0];
              if (e) {
                const t = readTextOutput(outputs, e.source);
                if (t !== undefined) return parseFloat(t);
              }
              const v = values[handle];
              if (typeof v === "number" && Number.isFinite(v)) return v;
              if (typeof v === "string" && v.trim()) return parseFloat(v);
              return fallback;
            };
            if (!imageUrl) throw new Error("cropImage requires image_url");
            const xPercent = pickNum("x_percent", 0);
            const yPercent = pickNum("y_percent", 0);
            const widthPercent = pickNum("width_percent", 100);
            const heightPercent = pickNum("height_percent", 100);
            inputJson.imageUrl = imageUrl;
            inputJson.xPercent = xPercent;
            inputJson.yPercent = yPercent;
            inputJson.widthPercent = widthPercent;
            inputJson.heightPercent = heightPercent;
            out = await triggerChild("crop-image", {
              imageUrl,
              xPercent,
              yPercent,
              widthPercent,
              heightPercent,
            });
          } else if (kind === "extractFrame") {
            const vEdge = incoming(nodeId, edges, "video_url")[0];
            const videoUrl = vEdge
              ? readVideoUrl(outputs, vEdge.source)
              : String(values.video_url ?? values.videoUrl ?? "");
            const tsEdge = incoming(nodeId, edges, "timestamp")[0];
            const timestamp = tsEdge
              ? readTextOutput(outputs, tsEdge.source)
              : String(values.timestamp ?? "0");
            if (!videoUrl) throw new Error("extractFrame requires video_url");
            inputJson.videoUrl = videoUrl;
            inputJson.timestamp = timestamp;
            out = await triggerChild("extract-frame", { videoUrl, timestamp });
          } else if (kind === "llm") {
            const sysEdge = incoming(nodeId, edges, "system_prompt")[0];
            const systemPrompt = sysEdge ? readTextOutput(outputs, sysEdge.source) : String(values.system_prompt ?? "");
            const userEdge = incoming(nodeId, edges, "user_message")[0];
            const userMessage = userEdge
              ? readTextOutput(outputs, userEdge.source)
              : String(values.user_message ?? "");
            if (!userMessage?.trim()) throw new Error("LLM node requires user_message");

            const imageEdges = incoming(nodeId, edges, "images");
            const imageUrls = imageEdges
              .map((e) => readImageUrl(outputs, e.source))
              .filter((u): u is string => Boolean(u));

            const model = String(values.model ?? "gemini-1.5-flash");
            const temperature = typeof values.temperature === "number" ? values.temperature : 0.7;
            const maxTokens = typeof values.maxTokens === "number" ? values.maxTokens : 1024;

            inputJson.model = model;
            inputJson.temperature = temperature;
            inputJson.maxTokens = maxTokens;
            inputJson.systemPrompt = systemPrompt;
            inputJson.userMessage = userMessage;
            inputJson.imageUrls = imageUrls;

            out = await triggerChild("llm-node", {
              systemPrompt: systemPrompt || undefined,
              userMessage,
              imageUrls: imageUrls.length ? imageUrls : undefined,
              model,
              temperature,
              maxTokens,
            });
          } else {
            throw new Error(`Unknown node kind: ${kind}`);
          }

          const durationMs = Date.now() - started;
          hadSuccess = true;
          outputs.set(nodeId, out);
          pending.delete(nodeId);

          await prisma.nodeExecution.create({
            data: {
              runId,
              nodeId,
              nodeLabel: label,
              status: "success",
              durationMs,
              inputJson: inputJson as Prisma.InputJsonValue,
              outputJson: out as Prisma.InputJsonValue,
            },
          });
        } catch (err) {
          const durationMs = Date.now() - started;
          const message = err instanceof Error ? err.message : String(err);
          failed.add(nodeId);
          pending.delete(nodeId);
          await prisma.nodeExecution.create({
            data: {
              runId,
              nodeId,
              nodeLabel: label,
              status: "failed",
              durationMs,
              inputJson: inputJson as Prisma.InputJsonValue,
              error: message,
            },
          });
        }
      }
    }

    const durationMs = Date.now() - t0;
    let status: string;
    if (failed.size === 0) status = "success";
    else if (hadSuccess) status = "partial";
    else status = "failed";

    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status,
        durationMs,
        summaryJson: { failedNodeIds: [...failed], completed: outputs.size },
      },
    });

    const mergedNodes = nodes.map((n) => {
      const o = outputs.get(n.id);
      if (!o) return n;
      const data = { ...(n.data ?? {}), result: outputToDisplay(o), running: false, error: undefined };
      return { ...n, data };
    });

    await prisma.workflow.update({
      where: { id_userId: { id: workflowId, userId } },
      data: { nodesJson: mergedNodes as Prisma.InputJsonValue },
    });

    return { status, durationMs, failed: [...failed], completed: outputs.size };
  },
});

export type WorkflowOrchestratorTask = typeof workflowOrchestratorTask;
