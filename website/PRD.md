# MESkit Website PRD

- Status: Draft v2
- Last updated: 2026-03-03
- Source context: `/MESKIT_PRD.md` (product PRD)

## 1. Purpose

Define the requirements for `meskit.cloud`, the public website for MESkit, so it can:

1. Explain MESkit clearly to the right audiences.
2. Convert visitors into engaged users (docs readers, GitHub visitors, early adopters).
3. Rank and be discoverable in traditional search engines (SEO).
4. Be discoverable and quotable in AI answer engines (GEO: Generative Engine Optimization).

## 2. Product Context (From Core PRD)

MESkit is an open-source, AI-native MES toolkit that is:

- ISA-95 aligned.
- AI-native — AI agents are first-class operators, not add-ons.
- Simulation-first.
- MQTT-ready for future real device ingestion.
- Built with Next.js + Supabase + Claude API (tool-use).

### AI-Native Architecture

Every MES operation flows through a **tool layer** consumed by both the UI and AI agents. The same typed function that powers a button click also powers a natural-language command. MESkit ships with three specialized agents:

| Agent | Trigger | Role |
|-------|---------|------|
| **Operator Assistant** | Chat (always available) | Conversational co-pilot — query WIP, move units, log defects via natural language |
| **Quality Analyst** | Event-driven | Monitors yield, detects defect clusters, surfaces proactive alerts |
| **Production Planner** | Chat (on demand) | Capacity analysis, scheduling, route optimization |

MVP product scope focuses on discrete manufacturing UX (Build, Configure, Run, Monitor) with an always-available chat panel for agent interaction. Schema supports batch and continuous production types.

## 3. Website Goals

### Primary goals

1. Position MESkit as the first AI-native open-source MES.
2. Make the value proposition understandable in under 10 seconds.
3. Drive high-intent actions:
   - Visit GitHub repository.
   - Read technical docs.
   - Join waitlist/newsletter or request demo/contact (if enabled).

### Secondary goals

1. Build topical authority around ISA-95 + open-source MES + AI agents in manufacturing + MQTT integration.
2. Create reusable, citation-friendly content for AI assistants.
3. Establish MESkit as the reference for "AI-native MES" as a category.

### Non-goals

1. Full docs replacement (website links to docs; does not duplicate all technical depth).
2. Enterprise sales funnel complexity (no heavy CRM workflow in MVP website).
3. Regional/local business SEO (this is a global product site, not a local listing site).

## 4. Target Audiences

1. Manufacturing engineers learning or implementing ISA-95 concepts.
2. Small manufacturers evaluating lightweight MES options.
3. Developers building manufacturing systems who need a reference stack.
4. Teams exploring AI in manufacturing who want agents with real MES tools, not chatbot demos.

## 5. Messaging Framework

### Brand tagline

**The AI-Native MES.** An MES, but an Autonomous one.

### Core promise

"Open-source, AI-native MES toolkit. ISA-95 aligned, agent-powered, simulation-first, MQTT-ready."

### North Star

Predict a machine failure and reschedule the entire shop floor autonomously. Three AI layers build toward this: the Sentinel (Anomaly Monitor) detects degradation, the Strategist (Production Planner) evaluates alternatives, and the Executor (Agent Runtime) acts through the tool layer.

Use the North Star as aspirational vision in hero and brand messaging. Current MVP claims must remain accurate — see messaging guardrails.

### Key proof points

1. **AI-native architecture**: Every MES operation is a typed tool that both the UI and AI agents call — agents are peers to human operators, not wrappers around the UI.
2. **Standards-based model**: ISA-95 terms (part number, route step, unit history) — not proprietary abstractions.
3. **Real architecture**: Postgres, auth, realtime, tool layer — not a mock UI or chatbot demo.
4. **Clear upgrade path**: Simulation to device-driven execution via MQTT using the same message schema and tool layer.
5. **Three specialized agents**: Operator Assistant (chat), Quality Analyst (event-driven), Production Planner (on-demand) — each with defined tools, triggers, and roles.
6. **Autonomous vision**: Three AI layers (Sentinel, Strategist, Executor) designed to close the loop from detection to rescheduling without human intervention.

### Messaging guardrails

1. Do not imply batch/continuous UI is fully available in MVP.
2. Do not position agents as autonomous decision-makers in current MVP — they operate through the same tool layer as humans, with human oversight. The autonomous vision (North Star) can be referenced as the product direction, clearly distinguished from current capabilities.
3. Avoid generic "AI manufacturing" or "AI-powered" claims without specifying what the agents actually do (which tools they call, what triggers them).
4. Prioritize concrete technical language over vague marketing terms.
5. Distinguish between "AI-native" (architecture-level, tool layer shared between UI and agents) and "AI-enhanced" (bolted-on chatbot) — MESkit is the former.

## 6. Brand Identity & Visual Design

This section is the single source of truth for the website's visual identity. All pages, components, and content must conform to these specs.

### 6.1 Brand DNA

MESkit's website identity is **professional, precise, and enterprise-ready**. The visual system is light-first, structured, and high-clarity, designed to communicate trust and engineering maturity rather than experimental aesthetics.

The aesthetic should evoke a modern operations platform: clean surfaces, clear hierarchy, restrained motion, and technical credibility.

### 6.2 Color System

All colors are defined as design tokens. The website uses the same palette as the MESkit app for brand consistency.

#### Core palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--bg-primary` | `#F3F7FC` | `slate-100` | Page background, global canvas |
| `--bg-secondary` | `#EAF1F8` | `slate-200` | Footer and alternate section backgrounds |
| `--surface` | `#FFFFFF` | `white` | Cards, panels, code containers |
| `--surface-hover` | `#F8FBFF` | `blue-50` | Card hover states and soft highlights |
| `--border` | `#D6E0EA` | `slate-300` | Dividers, card edges, nav separator |
| `--border-subtle` | `#E5EDF5` | `slate-200` | Internal table and component separators |

#### Accent colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--accent` | `#0F6FF2` | `blue-600` | Primary CTAs, links, active states |
| `--accent-hover` | `#0A58C7` | `blue-700` | Primary CTA hover states |
| `--accent-muted` | `#DBEAFE` | `blue-100` | Soft accent backgrounds |
| `--accent-soft` | `#EFF6FF` | `blue-50` | Hero and callout washes |

#### Text colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--text-primary` | `#0F172A` | `slate-900` | Headings and primary content |
| `--text-secondary` | `#334155` | `slate-700` | Body text and descriptions |
| `--text-tertiary` | `#64748B` | `slate-500` | Labels, timestamps, helper text |
| `--text-accent` | `#0F6FF2` | `blue-600` | Links and emphasized technical terms |

#### Semantic colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--success` | `#15803D` | `green-700` | Pass results and completed states |
| `--warning` | `#B45309` | `amber-700` | Attention and in-progress states |
| `--error` | `#B91C1C` | `red-700` | Fail results and critical alerts |
| `--agent` | `#7C3AED` | `violet-600` | Agent badges and chat/example accents |

#### Usage rules

1. **Light-first by default.** The website must ship with the professional light identity as canonical.
2. **Blue is the only brand accent.** Do not introduce additional primary accents. Semantic colors are functional only.
3. **Agent violet** is reserved exclusively for content about AI agents (chat examples, agent cards, agent page accents). Do not use it as a general-purpose accent.
4. **No neon/glow treatments.** Use subtle borders, soft gradients, and restrained shadows.
5. **Accessibility baseline**: maintain contrast appropriate for professional documentation and enterprise buyers.

### 6.3 Typography

| Element | Font | Weight | Size (desktop) | Size (mobile) | Tracking |
|---------|------|--------|----------------|---------------|----------|
| H1 (hero) | Manrope | 800 (ExtraBold) | 52px / 3.25rem | 34px / 2.125rem | -0.03em |
| H1 (page) | Manrope | 700 (Bold) | 42px / 2.625rem | 30px / 1.875rem | -0.02em |
| H2 | Manrope | 700 (Bold) | 32px / 2rem | 24px / 1.5rem | -0.02em |
| H3 | Manrope | 600 (Semibold) | 24px / 1.5rem | 20px / 1.25rem | -0.01em |
| Body | Manrope | 400 (Regular) | 18px / 1.125rem | 16px / 1rem | 0 |
| Body small | Manrope | 400 (Regular) | 15px / 0.9375rem | 14px / 0.875rem | 0 |
| Code / data | IBM Plex Mono | 400 (Regular) | 14px / 0.875rem | 13px / 0.8125rem | 0 |
| Nav | Manrope | 600 (Semibold) | 15px / 0.9375rem | 15px / 0.9375rem | 0 |
| CTA button | Manrope | 700 (Bold) | 15px / 0.9375rem | 15px / 0.9375rem | 0.01em |
| Badge / label | Manrope | 600 (Semibold) | 12px / 0.75rem | 12px / 0.75rem | 0.03em |

#### Typography rules

1. **Manrope** is the primary typeface for all UI and marketing content. Load weights 400, 500, 600, 700, 800.
2. **IBM Plex Mono** is used for code blocks, data values, serial numbers, tool names, and technical identifiers (e.g., `get_wip_status`, `SMX-00042`). Load weight 400.
3. Line height: 1.6 for body text, 1.2 for headings, 1.5 for code blocks.
4. Maximum content width: 740px for long-form body text. Use full width for hero, diagrams, and data tables.
5. Keep typographic rhythm consistent across product pages and blog pages; avoid mixing additional display fonts.

### 6.4 Logo & Wordmark

| Asset | Spec |
|-------|------|
| **Wordmark** | "MESkit" — set in Manrope Bold/ExtraBold. "MES" in `--text-primary` (#0F172A), "kit" in `--accent` (#0F6FF2). |
| **Favicon** | Stylized "M" in brand blue on white with subtle border, 32x32 and 16x16. SVG preferred. |
| **OG image** | Light gradient background with white card, centered MESkit wordmark, tagline below: "The AI-Native MES." 1200x630px. |

#### Logo usage rules

1. The wordmark always uses the two-tone split: dark "MES" + blue "kit". Never render the full word in a single color.
2. Minimum clear space around the wordmark: 1x the height of the "M" character.
3. The wordmark is text-based (Manrope Bold/ExtraBold), not a fixed graphic. It should render cleanly in CSS/HTML.
4. On dark external backgrounds, invert "MES" to white while keeping "kit" in brand blue.

### 6.5 Voice & Tone

#### Brand voice attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Technical** | Use precise manufacturing and software terminology. Don't dumb it down. | "ISA-95 aligned data model" — not "follows industry best practices" |
| **Direct** | Lead with the point. No preamble, no filler. | "MESkit ships with three agents." — not "We're excited to introduce..." |
| **Concrete** | Every claim has a specific mechanism. | "The Quality Analyst calls `get_yield_report` when yield drops below 90%." — not "AI monitors your quality." |
| **Confident, not hype** | State what it does. Don't oversell. | "AI-native architecture" — not "revolutionary AI breakthrough" |

#### Tone by context

| Context | Tone | Example |
|---------|------|---------|
| Hero / homepage | Bold, declarative | "The AI-Native MES." / "An MES, but an Autonomous one." |
| Product pages | Explanatory, specific | "Each agent calls typed tools through the same interface the UI uses." |
| Technical pages (architecture, ISA-95) | Precise, neutral | "The tool layer validates inputs with Zod schemas before executing against Supabase." |
| Blog posts | Authoritative, educational | "ISA-95 defines five levels of manufacturing integration. Here's how MESkit maps to each." |
| FAQ | Answer-first, minimal | "Yes. MESkit's data model follows the ISA-95 hierarchy." |
| CTAs | Action-oriented, lowercase verbs | "View on GitHub" / "Read the docs" / "Meet the agents" |

#### Writing rules

1. **No exclamation marks** in headings or CTAs.
2. **No emoji** in page content. Permitted only in the live ticker UI mockups if shown.
3. **Sentence case** for headings ("How the tool layer works" — not "How The Tool Layer Works").
4. **"MESkit"** is always written with capital M-E-S and lowercase k-i-t. Never "Meskit", "MESKIT", or "mes-kit".
5. Use **active voice**. "The agent calls `move_unit`" — not "The `move_unit` function is called by the agent."
6. **Technical terms in monospace**: tool names (`get_wip_status`), serial numbers (`SMX-00042`), table names (`unit_history`), and code references.

### 6.6 Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--space-section` | 96px (6rem) | Vertical spacing between major page sections |
| `--space-block` | 48px (3rem) | Spacing between content blocks within a section |
| `--space-element` | 24px (1.5rem) | Spacing between elements within a block (cards, list items) |
| `--space-tight` | 12px (0.75rem) | Tight spacing within components (label to value, icon to text) |
| `--radius-card` | 14px (0.875rem) | Border radius for cards and feature panels |
| `--radius-button` | 10px (0.625rem) | Border radius for buttons and inputs |
| `--radius-badge` | 999px | Pill badges and status tokens |

#### Layout rules

1. **Max content width**: 1200px, centered. Hero sections may span full viewport width with content constrained.
2. **Grid**: 12-column grid on desktop, collapsing to single column on mobile. Use 4-column for card grids (agents, modes, features).
3. **Section pattern**: Each page section follows: heading → subheading → content block → optional CTA. Separated by `--space-section`.
4. **Card pattern**: `--surface` background, `--border` border (1px), `--radius-card` corners, `--space-element` internal padding, with subtle elevation (`box-shadow`) on hover.
5. **Mobile breakpoint**: 768px. All grids collapse to single column. Section spacing reduces to 64px (4rem).

### 6.7 Component Patterns

#### Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `--accent` gradient | `#FFFFFF` | none | Main CTAs: "View on GitHub", "Get Updates" |
| Secondary | `#FFFFFF` | `--accent` | 1px `--accent` | Secondary actions: "Read Docs", "View Roadmap" |
| Ghost | transparent | `--text-secondary` | none | Tertiary: "Learn more", inline links |

All buttons: `--radius-button`, 12px 24px padding, `font-weight: 700`. Avoid all-caps CTA text.

#### Code blocks

- Background: `#F8FBFF`
- Border: 1px `#D5E5F7`
- Font: IBM Plex Mono 400
- Syntax highlighting: muted palette — blue for keywords, green for strings, violet for agent-related terms, slate for comments
- Top bar with language label and optional copy button

#### Agent chat examples

When showing agent interactions on the website (for illustration, not live):

- User message: `--surface` background, aligned right, `--text-primary` text
- Agent message: `--surface` background with subtle `--agent` left border (3px), aligned left
- Tool call indicator: monospace `--text-tertiary` text showing tool name (e.g., `→ get_wip_status()`)
- Result: `--text-secondary` in the agent response

#### Navigation

- Fixed top nav, translucent light background over `--bg-primary`, with `--border` bottom border
- Wordmark left-aligned (two-tone "MES" + "kit")
- Nav links: `--text-secondary`, hover `--text-primary`, active `--accent`
- Primary CTA button in nav (rightmost): "View on GitHub"
- Mobile: hamburger menu with overlay on semi-opaque `--bg-primary`

#### Footer

- `--bg-secondary` gradient background
- Four-column layout: Product links, Resources links, Community links, Legal
- Wordmark + one-line tagline at bottom
- Social icons: GitHub (required), Twitter/X (optional), Discord (optional)

### 6.8 Imagery & Diagrams

1. **Architecture diagrams**: Rendered in SVG or CSS, not raster images. Use light surfaces with clear borders and blue data-flow accents.
2. **Screenshots**: Use product-realistic, light-first screenshots with readable data density and clear panel hierarchy.
3. **Icons**: Use Lucide icons (open-source, consistent with the engineering aesthetic). Stroke width 1.5px, `--text-secondary` default color, `--accent` for active/featured states.
4. **No stock photography.** No abstract AI art. No gradient meshes. Illustrations should be technical diagrams, architecture drawings, or data visualizations.
5. **Hero visuals**: Product-grade interface compositions (dashboard panels, chat/tool call chains, architecture cards). Avoid terminal-hacker styling.

## 7. Conversion Model

### Primary CTAs

1. "View on GitHub"
2. "Read Docs"
3. "Get Updates" (newsletter/waitlist)

### Secondary CTAs

1. "See the Tool Layer"
2. "Meet the Agents"
3. "View Roadmap"
4. "Read ISA-95 Primer"

## 8. Information Architecture (Sitemap)

### Required pages (MVP)

1. `/` Home
2. `/product` Product overview (modes + chat panel + agents)
3. `/agents` AI agents — what they do, how they work, tool layer architecture
4. `/isa-95` ISA-95 mapping and model explanation
5. `/architecture` Stack + tool layer + agent runtime + MQTT-ready design
6. `/roadmap` Public milestones (M1-M6)
7. `/docs` Docs entry page linking to technical docs
8. `/blog` SEO/GEO content hub
9. `/about` Mission + open-source positioning
10. `/faq` Concise answer blocks for users and AI systems

### Optional pages (post-MVP)

1. `/use-cases/{segment}` (e.g., `/use-cases/electronics-assembly`)
2. `/compare/{alternative}` (e.g., `/compare/traditional-mes`)
3. `/glossary/{term}`
4. `/agents/{agent-name}` (deep-dive per agent)

## 9. Page-Level Requirements

### Home (`/`)

Must include:

1. Clear hero with brand tagline ("The AI-Native MES") and value proposition emphasizing AI-native + ISA-95 + open-source. North Star vision statement below the fold.
2. "How it works" flow aligned to product loop:
   - Define product.
   - Build route.
   - Move units.
   - Collect data.
   - Visualize.
   - ...or tell the agent to do it.
3. Agent showcase — brief visual of the chat panel with example interactions (e.g., "Scrap SMX-00044, solder defect" → agent calls tools → result).
4. Tool layer concept — one diagram showing UI and agents calling the same tools.
5. ISA-95 credibility section.
6. Architecture snapshot (four-layer diagram).
7. Primary and secondary CTAs.

### Product (`/product`)

Must include:

1. Four operating modes (Build, Configure, Run, Monitor) with chat panel integration.
2. Chat panel as a parallel interface — "every button has a voice equivalent."
3. Current MVP boundaries and what is planned.
4. Screenshots/diagrams showing both UI and chat panel side by side.
5. Practical "who this is for" examples.

### Agents (`/agents`)

Must include:

1. What "AI-native MES" means — tool layer architecture, not a bolted-on chatbot.
2. Three agent profiles:
   - **Operator Assistant**: always-on chat, example interactions, available tools.
   - **Quality Analyst**: event-driven triggers, alert examples, monitoring thresholds.
   - **Production Planner**: on-demand planning, capacity analysis examples.
3. Tool layer explanation — how the same typed functions serve UI buttons and agent tool-use.
4. Architecture diagram (agent runtime → tool layer → Supabase).
5. Concrete examples with tool call chains (user says X → agent calls Y → result Z).
6. Guardrails: agents operate through the tool layer with human oversight, not autonomous.

### ISA-95 (`/isa-95`)

Must include:

1. Term mapping table (ISA-95 term → MESkit implementation).
2. Production type coverage (discrete default; batch/continuous schema-ready).
3. Note on how agents operate at ISA-95 Level 3 — same level as human operators.
4. Internal links to architecture, agents, and docs.

### Architecture (`/architecture`)

Must include:

1. Four-layer design diagram (Frontend → Tool Layer → Agent Runtime → Supabase → MQTT).
2. Tool layer rationale — single source of truth for UI and agents.
3. Agent runtime explanation — Claude API tool-use, streaming, system prompts.
4. Supabase rationale (Postgres, Auth, Realtime, Edge Functions).
5. MQTT schema + transport transition explanation.

### Roadmap (`/roadmap`)

Must include:

1. Milestone timeline (M1-M6) with agent deliverables highlighted per milestone.
2. Explicit status labels (planned, in progress, completed).
3. Agent progression story: M1 (scaffold) → M2 (Operator Assistant) → M4 (Quality Analyst) → M5 (Planner) → M6 (Anomaly Monitor).
4. Link to changelog/releases when available.

### Blog (`/blog` + posts)

Must include:

1. Category taxonomy: ISA-95, MES architecture, AI agents, simulation, MQTT, Supabase.
2. Author, publish date, update date.
3. Structured data and internal links to product pages.

Priority launch content:
- "What is an AI-native MES?" (category-defining explainer)
- "How MESkit agents call MES tools" (technical deep-dive on tool layer)
- "ISA-95 for developers" (educational, high search volume)
- "From simulation to MQTT: same tools, different transport" (architecture story)

### FAQ (`/faq`)

Must include:

1. Short, direct Q/A format (answer-first writing).
2. Questions targeting both user intent and LLM query patterns.
3. Links to canonical supporting pages.

## 10. SEO Requirements (Search Engine Optimization)

### 10.1 Keyword strategy

Create clusters and map each cluster to a canonical page:

1. **Open-source MES**: "open source MES", "manufacturing execution system open source" → `/product`
2. **ISA-95 implementation**: "ISA-95 software model", "ISA-95 MES example" → `/isa-95`
3. **AI MES / AI manufacturing agents**: "AI-native MES", "AI agents manufacturing", "AI manufacturing execution system", "MES with AI" → `/agents`
4. **Simulation + MQTT bridge**: "manufacturing simulation MQTT", "MES MQTT integration" → `/architecture`
5. **Supabase manufacturing stack**: "Supabase MES", "real-time manufacturing dashboard" → `/architecture`
6. **MES tool layer / API-first MES**: "MES API", "programmable MES", "MES developer tools" → `/agents` (tool layer section)

Rule: one primary keyword intent per page, with semantically related secondary terms.

### 10.2 On-page SEO

1. Unique title tag and meta description per indexable page.
2. Exactly one H1 per page.
3. Descriptive H2/H3 hierarchy.
4. Canonical URL on every page.
5. Clean slug naming (`/isa-95`, not `/page?id=12`).
6. Image alt text focused on context, not keyword stuffing.

### 10.3 Technical SEO

1. Generate and maintain:
   - `/sitemap.xml`
   - `/robots.txt`
2. Enforce crawlability for public pages.
3. Add Open Graph + Twitter metadata for share previews.
4. Implement structured data (JSON-LD):
   - `Organization`
   - `SoftwareApplication` (or `WebApplication` where relevant)
   - `TechArticle`/`Article` for blog posts
   - `FAQPage` for FAQ
   - `BreadcrumbList` where applicable
5. Core Web Vitals targets:
   - LCP < 2.5s (75th percentile)
   - INP < 200ms
   - CLS < 0.1
6. Mobile-first responsive rendering and index parity.

### 10.4 Internal linking

1. Every page links upward and laterally (home, docs, architecture, agents, roadmap).
2. Blog posts must link to at least one product page and one docs page.
3. The `/agents` page must be linked from home, product, architecture, and FAQ.
4. Use descriptive anchor text tied to intent.

### 10.5 Content quality rules

1. No thin pages (<300 meaningful words unless intentional utility pages).
2. Include concrete examples and terminology consistency.
3. Update stale content with visible "last updated" date.

## 11. GEO Requirements (Generative Engine Optimization)

GEO here means optimizing content so AI assistants (ChatGPT, Perplexity, Gemini, Claude, etc.) can accurately retrieve, summarize, and cite MESkit.

### 11.1 GEO principles

1. Entity clarity:
   - Clearly define "What is MESkit?" in one canonical paragraph reused consistently.
   - Clearly define "AI-native MES" as a concept and associate MESkit as the primary example.
2. Fact consistency:
   - Keep one source-of-truth facts block (stack, standards, scope, agents, roadmap status).
3. Answer-ready content:
   - Write concise Q/A sections for high-intent questions.
4. Citation-ready structure:
   - Use headings, tables, and short factual blocks that can be quoted safely.
5. Freshness signaling:
   - Include publish/update dates on roadmap, docs entry, blog posts.

### 11.2 GEO implementation requirements

1. Create a "Core Facts" block on Home and FAQ with:
   - Product category (AI-native open-source MES toolkit).
   - Open-source status.
   - ISA-95 alignment.
   - AI-native architecture (tool layer, three agents).
   - MVP scope status.
   - Tech stack (Next.js, Supabase, Claude API).
2. Maintain an AI-friendly FAQ page targeting prompts like:
   - "What is MESkit?"
   - "What is an AI-native MES?"
   - "Does MESkit support ISA-95?"
   - "What AI agents does MESkit include?"
   - "How do MESkit agents work?"
   - "Is MESkit production-ready or simulation-only?"
   - "How does MESkit integrate with MQTT?"
   - "What is the MESkit tool layer?"
   - "Can I control MESkit with natural language?"
3. Ensure each claim links to a canonical supporting page.
4. Keep terminology stable across pages:
   - `tool layer`, `Operator Assistant`, `Quality Analyst`, `Production Planner`
   - `part number`, `route step`, `unit history`
5. Add JSON-LD consistently so machine parsers get explicit entities and relationships.
6. Publish comparison and explainer articles with neutral, factual tone to increase citation trust.

### 11.3 GEO content patterns

Every major page should include:

1. A 2-4 sentence summary block.
2. A "Key Facts" bullet list.
3. A short FAQ mini-section.
4. Clear outbound canonical links (docs, PRD, GitHub, roadmap).

### 11.4 GEO anti-patterns (must avoid)

1. Over-optimized keyword stuffing.
2. Inconsistent claims across pages (for example, saying batch UI is already shipped, or implying agents are autonomous without human oversight).
3. Long paragraphs without scannable structure.
4. No source links for critical claims.
5. Generic "AI-powered" claims without specifying what the agents do and which tools they call.

## 12. Content Operations

### Editorial cadence

1. Minimum: 2 high-quality posts per month during launch period.
2. Quarterly refresh of core pages (`/product`, `/agents`, `/isa-95`, `/architecture`, `/roadmap`, `/faq`).

### Authoring checklist per page/post

1. Primary intent and target query defined.
2. Metadata completed.
3. Structured data validated.
4. At least 2 internal links and 1 external authoritative reference (when appropriate).
5. Last-updated date visible.
6. Agent-related claims verified against current product PRD (which agents exist, what tools they have, what triggers them).

## 13. Analytics and KPIs

### Acquisition KPIs

1. Organic sessions (search engines).
2. Impressions and CTR for priority queries (including "AI MES" and "AI-native MES" clusters).
3. Referral sessions from AI/chat discovery sources where detectable.

### Engagement KPIs

1. CTA click-through rate by page.
2. Docs click-through rate.
3. Average engaged time on core pages.
4. `/agents` page engagement (time on page, scroll depth, outbound clicks to docs/GitHub).

### Conversion KPIs

1. GitHub outbound clicks.
2. Waitlist/newsletter signups.
3. Contact/demo submissions (if enabled).

### Quality KPIs

1. Core Web Vitals pass rate.
2. Index coverage health.
3. Share of pages with valid structured data.

## 14. Functional Requirements

1. Website must be implemented with SSR/SSG-friendly rendering for indexable content.
2. CMS/content workflow must support publish date + updated date fields.
3. Metadata must be manageable per page without code duplication.
4. Sitemap must update automatically for new blog/docs-index pages.
5. 404 and redirect handling must preserve SEO equity.

## 15. Out of Scope (Website MVP)

1. Authenticated application UX (this PRD is only for marketing/public website).
2. Live agent demo or interactive chat on the website (the agents run inside the MESkit app, not on the marketing site).
3. Multi-language localization.
4. Paid acquisition landing page variants.
5. Full docs migration into website (keep docs as canonical technical source).

## 16. Launch Acceptance Criteria

Website launch is accepted only when:

1. All required MVP pages are published and internally linked (including `/agents`).
2. Metadata, canonical tags, sitemap, robots, and JSON-LD are implemented.
3. Home, product, agents, ISA-95, architecture, and FAQ each contain answer-ready GEO blocks.
4. Performance meets Core Web Vitals targets on mobile and desktop.
5. Analytics events are live for all primary CTAs.
6. No factual mismatch with `/MESKIT_PRD.md`.
7. Agent descriptions on the website match the current product PRD (tools, triggers, roles).

## 17. Dependencies and Risks

### Dependencies

1. Final repository URL and docs URL stabilization.
2. Roadmap status source for accurate freshness updates.
3. Analytics stack selection and event taxonomy.
4. Product PRD as single source of truth for agent capabilities and tool catalog.

### Risks

1. Product terminology drift between app/docs/website can harm SEO and GEO trust — especially for new AI-native terms (tool layer, agent runtime).
2. Shipping thin content pages can reduce ranking and citation quality.
3. Overpromising agent capabilities can increase bounce and reduce credibility — always tie claims to specific tools and triggers.
4. "AI-native" positioning must be substantiated with concrete architecture details to avoid being perceived as marketing hype.
