"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import { getOrganization, updateOrganization } from "./actions";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  tier: "starter" | "pro" | "enterprise";
  created_at: string;
}

const tierColors: Record<string, string> = {
  starter: "bg-bg-app text-text-secondary",
  pro: "bg-accent/10 text-accent",
  enterprise: "bg-agent/10 text-agent",
};

export default function OrgSettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const canEdit = (role === "owner" || role === "admin") && !migrationPending;

  const fetchOrg = useCallback(async () => {
    try {
      const { org: data, role: userRole, migrationPending: pending } = await getOrganization();
      if (data) {
        setOrg(data as OrgData);
        setName(data.name);
        setSlug(data.slug);
      }
      setRole(userRole);
      setMigrationPending(pending);
    } catch {
      setMessage({ text: "Failed to load organization", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  async function handleSave() {
    if (!canEdit || !org) return;
    setSaving(true);
    setMessage(null);

    try {
      const updates: Record<string, string> = {};
      if (name.trim() !== org.name) updates.name = name.trim();
      if (slug.trim() !== org.slug) updates.slug = slug.trim();

      if (Object.keys(updates).length === 0) {
        setMessage({ text: "No changes to save", type: "success" });
        setSaving(false);
        return;
      }

      await updateOrganization(updates);
      setMessage({ text: "Organization updated", type: "success" });
      await fetchOrg();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update",
        type: "error",
      });
    } finally {
      setSaving(false);
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
        <Building2 size={20} className="text-text-primary" />
        <h1 className="text-xl font-semibold text-text-primary">
          Organization
        </h1>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Manage your organization&apos;s name, slug, and view your current plan.
      </p>

      {migrationPending && (
        <div className="text-sm px-4 py-2.5 rounded-lg mb-6 bg-warning/10 text-warning">
          Multi-tenancy migration not yet applied. Organization settings are read-only until the database is migrated.
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

      <div className="border border-border rounded-lg bg-bg-surface divide-y divide-border">
        {/* Name */}
        <div className="px-4 py-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Organization name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="My Organization"
          />
        </div>

        {/* Slug */}
        <div className="px-4 py-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            URL slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-"),
              )
            }
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="my-org"
          />
          <p className="text-xs text-text-secondary mt-1">
            Used in URLs. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        {/* Tier */}
        <div className="px-4 py-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Plan
          </label>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${tierColors[org?.tier ?? "starter"]}`}
          >
            {org?.tier ?? "starter"}
          </span>
        </div>

        {/* Created date */}
        <div className="px-4 py-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Created
          </label>
          <p className="text-sm text-text-secondary">
            {org?.created_at
              ? new Date(org.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "--"}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save changes
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-text-secondary mt-4">
          Only owners and admins can edit organization settings.
        </p>
      )}
    </div>
  );
}
