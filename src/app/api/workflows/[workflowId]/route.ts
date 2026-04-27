import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowPayloadSchema } from "@/lib/schemas";

type Params = { params: Promise<{ workflowId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function PUT(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;
  const payload = workflowPayloadSchema.parse(await req.json());

  const workflow = await prisma.workflow.update({
    where: { id_userId: { id: workflowId, userId } },
    data: { name: payload.name, nodesJson: payload.nodes, edgesJson: payload.edges },
  });
  return NextResponse.json({ workflow });
}

export async function DELETE(_: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;

  await prisma.workflow.delete({ where: { id_userId: { id: workflowId, userId } } });
  return NextResponse.json({ ok: true });
}
