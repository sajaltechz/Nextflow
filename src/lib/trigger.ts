import { tasks } from "@trigger.dev/sdk/v3";

type TriggerPayload = Record<string, unknown>;

/**
 * Enqueues a Trigger.dev task from Next.js (requires TRIGGER_SECRET_KEY in env).
 */
export async function dispatchTriggerTask(taskId: string, payload: TriggerPayload) {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY is not set. Add it from Trigger.dev project API keys.");
  }

  return tasks.trigger(taskId as never, payload as never);
}
