"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const quickAccess = [
  { key: "text", label: "Text Node" },
  { key: "uploadImage", label: "Upload Image Node" },
  { key: "uploadVideo", label: "Upload Video Node" },
  { key: "llm", label: "LLM Node" },
  { key: "cropImage", label: "Crop Image Node" },
  { key: "extractFrame", label: "Extract Frame from Video Node" },
];

export function Sidebar({ onAdd }: { onAdd: (kind: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-full min-h-0 shrink-0 border-r border-[#242424] bg-[#121212] p-3 transition-all ${collapsed ? "w-14" : "w-72"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        {!collapsed ? <p className="text-sm font-semibold text-zinc-200">Quick Access</p> : null}
        <button type="button" onClick={() => setCollapsed((s) => !s)} className="rounded border border-[#2d2d2d] p-1">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      {!collapsed ? (
        <div className="space-y-2">
          {quickAccess.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onAdd(item.key)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] px-3 py-2 text-left text-sm text-zinc-200 hover:border-[#8b5cf6]"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
