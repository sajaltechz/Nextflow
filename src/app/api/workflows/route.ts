import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowPayloadSchema } from "@/lib/schemas";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const payload = workflowPayloadSchema.parse(json);
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: payload.name,
      nodesJson: payload.nodes,
      edgesJson: payload.edges,
    },
  });
  return NextResponse.json({ workflow });
}
