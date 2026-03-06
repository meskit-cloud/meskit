"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Hammer,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Factory,
  Cpu,
  Circle,
  User,
} from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  fetchLines,
  addLine,
  editLine,
  removeLine,
  fetchWorkstations,
  addWorkstation,
  editWorkstation,
  reorderWorkstations,
  removeWorkstation,
  fetchMachines,
  addMachine,
  editMachine,
  removeMachine,
  changeMachineStatus,
} from "./actions";

// --- Types ---

interface Line {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Workstation {
  id: string;
  line_id: string;
  name: string;
  position: number;
  operator_name: string | null;
  created_at: string;
}

interface Machine {
  id: string;
  workstation_id: string | null;
  name: string;
  type: string;
  status: "idle" | "running" | "down";
  created_at: string;
}

// --- Main Component ---

export function BuildPanels() {
  const { selectedLineId, selectedWorkstationId, selectLine, selectWorkstation } =
    useUiStore();

  const [lines, setLines] = useState<Line[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Set active mode
  useEffect(() => {
    useUiStore.getState().setActiveMode("build");
  }, []);

  // Fetch lines
  const loadLines = useCallback(async () => {
    const data = await fetchLines();
    setLines(data as Line[]);
  }, []);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  // Fetch workstations when line changes
  const loadWorkstations = useCallback(async () => {
    if (!selectedLineId) {
      setWorkstations([]);
      return;
    }
    const data = await fetchWorkstations(selectedLineId);
    setWorkstations(data as Workstation[]);
  }, [selectedLineId]);

  useEffect(() => {
    loadWorkstations();
  }, [loadWorkstations]);

  // Fetch machines when workstation changes
  const loadMachines = useCallback(async () => {
    if (!selectedWorkstationId) {
      setMachines([]);
      return;
    }
    const data = await fetchMachines(selectedWorkstationId);
    setMachines(data as Machine[]);
  }, [selectedWorkstationId]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  // Debounced loaders for Realtime (avoids intermediate state during swaps)
  const wsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedLoadWorkstations = useCallback(() => {
    clearTimeout(wsTimerRef.current);
    wsTimerRef.current = setTimeout(() => loadWorkstations(), 300);
  }, [loadWorkstations]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("build-mode")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lines" },
        () => loadLines(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workstations" },
        () => {
          if (selectedLineId) debouncedLoadWorkstations();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "machines" },
        () => {
          if (selectedWorkstationId) loadMachines();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(wsTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedLineId, selectedWorkstationId, loadLines, debouncedLoadWorkstations, loadMachines]);

  // Clear workstation selection when line changes
  useEffect(() => {
    selectWorkstation(null);
  }, [selectedLineId, selectWorkstation]);

  const selectedLine = lines.find((l) => l.id === selectedLineId) ?? null;
  const selectedWorkstation =
    workstations.find((w) => w.id === selectedWorkstationId) ?? null;

  return (
    <div className="flex h-full gap-px bg-border">
      <LinesPanel
        lines={lines}
        selectedId={selectedLineId}
        onSelect={(line) => selectLine(line.id, line.name)}
        onReload={loadLines}
      />
      <WorkstationsPanel
        line={selectedLine}
        workstations={workstations}
        selectedId={selectedWorkstationId}
        onSelect={(ws) => selectWorkstation(ws.id, ws.name)}
        onReload={loadWorkstations}
      />
      <MachinesPanel
        workstation={selectedWorkstation}
        machines={machines}
        onReload={loadMachines}
      />
    </div>
  );
}

// --- Lines Panel ---

function LinesPanel({
  lines,
  selectedId,
  onSelect,
  onReload,
}: {
  lines: Line[];
  selectedId: string | null;
  onSelect: (line: Line) => void;
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addLine(newName.trim());
      setNewName("");
      setShowAdd(false);
      onReload();
    });
  }

  function handleEdit(line: Line) {
    if (!editName.trim() || editName.trim() === line.name) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await editLine(line.id, editName.trim());
      setEditingId(null);
      onReload();
    });
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      await removeLine(id);
      setDeletingId(null);
      if (selectedId === id) {
        useUiStore.getState().selectLine(null);
      }
      onReload();
    });
  }

  return (
    <div className="w-64 bg-bg-surface flex flex-col shrink-0">
      <PanelHeader
        title="Lines"
        onAdd={() => {
          setShowAdd(true);
          setNewName("");
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {showAdd && (
          <div className="px-3 py-2 border-b border-border">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Line name..."
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={handleAdd}
                disabled={pending || !newName.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <Check size={12} /> Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {lines.length === 0 && !showAdd && (
          <EmptyState
            icon={<Factory size={28} />}
            message="No lines yet"
            hint='Click "+" to create your first manufacturing line'
          />
        )}

        {lines.map((line) => (
          <div
            key={line.id}
            onClick={() => onSelect(line)}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border transition-colors ${
              selectedId === line.id
                ? "bg-accent/10 border-l-2 border-l-accent"
                : "hover:bg-bg-app border-l-2 border-l-transparent"
            }`}
          >
            {editingId === line.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit(line);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleEdit(line)}
                className="flex-1 px-1.5 py-0.5 text-sm rounded border border-accent bg-bg-app text-text-primary focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                disabled={pending}
              />
            ) : (
              <>
                <Factory size={16} className="text-text-secondary shrink-0" />
                <span className="flex-1 text-sm text-text-primary truncate">
                  {line.name}
                </span>
                {deletingId === line.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-error">Delete?</span>
                    <button
                      onClick={() => confirmDelete(line.id)}
                      disabled={pending}
                      className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="p-1 rounded text-text-secondary hover:bg-bg-app"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(line.id);
                        setEditName(line.name);
                      }}
                      className="p-1 rounded hover:bg-bg-surface text-text-secondary"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(line.id);
                      }}
                      className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                {selectedId === line.id && deletingId !== line.id && (
                  <ChevronRight size={14} className="text-accent shrink-0" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Workstations Panel ---

function WorkstationsPanel({
  line,
  workstations,
  selectedId,
  onSelect,
  onReload,
}: {
  line: Line | null;
  workstations: Workstation[];
  selectedId: string | null;
  onSelect: (ws: Workstation) => void;
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim() || !line) return;
    const nextPosition = workstations.length + 1;
    startTransition(async () => {
      await addWorkstation(line.id, newName.trim(), nextPosition);
      setNewName("");
      setShowAdd(false);
      onReload();
    });
  }

  function handleEdit(ws: Workstation) {
    if (!editName.trim() || editName.trim() === ws.name) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await editWorkstation(ws.id, { name: editName.trim() });
      setEditingId(null);
      onReload();
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workstations.length) return;
    const reordered = [...workstations];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      await reorderWorkstations(reordered.map((ws) => ws.id));
      onReload();
    });
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      await removeWorkstation(id);
      setDeletingId(null);
      if (selectedId === id) {
        useUiStore.getState().selectWorkstation(null);
      }
      onReload();
    });
  }

  if (!line) {
    return (
      <div className="flex-1 bg-bg-surface flex flex-col">
        <PanelHeader title="Workstations" />
        <EmptyState
          icon={<Hammer size={28} />}
          message="Select a line"
          hint="Choose a manufacturing line from the left panel"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-surface flex flex-col min-w-0">
      <PanelHeader
        title={`Workstations — ${line.name}`}
        onAdd={() => {
          setShowAdd(true);
          setNewName("");
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {showAdd && (
          <div className="px-3 py-2 border-b border-border">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Workstation name..."
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={handleAdd}
                disabled={pending || !newName.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <Check size={12} /> Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {workstations.length === 0 && !showAdd && (
          <EmptyState
            icon={<Hammer size={28} />}
            message="No workstations"
            hint='Click "+" to add a workstation to this line'
          />
        )}

        {workstations.map((ws, index) => (
          <div
            key={ws.id}
            onClick={() => onSelect(ws)}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border transition-colors ${
              selectedId === ws.id
                ? "bg-accent/10 border-l-2 border-l-accent"
                : "hover:bg-bg-app border-l-2 border-l-transparent"
            }`}
          >
            <div className="flex flex-col items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleMove(index, "up")}
                disabled={pending || index === 0}
                className="p-0.5 rounded text-text-secondary/40 hover:text-accent hover:bg-accent/10 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                title="Move up"
              >
                <ChevronUp size={12} />
              </button>
              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs font-mono text-accent">
                {index + 1}
              </span>
              <button
                onClick={() => handleMove(index, "down")}
                disabled={pending || index >= workstations.length - 1}
                className="p-0.5 rounded text-text-secondary/40 hover:text-accent hover:bg-accent/10 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                title="Move down"
              >
                <ChevronDown size={12} />
              </button>
            </div>

            {editingId === ws.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit(ws);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleEdit(ws)}
                className="flex-1 px-1.5 py-0.5 text-sm rounded border border-accent bg-bg-app text-text-primary focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                disabled={pending}
              />
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">
                    {ws.name}
                  </div>
                  {ws.operator_name && (
                    <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                      <User size={10} />
                      <span className="truncate">{ws.operator_name}</span>
                    </div>
                  )}
                </div>
                {deletingId === ws.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-error">Delete?</span>
                    <button
                      onClick={() => confirmDelete(ws.id)}
                      disabled={pending}
                      className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="p-1 rounded text-text-secondary hover:bg-bg-app"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(ws.id);
                        setEditName(ws.name);
                      }}
                      className="p-1 rounded hover:bg-bg-surface text-text-secondary"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(ws.id);
                      }}
                      className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                {selectedId === ws.id && deletingId !== ws.id && (
                  <ChevronRight size={14} className="text-accent shrink-0" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Machines Panel ---

const statusConfig = {
  idle: { color: "text-text-secondary", bg: "bg-text-secondary/10", label: "Idle" },
  running: { color: "text-success", bg: "bg-success/10", label: "Running" },
  down: { color: "text-error", bg: "bg-error/10", label: "Down" },
} as const;

function MachinesPanel({
  workstation,
  machines,
  onReload,
}: {
  workstation: Workstation | null;
  machines: Machine[];
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim() || !newType.trim() || !workstation) return;
    startTransition(async () => {
      await addMachine(workstation.id, newName.trim(), newType.trim());
      setNewName("");
      setNewType("");
      setShowAdd(false);
      onReload();
    });
  }

  function handleEdit(machine: Machine) {
    const nameChanged = editName.trim() && editName.trim() !== machine.name;
    const typeChanged = editType.trim() && editType.trim() !== machine.type;
    if (!nameChanged && !typeChanged) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await editMachine(machine.id, {
        ...(nameChanged ? { name: editName.trim() } : {}),
        ...(typeChanged ? { type: editType.trim() } : {}),
      });
      setEditingId(null);
      onReload();
    });
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      await removeMachine(id);
      setDeletingId(null);
      onReload();
    });
  }

  function handleStatusChange(machine: Machine, status: Machine["status"]) {
    startTransition(async () => {
      await changeMachineStatus(machine.id, status);
      onReload();
    });
  }

  if (!workstation) {
    return (
      <div className="w-72 bg-bg-surface flex flex-col shrink-0">
        <PanelHeader title="Machines" />
        <EmptyState
          icon={<Cpu size={28} />}
          message="Select a workstation"
          hint="Choose a workstation to view its machines"
        />
      </div>
    );
  }

  return (
    <div className="w-72 bg-bg-surface flex flex-col shrink-0">
      <PanelHeader
        title={`Machines — ${workstation.name}`}
        onAdd={() => {
          setShowAdd(true);
          setNewName("");
          setNewType("");
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {showAdd && (
          <div className="px-3 py-2 border-b border-border space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Machine name..."
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Type (e.g. CNC Mill, Robot Arm)..."
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <div className="flex gap-1">
              <button
                onClick={handleAdd}
                disabled={pending || !newName.trim() || !newType.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <Check size={12} /> Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {machines.length === 0 && !showAdd && (
          <EmptyState
            icon={<Cpu size={28} />}
            message="No machines"
            hint='Click "+" to register a machine'
          />
        )}

        {machines.map((machine) => {
          const st = statusConfig[machine.status];
          return (
            <div
              key={machine.id}
              className="group px-3 py-2.5 border-b border-border"
            >
              {editingId === machine.id ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(machine);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    placeholder="Machine name..."
                    className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
                    disabled={pending}
                  />
                  <input
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(machine);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    placeholder="Type..."
                    className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
                    disabled={pending}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(machine)}
                      disabled={pending}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-text-secondary shrink-0" />
                    <span className="text-sm text-text-primary flex-1 truncate">
                      {machine.name}
                    </span>
                    {deletingId === machine.id ? (
                      <div className="flex items-center gap-1 mr-1">
                        <span className="text-xs text-error">Delete?</span>
                        <button
                          onClick={() => confirmDelete(machine.id)}
                          disabled={pending}
                          className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-1 rounded text-text-secondary hover:bg-bg-app"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="hidden group-hover:flex items-center gap-0.5 mr-1">
                        <button
                          onClick={() => {
                            setEditingId(machine.id);
                            setEditName(machine.name);
                            setEditType(machine.type);
                          }}
                          className="p-1 rounded hover:bg-bg-surface text-text-secondary"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingId(machine.id)}
                          className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}
                    >
                      <Circle size={6} className="fill-current" />
                      {st.label}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1 ml-5">
                    {machine.type}
                  </div>
                  <div className="flex gap-1 mt-2 ml-5">
                    {(["idle", "running", "down"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(machine, s)}
                        disabled={pending || machine.status === s}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          machine.status === s
                            ? `${statusConfig[s].bg} ${statusConfig[s].color} font-medium`
                            : "text-text-secondary hover:bg-bg-app disabled:opacity-30"
                        }`}
                      >
                        {statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Shared Components ---

function PanelHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd?: () => void;
}) {
  return (
    <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
      <h2 className="text-sm font-semibold text-text-primary truncate">
        {title}
      </h2>
      {onAdd && (
        <button
          onClick={onAdd}
          className="w-6 h-6 rounded flex items-center justify-center text-accent hover:bg-accent/10 transition-colors"
          title="Add new"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: React.ReactNode;
  message: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <div className="text-text-secondary/40 mb-3">{icon}</div>
      <p className="text-sm font-medium text-text-secondary">{message}</p>
      <p className="text-xs text-text-secondary/60 mt-1">{hint}</p>
    </div>
  );
}
