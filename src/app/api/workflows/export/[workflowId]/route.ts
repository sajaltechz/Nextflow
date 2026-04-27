import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ workflowId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;
  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(JSON.stringify(workflow, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${workflow.name}.json"`,
    },
  });
}
