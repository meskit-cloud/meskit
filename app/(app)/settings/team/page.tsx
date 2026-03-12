"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  listMembers,
  updateMemberRole,
  removeMember,
  addMemberByUserId,
} from "./actions";

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
}

const roles = ["admin", "operator", "viewer"] as const;

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
};

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof roles)[number]>("operator");
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const canManage = (currentRole === "owner" || currentRole === "admin") && !migrationPending;

  const fetchMembers = useCallback(async () => {
    try {
      const result = await listMembers();
      setMembers(result.members);
      setCurrentRole(result.currentRole);
      setCurrentUserId(result.currentUserId);
      setMigrationPending(result.migrationPending);
    } catch {
      setMessage({ text: "Failed to load team members", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite() {
    if (!inviteUserId.trim()) return;
    setInviting(true);
    setMessage(null);

    try {
      await addMemberByUserId(inviteUserId.trim(), inviteRole);
      setMessage({ text: "Member added", type: "success" });
      setInviteUserId("");
      await fetchMembers();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to add member",
        type: "error",
      });
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    setMessage(null);

    try {
      await updateMemberRole(userId, newRole as (typeof roles)[number]);
      setMessage({ text: "Role updated", type: "success" });
      await fetchMembers();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update role",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    setRemovingId(userId);
    setMessage(null);

    try {
      await removeMember(userId);
      setMessage({ text: "Member removed", type: "success" });
      await fetchMembers();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to remove member",
        type: "error",
      });
    } finally {
      setRemovingId(null);
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
        <Users size={20} className="text-text-primary" />
        <h1 className="text-xl font-semibold text-text-primary">Team</h1>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Manage who has access to your organization and their roles.
      </p>

      {migrationPending && (
        <div className="text-sm px-4 py-2.5 rounded-lg mb-6 bg-warning/10 text-warning">
          Multi-tenancy migration not yet applied. Team management is read-only until the database is migrated.
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

      {/* Invite member */}
      {canManage && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-primary mb-2">
            Add member
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="User ID"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono"
            />
            <div className="relative">
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as (typeof roles)[number])
                }
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteUserId.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {inviting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Add
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1.5">
            The user must already have a MESkit account. Enter their user ID.
          </p>
        </div>
      )}

      {/* Members list */}
      <h2 className="text-sm font-medium text-text-primary mb-2">
        Members ({members.length})
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-text-secondary">No members found.</p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {members.map((member) => {
            const isOwner = member.role === "owner";
            const isSelf = member.user_id === currentUserId;
            const canEditMember = canManage && !isOwner && !isSelf;

            return (
              <div
                key={member.user_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary font-mono truncate">
                    {member.user_id}
                    {isSelf && (
                      <span className="text-xs text-text-secondary font-sans ml-2">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Joined{" "}
                    {new Date(member.joined_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {isOwner ? (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-agent/10 text-agent">
                      Owner
                    </span>
                  ) : canEditMember ? (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.user_id, e.target.value)
                        }
                        disabled={updatingId === member.user_id}
                        className="appearance-none pl-2.5 pr-7 py-1 text-xs rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                      />
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-bg-app text-text-secondary">
                      {roleLabels[member.role] ?? member.role}
                    </span>
                  )}

                  {canEditMember && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      disabled={removingId === member.user_id}
                      className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      {removingId === member.user_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
