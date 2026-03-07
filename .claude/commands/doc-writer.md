# End-User Documentation Writer

Generate an end-user documentation page for MESkit's public website.

## Input

$ARGUMENTS — topic slug + title (e.g., "getting-started -- Getting Started with MESkit")

## Instructions

Parse the topic slug and title from the input (split on `--` if present). If no `--` separator, treat the full input as the topic slug and derive a title.

### Step 1 — Gather source material

Before writing anything, read the relevant source-of-truth files to extract accurate, current information:

1. **Always read**: `MESKIT_PRD.md` (architecture, tool catalog, agent definitions, ISA-95 model)
2. **Always read**: `ROADMAP.md` (current milestone status — only document features that are implemented or in progress)
3. **Always read**: `website/lib/site.ts` (coreFacts, siteConfig for consistency)
4. **Topic-specific reads**:
   - Shop floor / Build Mode → `lib/tools/shop-floor.ts`, `app/(app)/build/`
   - Products / Configure Mode → `lib/tools/product.ts`, `app/(app)/configure/`
   - Production / Run Mode → `lib/tools/production.ts`, `app/(app)/run/`
   - Monitoring / Monitor Mode → `lib/tools/analytics.ts`, `app/(app)/monitor/`
   - Smart features → `lib/agents/`, `app/api/chat/`
   - Architecture → `lib/tools/registry.ts`, `lib/agents/runtime.ts`
   - Self-hosting / Setup → `package.json`, `supabase/`, `.env.example` or `.env.local.example`

### Step 2 — Determine page location and type

Documentation pages live in the marketing website under `website/app/docs/`.

```
website/app/docs/{topic-slug}/page.tsx
```

#### Page types

| Type | Use when | Structure |
|------|----------|-----------|
| **Guide** | Teaching a workflow end-to-end | Intro → Prerequisites → Steps → Next steps |
| **Concept** | Explaining an idea or architecture | Intro → Explanation → Diagram → How it connects |
| **Reference** | Listing capabilities, APIs, tools | Intro → Table/list → Details → Related |

### Step 3 — Write the documentation page

Generate a Next.js page using the website's existing component library. Follow this template:

```tsx
// website/app/docs/{topic-slug}/page.tsx
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import {
  Breadcrumbs,
  CtaRow,
  KeyFacts,
  MiniFaq,
  PageIntro,
  Section,
  SummaryBlock,
} from '@/components/page-elements';
import { buildPageMetadata, siteConfig } from '@/lib/site';
import { breadcrumbJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: '{Page Title}',
  description: '{One-sentence description for SEO — 150-160 chars, includes "MESkit"}',
  path: '/docs/{topic-slug}',
  keywords: ['{3-6 relevant keywords}'],
});

const breadcrumbs = [
  { name: 'Docs', path: '/docs' },
  { name: '{Page Title}', path: '/docs/{topic-slug}' },
];

export default function {TopicName}Page() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="{Page Title}"
          description="{Lead paragraph — what the user will learn or accomplish}"
          updated={siteConfig.lastUpdated}
        />

        {/* Sections follow based on page type */}
      </div>
    </div>
  );
}
```

### Step 4 — Update the docs index page

After creating the doc page, update `website/app/docs/page.tsx` to add a card linking to the new page in the "Core technical references" section (or a new "User guides" section if one doesn't exist yet).

```tsx
<article className="card">
  <h3>{Page Title}</h3>
  <p>{One-line description}</p>
  <p style={{ marginTop: '0.7rem' }}>
    <Link href="/docs/{topic-slug}">{Link label}</Link>
  </p>
</article>
```

### Writing Guidelines

#### Voice and tone
- **Second person** — "you" not "the user"
- **Active voice** — "Create a line" not "A line can be created"
- **Present tense** — "MESkit uses" not "MESkit will use"
- **Direct and concise** — No filler. Every sentence teaches or instructs.
- **Manufacturing-aware** — Use ISA-95 terms correctly (line, workstation, unit, route, BOM)

#### Accuracy rules
- **Only document what exists.** If a feature is planned but not implemented, say so explicitly: "Planned for M4" or "Not yet available."
- **Match the PRD.** All claims about architecture, agent behavior, and tool capabilities must come from `MESKIT_PRD.md`.
- **Match the code.** If documenting a UI workflow, verify the actual pages exist in `app/`. If documenting a tool, verify it exists in `lib/tools/`.
- **No hallucinated screenshots.** Only reference UI elements you can verify in the source code.

#### Structure rules
- Every page starts with a **Summary** section using `<SummaryBlock>`.
- Use `<Section>` for each major heading.
- Use `<KeyFacts>` for scannable key points.
- Use `<MiniFaq>` for anticipated questions at the bottom of the page.
- End with a `<CtaRow>` linking to the next logical page and a secondary link.
- Keep paragraphs short — 2-3 sentences max.

#### SEO and GEO
- Description metadata: 150-160 characters, includes "MESkit" and the primary keyword.
- Keywords: 3-6 terms, mix branded ("MESkit") with generic ("open source MES").
- Breadcrumbs: Always include Docs as parent.
- Structured data: Use `breadcrumbJsonLd` at minimum. Add `faqJsonLd` if the page has a MiniFaq with 3+ items.

### Documentation Topic Catalog

Use these when the user asks for a specific topic. Each maps to a page type and key sources:

| Topic slug | Title | Type | Key sources |
|------------|-------|------|-------------|
| `getting-started` | Getting Started | Guide | README, .env setup, package.json |
| `build-mode` | Build Mode — Shop Floor Setup | Guide | PRD §Build Mode, shop-floor.ts, build page |
| `configure-mode` | Configure Mode — Products & Routes | Guide | PRD §Configure Mode, product.ts |
| `run-mode` | Run Mode — Production Execution | Guide | PRD §Run Mode, production.ts |
| `monitor-mode` | Monitor Mode — Analytics Dashboard | Guide | PRD §Monitor Mode, analytics.ts |
| `smart-features` | Working with Smart Features | Concept | PRD §Intelligence Layer, agents/ dir |
| `tool-layer` | The Tool Layer | Concept | PRD §Tool Layer, registry.ts, tools/ |
| `isa-95` | ISA-95 Data Model | Reference | PRD §ISA-95, migrations/ |
| `self-hosting` | Self-Hosting Guide | Guide | README, supabase/, .env |
| `chat-commands` | Chat Commands Reference | Reference | Agent tools, operator.ts |

If the user requests a topic not in this catalog, follow the same structure and guidelines. Determine the page type from context.

### Conventions

- File names use kebab-case for the directory: `website/app/docs/{topic-slug}/page.tsx`
- Component names use PascalCase: `BuildModePage`, `GettingStartedPage`
- All pages are statically generated (no `"use client"`, no runtime data fetching)
- Use the website's CSS design tokens — **no Tailwind** (the website uses pure CSS)
- Import paths use `@/` prefix within the website project
- Link to other docs pages with `<Link href="/docs/{slug}">`, not external URLs
- Link to the GitHub repo for source-level references using `siteConfig.githubUrl`
