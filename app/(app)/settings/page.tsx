"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Plus, Trash2, Check } from "lucide-react";

interface ApiKeyRow {
  id: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  const fetchKeys = useCallback(async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, is_active, last_used_at, created_at")
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create API key");

      const { rawKey } = await res.json();
      setRevealedKey(rawKey);
      setNewKeyName("");
      await fetchKeys();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this API key? This cannot be undone.")) return;

    await fetch("/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchKeys();
  }

  function handleCopy() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-xl font-semibold text-text-primary mb-1">API Keys</h1>
      <p className="text-sm text-text-secondary mb-6">
        Manage API keys for programmatic access to MESkit. Use these with the
        REST API at <code className="font-mono text-xs bg-bg-app px-1 py-0.5 rounded">/api/tools/&#123;toolName&#125;</code>.
      </p>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-text-primary mb-2">
            Your new API key — copy it now, it won&apos;t be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-bg-primary border border-border rounded px-3 py-2 break-all">
              {revealedKey}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-text-secondary mt-2 hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Key name (e.g., CI Pipeline)"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newKeyName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      {/* Key list */}
      {loading ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-text-secondary">No API keys yet. Create one above.</p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{key.name}</p>
                <p className="text-xs text-text-secondary">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && (
                    <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete key"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
