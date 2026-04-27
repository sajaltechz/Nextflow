import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";

export default async function WorkflowPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="h-screen w-full">
      <div className="absolute right-4 top-4 z-30">
        <UserButton />
      </div>
      <WorkflowBuilder />
    </main>
  );
}
