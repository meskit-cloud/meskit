import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SimulationActionBody {
  action: "start" | "pause" | "reset";
}

export async function POST(request: NextRequest) {
  const body: SimulationActionBody = await request.json();

  switch (body.action) {
    case "start":
    case "pause":
      // Client-held clock: these are acknowledgments only.
      // The actual clock lives in the browser session (simulation-store.ts).
      return NextResponse.json({ ok: true, action: body.action });

    case "reset": {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      // Close all open production orders
      await supabase
        .from("production_orders")
        .update({ status: "closed" })
        .eq("user_id", user.id)
        .in("status", ["new", "scheduled", "running"]);

      // Scrap all in-progress units owned by this user
      await supabase
        .from("units")
        .update({ status: "scrapped" })
        .eq("user_id", user.id)
        .eq("status", "in_progress");

      return NextResponse.json({ ok: true, action: "reset" });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
  }
}
