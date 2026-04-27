"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type NodeRun = {
  id: string;
  nodeLabel: string;
  status: string;
  durationMs: number;
  inputJson: unknown;
  outputJson: unknown;
  error: string | null;
};

type RunRow = {
  id: string;
  scope: string;
  status: string;
  durationMs: number;
  createdAt: string;
  nodeRuns: NodeRun[];
};

const statusDot: Record<string, string> = {
  success: "bg-emerald-500",
  failed: "bg-rose-500",
  partial: "bg-amber-500",
  running: "bg-sky-500",
  queued: "bg-zinc-500",
};

export function HistoryPanel({ workflowId }: { workflowId: string | null }) {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workflowId) {
      setRuns([]);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/workflows/history/${workflowId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { runs: RunRow[] };
      setRuns(data.runs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    }
  }, [workflowId]);

  useEffect(() => {
    void load();
    if (!workflowId) return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load, workflowId]);

  if (!workflowId) {
    return (
      <aside className="h-full min-h-0 w-72 shrink-0 border-l border-[#242424] bg-[#121212] p-3">
        <p className="mb-2 text-sm font-semibold text-zinc-200">Workflow History</p>
        <p className="text-xs text-zinc-500">Save or run once to attach a workflow id, then history appears here.</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col border-l border-[#242424] bg-[#121212] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Workflow History</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-[#8b5cf6] hover:underline"
        >
          Refresh
        </button>
      </div>
      {error ? <p className="mb-2 text-xs text-rose-400">{error}</p> : null}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {runs.length === 0 ? (
          <p className="text-xs text-zinc-500">No runs yet.</p>
        ) : (
          runs.map((run) => {
            const open = expanded === run.id;
            return (
              <div key={run.id} className="rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] text-xs text-zinc-300">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : run.id)}
                  className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-[#222]"
                >
                  <span className="flex items-center gap-1">
                    {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{new Date(run.createdAt).toLocaleString()}</span>
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[run.status] ?? "bg-zinc-500"}`} />
                </button>
                <div className="border-t border-[#2a2a2a] px-2 pb-2 pt-1 text-[11px] text-zinc-400">
                  <p>scope: {run.scope}</p>
                  <p>status: {run.status}</p>
                  <p>duration: {run.durationMs}ms</p>
                </div>
                {open ? (
                  <div className="border-t border-[#2a2a2a] p-2">
                    {run.nodeRuns?.length ? (
                      <ul className="space-y-2">
                        {run.nodeRuns.map((nr) => (
                          <li key={nr.id} className="rounded border border-[#2f2f2f] bg-[#161616] p-2">
                            <p className="font-medium text-zinc-200">{nr.nodeLabel}</p>
                            <p className="text-zinc-500">{nr.status} · {nr.durationMs}ms</p>
                            {nr.error ? <p className="mt-1 text-rose-400">{nr.error}</p> : null}
                            {nr.inputJson != null ? (
                              <pre className="mt-1 max-h-24 overflow-auto text-[10px] text-zinc-500">
                                {JSON.stringify(nr.inputJson, null, 2)}
                              </pre>
                            ) : null}
                            {nr.outputJson != null ? (
                              <pre className="mt-1 max-h-24 overflow-auto text-[10px] text-zinc-500">
                                {JSON.stringify(nr.outputJson, null, 2)}
                              </pre>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-zinc-500">No node details yet.</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
