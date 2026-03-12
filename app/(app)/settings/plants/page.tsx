"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Factory,
  Plus,
  Pencil,
  Archive,
  Save,
  X,
  Loader2,
} from "lucide-react";
import {
  listPlants,
  createPlant,
  updatePlant,
  archivePlant,
} from "./actions";

interface Plant {
  id: string;
  name: string;
  location: string | null;
  timezone: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function PlantsSettingsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newTimezone, setNewTimezone] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canManage = (role === "owner" || role === "admin") && !migrationPending;

  const fetchPlants = useCallback(async () => {
    try {
      const result = await listPlants();
      // Filter out archived plants
      setPlants(
        result.plants.filter(
          (p: Plant) => !(p.metadata as Record<string, unknown>)?.archived,
        ),
      );
      setRole(result.role);
      setMigrationPending(result.migrationPending);
    } catch {
      setMessage({ text: "Failed to load plants", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setMessage(null);

    try {
      await createPlant({
        name: newName.trim(),
        location: newLocation.trim() || undefined,
        timezone: newTimezone.trim() || undefined,
      });
      setMessage({ text: "Plant created", type: "success" });
      setNewName("");
      setNewLocation("");
      setNewTimezone("");
      await fetchPlants();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create plant",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  function startEdit(plant: Plant) {
    setEditingId(plant.id);
    setEditName(plant.name);
    setEditLocation(plant.location ?? "");
    setEditTimezone(plant.timezone ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditLocation("");
    setEditTimezone("");
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    setMessage(null);

    try {
      await updatePlant(editingId, {
        name: editName.trim(),
        location: editLocation.trim() || undefined,
        timezone: editTimezone.trim() || undefined,
      });
      setMessage({ text: "Plant updated", type: "success" });
      cancelEdit();
      await fetchPlants();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update plant",
        type: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this plant? It will be hidden from the list."))
      return;
    setArchivingId(id);
    setMessage(null);

    try {
      await archivePlant(id);
      setMessage({ text: "Plant archived", type: "success" });
      await fetchPlants();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to archive plant",
        type: "error",
      });
    } finally {
      setArchivingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <p className="text-sm text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-2.5 mb-1">
        <Factory size={20} className="text-text-primary" />
        <h1 className="text-xl font-semibold text-text-primary">Plants</h1>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Manage manufacturing plants in your organization. Each plant can have
        its own lines and workstations.
      </p>

      {migrationPending && (
        <div className="text-sm px-4 py-2.5 rounded-lg mb-6 bg-warning/10 text-warning">
          Multi-tenancy migration not yet applied. Plant management is read-only until the database is migrated.
        </div>
      )}

      {message && (
        <div
          className={`text-sm px-4 py-2.5 rounded-lg mb-6 ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add plant */}
      {canManage && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-primary mb-2">
            Add plant
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Plant name (required)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Create
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Location (optional)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                type="text"
                value={newTimezone}
                onChange={(e) => setNewTimezone(e.target.value)}
                placeholder="Timezone (optional, e.g., UTC)"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Plants list */}
      <h2 className="text-sm font-medium text-text-primary mb-2">
        Plants ({plants.length})
      </h2>
      {plants.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No plants yet. Create one above.
        </p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {plants.map((plant) => (
            <div key={plant.id}>
              {editingId === plant.id ? (
                /* Edit mode */
                <div className="px-4 py-3 bg-bg-app/50">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Plant name"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <input
                        type="text"
                        value={editTimezone}
                        onChange={(e) => setEditTimezone(e.target.value)}
                        placeholder="Timezone"
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-app transition-colors"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingEdit || !editName.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                      >
                        {savingEdit ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {plant.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {[
                        plant.location,
                        plant.timezone && plant.timezone !== "UTC"
                          ? plant.timezone
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No location set"}
                      {" · "}Created{" "}
                      {new Date(plant.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <button
                        onClick={() => startEdit(plant)}
                        className="p-2 rounded-lg text-text-secondary hover:bg-bg-app hover:text-text-primary transition-colors"
                        title="Edit plant"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(plant.id)}
                        disabled={archivingId === plant.id}
                        className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Archive plant"
                      >
                        {archivingId === plant.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Archive size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
