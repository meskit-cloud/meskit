import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { AppShellClient } from "./app-shell-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolve org context — role & org name for the shell
  let role: "owner" | "admin" | "operator" | "viewer" = "owner";
  let orgName: string | undefined;

  try {
    const orgCtx = await getOrgContext();
    role = orgCtx.role;
    orgName = orgCtx.orgName;
  } catch {
    // New user without org or org creation failed — continue with defaults
  }

  return (
    <AppShellClient
      userEmail={user.email ?? ""}
      userCreatedAt={user.created_at}
      role={role}
      orgName={orgName}
    >
      {children}
    </AppShellClient>
  );
}
