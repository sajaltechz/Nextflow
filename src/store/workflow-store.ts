"use client";

import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type Node, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";
import { create } from "zustand";
import { sampleEdges, sampleNodes } from "@/lib/sample-workflow";
import { createsCycle, isTypeCompatible } from "@/lib/workflow-graph";

type Snapshot = { nodes: Node[]; edges: Edge[] };

type WorkflowState = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  currentWorkflowId: string | null;
  workflowName: string;
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  error: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  removeSelected: () => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setCurrentWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setNodesAndEdges: (nodes: Node[], edges: Edge[]) => void;
  /** Shallow-merge top-level `data` fields; deep-merge `data.values` when provided. */
  patchNode: (nodeId: string, patch: Record<string, unknown> & { values?: Record<string, unknown> }) => void;
  undo: () => void;
  redo: () => void;
  clearError: () => void;
};

const snapshot = (nodes: Node[], edges: Edge[]): Snapshot => ({
  nodes: structuredClone(nodes),
  edges: structuredClone(edges),
});

function sameSelectedIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: sampleNodes,
  edges: sampleEdges,
  selectedNodeIds: [],
  currentWorkflowId: null,
  workflowName: "Product Marketing Kit Generator",
  undoStack: [],
  redoStack: [],
  error: null,
  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),
  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),
  onConnect: (connection) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === connection.source);
    if (!sourceNode) return;
    if (!isTypeCompatible(sourceNode, connection.targetHandle)) {
      set({ error: "Connection type is not compatible." });
      return;
    }
    if (createsCycle(connection, nodes, edges)) {
      set({ error: "Cycles are not allowed in workflow DAGs." });
      return;
    }
    set((state) => ({
      undoStack: [...state.undoStack, snapshot(state.nodes, state.edges)],
      redoStack: [],
      edges: addEdge(
        {
          ...connection,
          sourceHandle: connection.sourceHandle ?? "out",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#8b5cf6", strokeDasharray: "8 6", strokeWidth: 2 },
        },
        state.edges,
      ),
    }));
  },
  addNode: (node) =>
    set((state) => ({
      undoStack: [...state.undoStack, snapshot(state.nodes, state.edges)],
      redoStack: [],
      nodes: [...state.nodes, node],
    })),
  removeSelected: () =>
    set((state) => ({
      undoStack: [...state.undoStack, snapshot(state.nodes, state.edges)],
      redoStack: [],
      nodes: state.nodes.filter((n) => !state.selectedNodeIds.includes(n.id)),
      edges: state.edges.filter(
        (e) => !state.selectedNodeIds.includes(e.source) && !state.selectedNodeIds.includes(e.target),
      ),
      selectedNodeIds: [],
    })),
  setSelectedNodeIds: (ids) => {
    if (sameSelectedIds(get().selectedNodeIds, ids)) return;
    set({ selectedNodeIds: ids });
  },
  setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setNodesAndEdges: (nodes, edges) =>
    set((state) => ({
      undoStack: [...state.undoStack, snapshot(state.nodes, state.edges)],
      redoStack: [],
      nodes,
      edges,
    })),
  patchNode: (nodeId, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const prev = { ...(n.data as Record<string, unknown>) };
        const { values: vIn, ...rest } = patch;
        const next = { ...prev, ...rest };
        if (vIn && typeof vIn === "object") {
          const prevVals =
            prev.values && typeof prev.values === "object" ? (prev.values as Record<string, unknown>) : {};
          next.values = { ...prevVals, ...vIn };
        }
        return { ...n, data: next };
      }),
    })),
  undo: () =>
    set((state) => {
      const prev = state.undoStack[state.undoStack.length - 1];
      if (!prev) return state;
      return {
        nodes: prev.nodes,
        edges: prev.edges,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, snapshot(state.nodes, state.edges)],
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.redoStack[state.redoStack.length - 1];
      if (!next) return state;
      return {
        nodes: next.nodes,
        edges: next.edges,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, snapshot(state.nodes, state.edges)],
      };
    }),
  clearError: () => set({ error: null }),
}));
