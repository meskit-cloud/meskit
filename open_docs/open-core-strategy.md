# Open-Core Strategy — MESkit

> **Status: Draft — parking this here for now. We will revisit to decide what to do.**

---

## Model

Open-source core + proprietary SaaS layer. The GitLab / Supabase playbook.

- **MESkit** (GitHub, MIT) — the open-source MES toolkit. Self-hostable, fully functional for single-tenant use.
- **meskit.cloud** (proprietary) — managed hosting with features the OSS version doesn't include.

Users can self-host for free or pay for managed hosting. Product-led growth: people adopt the OSS, hit a scaling wall, and upgrade to SaaS.

## Boundary — OSS vs. SaaS

### Open-source core (MIT)

- Full MES functionality (Build, Configure, Run, Monitor modes)
- Tool layer + all MES operations
- Single-tenant Supabase auth (email/password)
- Agent runtime with basic agents (Operator Assistant, Quality Analyst, Production Planner)
- ISA-95 schema + migrations
- Simulation engine
- MQTT ingestion (M6)
- Chat panel + streaming
- Self-hosted deployment (own Supabase + Vercel/any host)

### SaaS-only (proprietary, meskit.cloud)

- **Multi-tenancy** — org/workspace management, team invites, role-based access
- **Managed auth** — SSO (SAML/OIDC), MFA, audit logs
- **Historical analytics** — long-term trend dashboards, cross-site benchmarking, data retention policies
- **Agent orchestration** — multi-agent coordination, scheduled agent runs, agent activity logs and observability
- **Multi-site** — manage multiple plants/facilities from one account, cross-site reporting
- **Usage-based billing** — metered by agents, users, or data volume
- **SLA and support** — guaranteed uptime, priority support, onboarding

## Upgrade triggers

These are the moments a self-hosted user hits a wall and considers SaaS:

1. **Scaling** — single Supabase instance can't handle volume; they need managed infra.
2. **Multi-site** — second plant/facility; need unified view across locations.
3. **Historical analytics** — want trend analysis over months/years without managing storage.
4. **Team growth** — need SSO, roles, audit trails for compliance.
5. **Agent orchestration** — want scheduled agents, multi-agent workflows, observability.

## Licensing

- OSS repo: MIT license (no change from current).
- SaaS-specific code: lives in a separate directory (e.g., `cloud/` or `ee/`) with a proprietary or BSL license. Not included in the OSS distribution.
- Decision needed: whether SaaS code lives in the same repo (monorepo with license boundary) or a separate private repo.

## Competitive reference

| Company | OSS Project | SaaS Product | License Model |
|---------|------------|--------------|---------------|
| GitLab | GitLab CE (MIT) | GitLab.com / EE | CE: MIT, EE: proprietary |
| Supabase | supabase/supabase (Apache 2.0) | supabase.com | Apache 2.0 + platform features |
| PostHog | posthog/posthog (MIT) | PostHog Cloud | MIT + proprietary enterprise |
| Cal.com | calcom/cal.com (AGPL) | Cal.com | AGPL + EE license |

## Docs that need updating

Once we commit to this strategy, the following docs should be updated to reflect the open-core model:

- `MESKIT_PRD.md` — business model section, target users
- `ROADMAP.md` — SaaS milestone track
- `website/PRD.md` — SaaS conversion goals, pricing page, messaging
- `docs/growth_strategy.md` — open-core funnel
- `README.md` — OSS vs. cloud distinction
- `CLAUDE.md` — project overview
- `GEO-ANALYSIS.md` — entity descriptions

## Open questions

- [ ] Does SaaS code live in this repo (monorepo) or a separate private repo?
- [ ] What license for SaaS-specific code? (BSL, proprietary, EE-style?)
- [ ] Pricing model: per-seat, per-site, usage-based, or hybrid?
- [ ] When to introduce the pricing page on the website?
- [ ] Which milestone to start building SaaS-specific features?
