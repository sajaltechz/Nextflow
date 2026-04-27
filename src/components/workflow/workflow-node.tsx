"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Loader2, Play } from "lucide-react";
import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

const LLM_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"] as const;

const TARGET_HANDLES: Record<string, string[]> = {
  cropImage: ["image_url", "x_percent", "y_percent", "width_percent", "height_percent"],
  extractFrame: ["video_url", "timestamp"],
  llm: ["system_prompt", "user_message", "images"],
};

function hasIncoming(edges: { target: string; targetHandle?: string | null }[], nodeId: string, handle: string) {
  return edges.some((e) => e.target === nodeId && e.targetHandle === handle);
}

function handleOffset(index: number, total: number) {
  return `${((index + 1) / (total + 1)) * 100}%`;
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function WorkflowNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const kind = String(nodeData.kind ?? "text");
  const running = Boolean(nodeData.running);
  const err = typeof nodeData.error === "string" ? nodeData.error : "";
  const result = typeof nodeData.result === "string" ? nodeData.result : "";
  const values = (nodeData.values && typeof nodeData.values === "object" ? nodeData.values : {}) as Record<
    string,
    unknown
  >;

  const edges = useWorkflowStore((s) => s.edges);
  const patchNode = useWorkflowStore((s) => s.patchNode);
  const setCurrentWorkflowId = useWorkflowStore((s) => s.setCurrentWorkflowId);

  const targets = TARGET_HANDLES[kind] ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wired = useCallback((handle: string) => hasIncoming(edges, id, handle), [edges, id]);

  const onUploadPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    patchNode(id, { running: true, error: undefined });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind === "uploadImage" ? "image" : "video");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await readJsonSafe<{ url?: string; error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          j?.error ?? `Upload failed (${res.status}). Check server logs/env vars for /api/uploads.`,
        );
      }
      if (!j.url) throw new Error("No URL returned");
      if (kind === "uploadImage") patchNode(id, { values: { imageUrl: j.url } });
      else patchNode(id, { values: { videoUrl: j.url } });
    } catch (ex) {
      patchNode(id, { error: ex instanceof Error ? ex.message : "Upload failed" });
    } finally {
      patchNode(id, { running: false });
    }
  };

  const runThisNode = async () => {
    patchNode(id, { running: true, error: undefined });
    try {
      const st = useWorkflowStore.getState();
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: st.currentWorkflowId ?? undefined,
          workflowName: st.workflowName,
          nodes: st.nodes,
          edges: st.edges,
          scope: "single",
          singleNodeId: id,
          selectedNodeIds: [id],
        }),
      });
      const j = await readJsonSafe<{ workflowId?: string; error?: string }>(res);
      if (!res.ok) throw new Error(j?.error ?? `Run failed (${res.status})`);
      if (j?.workflowId) setCurrentWorkflowId(j.workflowId);
    } catch (ex) {
      patchNode(id, { error: ex instanceof Error ? ex.message : "Run failed" });
    } finally {
      patchNode(id, { running: false });
    }
  };

  const num = (v: unknown, fallback: number) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) return parseFloat(v);
    return fallback;
  };

  const cropField = (key: string, label: string, fallback: number) => {
    const disabled = wired(key);
    return (
      <label key={key} className="mt-1 block text-[11px] text-zinc-400">
        {label}
        <input
          type="number"
          min={0}
          max={100}
          disabled={disabled}
          value={num(values[key], fallback)}
          onChange={(e) => patchNode(id, { values: { [key]: parseFloat(e.target.value) || 0 } })}
          className={`mt-0.5 w-full rounded border px-1 py-0.5 text-zinc-100 ${
            disabled ? "cursor-not-allowed border-[#2a2a2a] bg-zinc-800/50 text-zinc-500" : "border-[#333] bg-[#161616]"
          }`}
        />
      </label>
    );
  };

  const renderBody = () => {
    if (kind === "text") {
      return (
        <textarea
          value={String(values.text ?? "")}
          onChange={(e) => patchNode(id, { values: { text: e.target.value } })}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-[#333] bg-[#161616] p-2 text-xs text-zinc-100"
          placeholder="Text…"
        />
      );
    }
    if (kind === "uploadImage") {
      const url = String(values.imageUrl ?? "");
      return (
        <div className="mt-2 space-y-2">
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" className="hidden" onChange={onUploadPick} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-2 py-1.5 text-xs text-zinc-200 hover:border-[#8b5cf6]"
          >
            Choose image…
          </button>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Transloadit URLs; dynamic user content
            <img src={url} alt="" className="max-h-28 w-full rounded-md object-contain" />
          ) : null}
        </div>
      );
    }
    if (kind === "uploadVideo") {
      const url = String(values.videoUrl ?? "");
      return (
        <div className="mt-2 space-y-2">
          <input ref={fileInputRef} type="file" accept=".mp4,.mov,.webm,.m4v,video/*" className="hidden" onChange={onUploadPick} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-2 py-1.5 text-xs text-zinc-200 hover:border-[#8b5cf6]"
          >
            Choose video…
          </button>
          {url ? <video src={url} controls className="max-h-32 w-full rounded-md" /> : null}
        </div>
      );
    }
    if (kind === "cropImage") {
      return (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {cropField("x_percent", "X %", 0)}
          {cropField("y_percent", "Y %", 0)}
          {cropField("width_percent", "W %", 100)}
          {cropField("height_percent", "H %", 100)}
        </div>
      );
    }
    if (kind === "extractFrame") {
      const tsDisabled = wired("timestamp");
      return (
        <label className="mt-2 block text-[11px] text-zinc-400">
          Timestamp (seconds or %)
          <input
            type="text"
            disabled={tsDisabled}
            value={String(values.timestamp ?? "0")}
            onChange={(e) => patchNode(id, { values: { timestamp: e.target.value } })}
            className={`mt-0.5 w-full rounded border px-2 py-1 text-xs ${
              tsDisabled ? "cursor-not-allowed border-[#2a2a2a] bg-zinc-800/50 text-zinc-500" : "border-[#333] bg-[#161616] text-zinc-100"
            }`}
          />
        </label>
      );
    }
    if (kind === "llm") {
      const model = String(values.model ?? "gemini-1.5-flash");
      const temp = num(values.temperature, 0.7);
      const maxTok = num(values.maxTokens, 1024);
      return (
        <div className="mt-2 space-y-2 text-[11px]">
          <label className="block text-zinc-400">
            Model
            <select
              value={model}
              onChange={(e) => patchNode(id, { values: { model: e.target.value } })}
              className="mt-0.5 w-full rounded border border-[#333] bg-[#161616] px-2 py-1 text-xs text-zinc-100"
            >
              {LLM_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-zinc-400">
            Temperature {temp.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temp}
              onChange={(e) => patchNode(id, { values: { temperature: parseFloat(e.target.value) } })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-zinc-400">
            Max tokens
            <input
              type="number"
              min={64}
              max={8192}
              value={Math.round(maxTok)}
              onChange={(e) => patchNode(id, { values: { maxTokens: parseInt(e.target.value, 10) || 256 } })}
              className="mt-0.5 w-full rounded border border-[#333] bg-[#161616] px-2 py-1 text-xs text-zinc-100"
            />
          </label>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative min-w-[260px] max-w-[320px] rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-3 text-sm shadow-lg ${
        targets.length ? "min-h-[200px]" : ""
      } ${selected ? "ring-2 ring-[#8b5cf6]" : ""} ${
        running ? "animate-pulse shadow-[0_0_24px_2px_rgba(139,92,246,0.45)]" : ""
      }`}
    >
      {targets.map((hid, idx) => (
        <Handle
          key={hid}
          id={hid}
          type="target"
          position={Position.Left}
          style={{ top: handleOffset(idx, targets.length) }}
          className="!h-2 !w-2 !border-0 !bg-[#6b7280] !-translate-y-1/2"
        />
      ))}
      <Handle type="source" position={Position.Right} id="out" className="!h-2 !w-2 !border-0 !bg-[#8b5cf6]" />

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate font-medium text-zinc-100">{String(nodeData.label ?? "Node")}</p>
        <button
          type="button"
          onClick={() => void runThisNode()}
          disabled={running}
          className="shrink-0 rounded-md border border-[#2f2f2f] p-1 text-zinc-300 hover:border-[#8b5cf6] disabled:opacity-50"
          title="Run this node"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{kind}</p>
      {renderBody()}
      {err ? <p className="mt-2 text-xs text-rose-400">{err}</p> : null}
      {result ? (
        <p className="mt-2 max-h-24 overflow-auto rounded bg-[#161616] p-2 text-xs text-zinc-200">{result}</p>
      ) : null}
    </div>
  );
}
