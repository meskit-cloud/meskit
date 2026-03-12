import { createClient } from "@/lib/supabase/server";

export interface OrgContext {
  userId: string;
  orgId: string;
  plantId: string;
  role: "owner" | "admin" | "operator" | "viewer";
  orgName: string;
}

/**
 * Resolves the current user's organization context.
 * Every authenticated request flows through this to get org_id and role.
 * Falls back to a user-scoped context when multi-tenancy tables are not yet migrated.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get org membership (a user belongs to one org in MVP; future: multi-org)
  const { data: membership, error: memError } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  // If org_members table doesn't exist yet (migration not applied), fall back to user-scoped context
  if (memError && isTableMissing(memError)) {
    return {
      userId: user.id,
      orgId: user.id,
      plantId: "",
      role: "owner",
      orgName: "My Organization",
    };
  }

  if (memError || !membership) {
    // No org exists — create one (first-time user or legacy user)
    const { data: newOrg, error: orgError } = await supabase.rpc(
      "create_org_for_user",
      { p_user_id: user.id },
    );

    if (orgError || !newOrg || newOrg.length === 0) {
      // RPC missing (migration not applied) — fall back to user-scoped context
      if (orgError && isTableMissing(orgError)) {
        return {
          userId: user.id,
          orgId: user.id,
          plantId: "",
          role: "owner",
          orgName: "My Organization",
        };
      }
      throw new Error(`Failed to create organization: ${orgError?.message ?? "unknown error"}`);
    }

    return {
      userId: user.id,
      orgId: newOrg[0].org_id,
      plantId: newOrg[0].plant_id,
      role: "owner",
      orgName: "My Organization",
    };
  }

  // Get the default plant for this org
  const { data: plant } = await supabase
    .from("plants")
    .select("id")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const orgs = membership.organizations as unknown;
  const orgName =
    (Array.isArray(orgs) ? (orgs[0] as { name: string })?.name : (orgs as { name: string } | null)?.name) ??
    "My Organization";

  return {
    userId: user.id,
    orgId: membership.org_id,
    plantId: plant?.id ?? "",
    role: membership.role as OrgContext["role"],
    orgName,
  };
}

/** Check if a Supabase error indicates a missing table/function (migration not applied) */
function isTableMissing(error: { message?: string; code?: string }): boolean {
  const msg = error.message ?? "";
  return (
    msg.includes("Could not find") ||
    msg.includes("relation") && msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    error.code === "42P01" || // undefined_table
    error.code === "42883"    // undefined_function
  );
}

/**
 * Check if user has at least the specified role level.
 * owner > admin > operator > viewer
 */
export function hasRole(
  current: OrgContext["role"],
  required: OrgContext["role"],
): boolean {
  const levels: Record<OrgContext["role"], number> = {
    viewer: 0,
    operator: 1,
    admin: 2,
    owner: 3,
  };
  return levels[current] >= levels[required];
}
