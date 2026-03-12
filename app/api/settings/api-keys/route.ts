import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";

function generateApiKey(): string {
  return `mk_${crypto.randomBytes(32).toString("hex")}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { name } = await request.json();
    if (!name || typeof name !== "string")
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const ctx = await getOrgContext();

    const rawKey = generateApiKey();
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      org_id: ctx.orgId,
      name: name.trim(),
      key_hash: keyHash,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rawKey });
  } catch {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const ctx = await getOrgContext();

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("org_id", ctx.orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
