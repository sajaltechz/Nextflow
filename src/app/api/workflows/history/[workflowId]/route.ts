import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ workflowId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId, userId },
    orderBy: { createdAt: "desc" },
    include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ runs });
}
