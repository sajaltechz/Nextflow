"use client";

import { useCallback, useEffect } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { HistoryPanel } from "@/components/workflow/workflow-history";
import { Sidebar } from "@/components/workflow/workflow-sidebar";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { WorkflowNode } from "@/components/workflow/workflow-node";
import { createsCycle, isTypeCompatible } from "@/lib/workflow-graph";
import { useWorkflowStore } from "@/store/workflow-store";

const nodeTypes = { workflow: WorkflowNode };

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowContent />
    </ReactFlowProvider>
  );
}

function WorkflowContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    removeSelected,
    undo,
    redo,
    setSelectedNodeIds,
    currentWorkflowId,
  } = useWorkflowStore();

  const addQuickNode = useCallback(
    (kind: string) => {
      const outputType =
        kind === "uploadImage" || kind === "cropImage" || kind === "extractFrame"
          ? "image"
          : kind === "uploadVideo"
            ? "video"
            : "text";
      const node: Node = {
        id: `${kind}-${Date.now()}`,
        type: "workflow",
        position: { x: 240 + Math.random() * 200, y: 160 + Math.random() * 280 },
        data: {
          kind,
          label: `${kind} node`,
          outputType,
          values: {},
        },
      };
      addNode(node);
    },
    [addNode],
  );

  const isValidConnection = useCallback(
    (connection: { source: string | null; target: string | null; targetHandle?: string | null }) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode) return false;
      if (!isTypeCompatible(sourceNode, connection.targetHandle)) return false;
      if (createsCycle(connection, nodes, edges)) return false;
      return true;
    },
    [edges, nodes],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") undo();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") redo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, removeSelected, undo]);

  return (
    <div className="nextflow-grid flex h-screen w-full min-h-0 overflow-hidden">
      <Sidebar onAdd={addQuickNode} />
      {/* React Flow must live in a box with explicit height; toolbar is absolute so it does not stretch this column. */}
      <div className="relative h-full min-h-0 min-w-0 flex-1">
        <WorkflowToolbar />
        <div className="h-full w-full min-h-[200px]">
          <ReactFlow
            className="h-full w-full"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onSelectionChange={({ nodes: selected }) => setSelectedNodeIds(selected.map((n) => n.id))}
            fitView
          >
          <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={20} size={1} />
          <Controls />
          <MiniMap pannable zoomable className="!bg-[#121212] !border-[#2a2a2a]" />
          </ReactFlow>
        </div>
      </div>
      <HistoryPanel workflowId={currentWorkflowId} />
    </div>
  );
}
