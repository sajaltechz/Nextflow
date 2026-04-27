type PrismaLike = {
  workflowRun: {
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<{ id: string } & Record<string, unknown>>;
    findMany: (args: unknown) => Promise<unknown>;
  };
  workflow: {
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<Record<string, unknown>>;
  };
  nodeExecution: {
    create: (args: unknown) => Promise<unknown>;
  };
};

let cached: PrismaLike | null = null;

/**
 * Lazy runtime import so Trigger task indexing doesn't require Prisma to be
 * initialized at module-import time.
 */
export async function getTriggerPrisma(): Promise<PrismaLike> {
  if (cached) return cached;
  const mod = await import("@prisma/client");
  const PrismaClient = (mod as { PrismaClient: new (args?: unknown) => PrismaLike }).PrismaClient;
  cached = new PrismaClient({ log: ["warn", "error"] });
  return cached;
}

