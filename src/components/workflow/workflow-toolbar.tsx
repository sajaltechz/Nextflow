"use client";

import type { Edge, Node } from "@xyflow/react";
import { useRef, useState } from "react";
import { Download, Loader2, Play, Save, Upload } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";

export function WorkflowToolbar() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { currentWorkflowId, workflowName, setCurrentWorkflowId, setWorkflowName, setNodesAndEdges } =
    useWorkflowStore();
  const importRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const state = useWorkflowStore.getState();
      if (state.currentWorkflowId) {
        const res = await fetch(`/api/workflows/${state.currentWorkflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.workflowName,
            nodes: state.nodes,
            edges: state.edges,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setMessage("Saved.");
      } else {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.workflowName,
            nodes: state.nodes,
            edges: state.edges,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { workflow: { id: string } };
        setCurrentWorkflowId(data.workflow.id);
        setMessage("Saved as new workflow.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const run = async (scope: "full" | "partial" | "single") => {
    setBusy(true);
    setMessage(null);
    try {
      const state = useWorkflowStore.getState();
      if (scope === "partial" && state.selectedNodeIds.length === 0) {
        setMessage("Select one or more nodes for partial run.");
        return;
      }
      if (scope === "single" && state.selectedNodeIds.length !== 1) {
        setMessage("Select exactly one node for single-node run.");
        return;
      }
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: state.currentWorkflowId ?? undefined,
          workflowName: state.workflowName,
          nodes: state.nodes,
          edges: state.edges,
          scope,
          selectedNodeIds: scope === "full" ? undefined : state.selectedNodeIds,
          singleNodeId: scope === "single" ? state.selectedNodeIds[0] : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { workflowId: string; runId: string };
      setCurrentWorkflowId(data.workflowId);
      setMessage(`Run queued (${data.runId.slice(0, 8)}…). History updates when the orchestrator finishes.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  };

  const exportJson = () => {
    const st = useWorkflowStore.getState();
    const blob = new Blob([JSON.stringify({ name: st.workflowName, nodes: st.nodes, edges: st.edges }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const safe = st.workflowName.replace(/[^\w\-]+/g, "-").slice(0, 80) || "workflow";
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const raw = await file.text();
      const j = JSON.parse(raw) as { name?: unknown; nodes?: unknown; edges?: unknown };
      if (!Array.isArray(j.nodes) || !Array.isArray(j.edges)) {
        setMessage("Invalid JSON: expected { name?, nodes: [], edges: [] }.");
        return;
      }
      setWorkflowName(typeof j.name === "string" && j.name.trim() ? j.name : "Imported workflow");
      setNodesAndEdges(j.nodes as Node[], j.edges as Edge[]);
      setCurrentWorkflowId(null);
      setMessage("Imported into the canvas. Click Save to persist to the database.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-20 flex max-w-[min(640px,calc(100%-2rem))] flex-col gap-2 rounded-xl border border-[#2a2a2a] bg-[#141414]/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-[#2f2f2f] bg-[#1a1a1a] px-2 py-1 text-sm text-zinc-100"
          placeholder="Workflow name"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex items-center gap-1 rounded-lg border border-[#2f2f2f] bg-[#1e1e1e] px-3 py-1.5 text-sm text-zinc-100 hover:border-[#8b5cf6] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("full")}
          className="inline-flex items-center gap-1 rounded-lg border border-[#8b5cf6]/40 bg-[#2a1a3d] px-3 py-1.5 text-sm text-zinc-100 hover:bg-[#331f4d] disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Run full
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("partial")}
          className="rounded-lg border border-[#2f2f2f] bg-[#1e1e1e] px-3 py-1.5 text-sm text-zinc-200 hover:border-[#8b5cf6] disabled:opacity-50"
        >
          Run selected
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("single")}
          className="rounded-lg border border-[#2f2f2f] bg-[#1e1e1e] px-3 py-1.5 text-sm text-zinc-200 hover:border-[#8b5cf6] disabled:opacity-50"
        >
          Run one
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={exportJson}
          className="inline-flex items-center gap-1 rounded-lg border border-[#2f2f2f] bg-[#1e1e1e] px-3 py-1.5 text-sm text-zinc-200 hover:border-[#8b5cf6] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(ev) => void onImportFile(ev)} />
        <button
          type="button"
          disabled={busy}
          onClick={() => importRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-lg border border-[#2f2f2f] bg-[#1e1e1e] px-3 py-1.5 text-sm text-zinc-200 hover:border-[#8b5cf6] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Import JSON
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {currentWorkflowId ? `Workflow id: ${currentWorkflowId}` : "Not saved yet — first save or run creates a workflow record."}
      </p>
      {message ? <p className="text-xs text-amber-200/90">{message}</p> : null}
    </div>
  );
}
