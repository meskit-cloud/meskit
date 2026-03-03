import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <AppShellClient userEmail={user.email ?? ""}>{children}</AppShellClient>
  );
}
