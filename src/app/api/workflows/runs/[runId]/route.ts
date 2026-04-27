import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ runId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { runId } = await params;

  const run = await prisma.workflowRun.findFirst({
    where: { id: runId, userId },
    include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ run });
}
