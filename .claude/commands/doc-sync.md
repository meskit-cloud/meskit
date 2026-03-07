# /doc-sync — Documentation Sync Auditor

Audit all downstream documentation against source-of-truth files and actual code. Report every discrepancy with file paths and line numbers.

## Instructions

You are auditing MESkit documentation for staleness. Follow these steps exactly.

### Step 1 — Extract ground truth from code

Read these files and extract the actual values:

1. **Tool count**: Count `registerTool({` calls across all files in `lib/tools/`. Group by file (shop-floor, product, production, quality, analytics). Report total and per-category.
2. **Table count**: Count `CREATE TABLE` statements in `supabase/migrations/*.sql`.
3. **Agent runtime**: Check `lib/tools/registry.ts` and `lib/agents/runtime.ts` for the AI SDK import (`@google/generative-ai`, `@anthropic-ai/sdk`, `openai`, etc.). Report which SDK is in use.
4. **Milestone status**: Read `ROADMAP.md` line 3 for the current status string. Identify which milestones are complete, in progress, and planned.
5. **GitHub URL**: Check `website/lib/site.ts` for `githubUrl` and verify it matches URLs used elsewhere.

### Step 2 — Check each downstream file

For each file below, compare its claims against the ground truth from Step 1. Report **every** discrepancy.

#### `README.md`
- Tool count (search for "registered tools")
- Milestone status table (M1-M6 Status column)
- Current status section header
- Agent runtime / SDK references
- Table count if mentioned
- GitHub URLs

#### `CLAUDE.md`
- Agent runtime description (search for "Claude API", "Gemini", "tool-use loop")
- Architecture layer descriptions
- Tool file references (do referenced files still exist?)
- Directory structure (do listed directories exist?)
- Skill table (do all `.claude/commands/*.md` files listed actually exist?)

#### `website/lib/site.ts`
- `coreFacts` array — check every fact for accuracy:
  - Table count
  - Tool count
  - Agent runtime / stack
  - Milestone status
  - Number of agents

#### `website/app/llms.txt/route.ts` (or `website/public/llms.txt`)
- Status line
- Stack description
- Table count
- Tool count
- All URLs (do they resolve to existing pages?)

#### `website/app/roadmap/page.tsx`
- Milestone statuses (completed/progress/planned) match ROADMAP.md
- Milestone descriptions match current scope

#### `website/app/docs/page.tsx`
- GitHub URLs (org name, repo name)
- Links to internal pages (do they exist?)

#### `docs/claude-code-skills.md`
- Skill table matches actual files in `.claude/commands/`
- Output paths match actual project structure

### Step 3 — Report

Output a markdown table with columns:

| File | Line | Claim | Actual | Severity |
|------|------|-------|--------|----------|

Severity levels:
- **Critical**: Wrong SDK/runtime, broken URLs, wrong GitHub org — causes confusion for humans and AI agents
- **Medium**: Wrong counts (tools, tables) — misleading but not blocking
- **Low**: Minor wording drift, status labels slightly behind — cosmetic

After the table, list **recommended fixes** grouped by file, with the exact old → new text changes needed.

### Step 4 — Summary

End with:
- Total discrepancies found
- Files with zero issues (clean)
- Suggested cadence: "Run `/doc-sync` at each milestone boundary (you are currently at: {milestone})"
