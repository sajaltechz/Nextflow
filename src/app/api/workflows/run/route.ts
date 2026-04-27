import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflowSchema } from "@/lib/schemas";
import { dispatchTriggerTask } from "@/lib/trigger";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = runWorkflowSchema.parse(await req.json());

  let workflowId = payload.workflowId ?? null;

  if (!workflowId) {
    const created = await prisma.workflow.create({
      data: {
        userId,
        name: payload.workflowName ?? "Untitled workflow",
        nodesJson: payload.nodes ?? [],
        edgesJson: payload.edges ?? [],
      },
    });
    workflowId = created.id;
  } else if (payload.nodes && payload.edges) {
    await prisma.workflow.update({
      where: { id_userId: { id: workflowId, userId } },
      data: {
        nodesJson: payload.nodes,
        edgesJson: payload.edges,
        ...(payload.workflowName ? { name: payload.workflowName } : {}),
      },
    });
  }

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      userId,
      scope: payload.scope,
      status: "queued",
      durationMs: 0,
      summaryJson: {
        selectedNodeIds: payload.selectedNodeIds ?? [],
        singleNodeId: payload.singleNodeId ?? null,
      },
    },
  });

  await dispatchTriggerTask("workflow-orchestrator", {
    runId: run.id,
    workflowId: workflow.id,
    userId,
    scope: payload.scope,
    selectedNodeIds: payload.selectedNodeIds ?? [],
    singleNodeId: payload.singleNodeId ?? null,
  });

  return NextResponse.json({ runId: run.id, workflowId: workflow.id, status: "queued" });
}
