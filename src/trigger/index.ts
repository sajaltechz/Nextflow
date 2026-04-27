/** Side-effect: registers Trigger.dev tasks for deployment (`npx trigger.dev@latest dev`). */
export { cropImageTask } from "@/trigger/crop-image";
export { extractFrameTask } from "@/trigger/extract-frame";
export { llmNodeTask } from "@/trigger/llm-node";
export { nodeTextTask, nodeUploadImageTask, nodeUploadVideoTask } from "@/trigger/node-passthrough";
export { workflowOrchestratorTask } from "@/trigger/workflow-orchestrator";
