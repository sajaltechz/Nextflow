import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowPayloadSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = workflowPayloadSchema.parse(await req.json());
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
