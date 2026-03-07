# Onboarding Plan — First-Run Experience

> Status: Planned — target implementation after M4 (Run Mode + Simulator)
> See also: ROADMAP.md (note added under M4)

## Demo Environment — 7-Day Data Retention

This is a demo/simulator environment. All user data is automatically deleted 7 days after account creation.

### User-Facing Notice

The 7-day limit must be clearly communicated at multiple touchpoints:

1. **Signup page** — below the signup form: "This is a demo environment. Your data will be automatically deleted after 7 days."
2. **Top bar banner** — persistent, dismissible banner showing days remaining: "Demo environment — your data expires in N days" with a subtle countdown. Use `auth.users.created_at` to compute days remaining client-side.
3. **Agent welcome message** — the Operator Assistant mentions it in the greeting: "...keep in mind this is a demo environment — your data resets after 7 days."
4. **Settings / account area** — show exact expiration date and time

### Banner Design

- Subtle but visible — thin bar above the top bar or inline in the top bar
- Color: `warning` tones (amber) for 3+ days remaining, `error` tones (red) for last 2 days
- Dismissible per session (localStorage flag), but reappears on next session
- Shows: "Demo — data expires in 5 days" / "Demo — data expires tomorrow"

### Cron Job

A `pg_cron` job runs daily at 03:00 UTC and deletes all data for users whose accounts are older than 7 days. See `supabase/migrations/004_demo_data_cleanup_cron.sql`.

- Deletes from root tables (`lines`, `part_numbers`, `items`, `defect_codes`, `agent_conversations`, `audit_log`)
- `ON DELETE CASCADE` handles all child tables automatically
- The user account itself is NOT deleted — they can sign back in and start fresh
- Logs cleanup activity for monitoring

---

## Problem

After signup, the user lands on Build Mode with three empty panels and the message "No lines yet — Click '+' to create your first manufacturing line." This is a cold, blank-canvas start with:

- Zero context on what a "line," "workstation," or "machine" means in MES terms
- No example of what a good setup looks like
- No sense of what they're working toward
- High cognitive load, distant payoff

## Goal

Make the first 60 seconds after signup feel guided, purposeful, and exciting — while immediately demonstrating the AI-native differentiator (the Operator Assistant).

## Design

### Approach: Agent-Guided Onboarding + Demo Data

Combine two strategies for maximum impact:

1. **Agent welcome message** — auto-open the chat panel on first login with a greeting from the Operator Assistant
2. **One-click demo shop floor** — offer to seed realistic sample data so the user has something tangible immediately

### Flow

```
Signup → Redirect to /build → Detect empty shop floor (lines.length === 0)
  │
  ├─ Auto-open chat panel (if closed)
  │
  └─ Operator Assistant sends welcome message:
     "Welcome to MESkit! I'm your Operator Assistant — I can help you
      set up and manage your shop floor through chat.

      Want me to:
      1. Create a demo shop floor (instant — I'll set up a sample line
         with workstations and machines so you can explore)
      2. Guide you step by step (I'll walk you through creating your
         first line, workstations, and machines)
      3. Let me explore on my own"
```

### Option 1: Demo Shop Floor (recommended default)

The agent creates a realistic sample setup using the existing tool layer:

**Line:** "SMT Assembly Line"
**Workstations (4):**
1. Solder Paste Printing
2. Pick & Place
3. Reflow Oven
4. Optical Inspection (quality gate)

**Machines (5-6):**
- Solder Paste Printer SP-100 (at station 1)
- Pick & Place Robot PP-200A (at station 2)
- Pick & Place Robot PP-200B (at station 2)
- Reflow Oven RF-300 (at station 3)
- AOI Camera AOI-400 (at station 4)

After creation, the agent says:
"Done! I've created an SMT Assembly Line with 4 workstations and 5 machines.
Click on the line to explore the setup. You can rename, reorder, or delete
anything — this is your sandbox.

When you're ready, head to **Configure** mode to define products and routes,
or ask me anything!"

### Option 2: Guided Step-by-Step

The agent walks through 3 micro-steps with explanations:

1. **"What do you manufacture?"** — Agent asks, then creates a line with an appropriate name
2. **"What are the steps?"** — Agent explains workstations and helps add 2-3
3. **"What equipment?"** — Agent helps register machines at each workstation

Each step includes a brief explanation of the MES concept.

### Option 3: Self-Guided

Agent says: "No problem! The left panel is for manufacturing lines — click '+' to create your first one. I'm here if you need help."

## Post-M4 Enhancements

Once Run Mode and the Simulator exist, the onboarding can extend across modes:

### Cross-Mode Checklist (optional, persistent)

A subtle progress indicator in the sidebar or top bar:

- [ ] Create a line (Build)
- [ ] Add workstations and machines (Build)
- [ ] Define a product (Configure)
- [ ] Set up a route (Configure)
- [ ] Run a simulation (Run)
- [ ] View production data (Monitor)

Each completed item links to the next mode, creating a natural progression through the entire product.

### Demo Data Extension for Configure + Run

After the user explores Build Mode, the agent can offer to continue:
- **Configure:** "Want me to set up a sample product with a BOM and route through your assembly line?"
- **Run:** "Ready to see it in action? I can start a simulation and you'll see units flowing through your line."

This creates a full "aha moment" loop in under 5 minutes.

## Implementation Notes

### Detection

- Check `lines` table count on Build page load
- If zero lines AND no `onboarding_dismissed` flag in localStorage → trigger onboarding
- Store `onboarding_dismissed` in localStorage (not DB) to keep it lightweight

### Agent Integration

- No special agent mode needed — the welcome message is injected as an initial assistant message in the chat panel
- The agent uses the same tools it always does (`create_line`, `create_workstation`, `create_machine`)
- The demo data creation happens through normal tool calls, so it shows up in the live ticker

### What NOT to Build

- No separate onboarding UI/modal — the chat panel IS the onboarding
- No tutorial overlay or tooltips — the agent explains things conversationally
- No forced flow — the user can dismiss and explore freely at any time
- No onboarding-specific database tables or API routes

## Timing Rationale

**Target: M4 (alongside or immediately after Run Mode)**

- After M4, the full Build → Configure → Run loop exists. The onboarding can guide through all three.
- M4 introduces the Simulator, which creates the "wow moment" — units flowing through the shop floor the user just built.
- Waiting until M6 (MQTT) delays engagement optimization while the core product loop is already complete.
- A minimal version (agent welcome + demo data for Build only) could ship even earlier as a quick win during M3/M4 development.

## Success Metrics

- Time from signup to first meaningful action (target: < 30 seconds)
- % of new users who create at least one line within first session (target: > 80%)
- % of new users who reach Configure mode within first session (target: > 50%)
- Chat panel engagement rate in first session
