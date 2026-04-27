import { Pool } from "pg";
import { randomUUID } from "node:crypto";

type TriggerDbLike = {
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

let cached: TriggerDbLike | null = null;
let pool: Pool | null = null;

/**
 * Trigger runtime DB adapter that avoids Prisma binary issues in cloud workers.
 */
export async function getTriggerPrisma(): Promise<TriggerDbLike> {
  if (cached) return cached;
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL is not set in Trigger runtime.");
  pool = new Pool({ connectionString: cs });

  const db: TriggerDbLike = {
    workflowRun: {
      update: async (args) => {
        const a = args as { where: { id: string }; data: Record<string, unknown> };
        const id = a.where.id;
        const d = a.data;
        const sets: string[] = [];
        const vals: unknown[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(d)) {
          if (k === "summaryJson") {
            sets.push(`"summaryJson" = $${i++}::jsonb`);
            vals.push(JSON.stringify(v ?? null));
          } else {
            sets.push(`"${k}" = $${i++}`);
            vals.push(v);
          }
        }
        vals.push(id);
        await pool!.query(`UPDATE "WorkflowRun" SET ${sets.join(", ")} WHERE "id" = $${i}`, vals);
        return { id, ...d };
      },
      create: async (args) => {
        const a = args as { data: Record<string, unknown> };
        const d = a.data;
        const id = randomUUID();
        const q = await pool!.query(
          `INSERT INTO "WorkflowRun" ("id","workflowId","userId","scope","status","durationMs","summaryJson")
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
           RETURNING "id","workflowId","userId","scope","status","durationMs","summaryJson","createdAt"`,
          [
            id,
            d.workflowId,
            d.userId,
            d.scope,
            d.status,
            d.durationMs,
            JSON.stringify(d.summaryJson ?? null),
          ],
        );
        return q.rows[0] as { id: string } & Record<string, unknown>;
      },
      findMany: async () => [],
    },
    workflow: {
      findFirst: async (args) => {
        const a = args as { where: { id: string; userId: string } };
        const q = await pool!.query(
          `SELECT * FROM "Workflow" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
          [a.where.id, a.where.userId],
        );
        return (q.rows[0] ?? null) as Record<string, unknown> | null;
      },
      update: async (args) => {
        const a = args as {
          where: { id_userId: { id: string; userId: string } };
          data: Record<string, unknown>;
        };
        const id = a.where.id_userId.id;
        const userId = a.where.id_userId.userId;
        const d = a.data;
        const sets: string[] = [];
        const vals: unknown[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(d)) {
          if (k.endsWith("Json")) {
            sets.push(`"${k}" = $${i++}::jsonb`);
            vals.push(JSON.stringify(v ?? null));
          } else {
            sets.push(`"${k}" = $${i++}`);
            vals.push(v);
          }
        }
        vals.push(id, userId);
        const q = await pool!.query(
          `UPDATE "Workflow" SET ${sets.join(", ")} WHERE "id" = $${i} AND "userId" = $${i + 1} RETURNING *`,
          vals,
        );
        return q.rows[0];
      },
      create: async (args) => {
        const a = args as { data: Record<string, unknown> };
        const d = a.data;
        const id = randomUUID();
        const q = await pool!.query(
          `INSERT INTO "Workflow" ("id","userId","name","nodesJson","edgesJson")
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb) RETURNING *`,
          [id, d.userId, d.name, JSON.stringify(d.nodesJson ?? []), JSON.stringify(d.edgesJson ?? [])],
        );
        return q.rows[0] as Record<string, unknown>;
      },
    },
    nodeExecution: {
      create: async (args) => {
        const a = args as { data: Record<string, unknown> };
        const d = a.data;
        const id = randomUUID();
        await pool!.query(
          `INSERT INTO "NodeExecution" ("id","runId","nodeId","nodeLabel","status","durationMs","inputJson","outputJson","error")
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)`,
          [
            id,
            d.runId,
            d.nodeId,
            d.nodeLabel,
            d.status,
            d.durationMs,
            JSON.stringify(d.inputJson ?? null),
            JSON.stringify(d.outputJson ?? null),
            d.error ?? null,
          ],
        );
        return { ok: true };
      },
    },
  };

  cached = db;
  return cached;
}

