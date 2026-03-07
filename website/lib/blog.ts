export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  summary: string;
  keyFacts: string[];
  miniFaq: BlogFaq[];
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'what-is-an-ai-native-mes',
    title: 'Why your MES needs a universal tool layer',
    excerpt:
      'A practical look at why shared tool interfaces matter more than chat widgets in modern manufacturing software.',
    category: 'MES architecture',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: [
      'open source MES',
      'MES with natural language',
      'MES tool layer',
      'manufacturing execution system',
    ],
    summary:
      'MESkit uses a shared tool layer so natural-language commands and UI clicks trigger identical business logic. This architecture-level integration keeps operations consistent, testable, and auditable.',
    keyFacts: [
      'Architecture-level integration means one tool layer, not a chatbot bolted on.',
      'In MESkit, every operation is a typed tool with validation.',
      'Natural language and UI both call the same tool layer.',
      'Human oversight remains mandatory for operational decisions.',
    ],
    miniFaq: [
      {
        question: 'Is this the same as adding a chatbot to an MES?',
        answer:
          'No. A chatbot wrapper sits on top of existing logic. MESkit routes both UI and natural language through the same validated tool functions — one execution path, not two.',
      },
      {
        question: 'Can operators still use normal screens?',
        answer:
          'Yes. The UI remains first-class. Natural language is a parallel interface, not a replacement.',
      },
    ],
    sections: [
      {
        heading: 'Why manufacturing teams should care',
        paragraphs: [
          'Most MES products add natural language as a sidecar. A sidecar can summarize data, but it usually cannot execute the same trusted operations your operators use. That creates drift between what the UI can do and what the natural language interface can do.',
          'MESkit removes that split. The operation to move a unit, create a quality event, or fetch WIP is defined once. Humans trigger it via UI actions. The natural language interface triggers it via the same tool layer. The output path is identical and auditable.',
          'This architecture lowers operational risk because there is one source of truth for validation, permission checks, and side effects.',
        ],
      },
      {
        heading: 'The MESkit implementation pattern',
        paragraphs: [
          'MESkit places the tool layer between both clients and persistence. The frontend, Ask MESkit, Quality Monitor, and Production Planner all call typed functions validated with schemas before execution against Supabase.',
          'Because tools are typed and testable, the same function can be used in server actions, smart feature registrations, and isolated tests. This is how MESkit keeps behavior consistent across Build, Configure, Run, and Monitor workflows.',
          'The result is simple: every button has a voice equivalent, and every voice command has the same guardrails as a button.',
        ],
      },
      {
        heading: 'Boundary conditions and guardrails',
        paragraphs: [
          'Natural language does not imply autonomous control. MESkit smart features are force multipliers for human operators — they remove coordination bottlenecks through explicit tool calls, not replace decision-making. They do not bypass process constraints or invent hidden state transitions.',
          'MVP scope is focused on discrete manufacturing workflows. The schema is ready for batch and continuous types, but those UI experiences are post-MVP.',
          'If you are evaluating MES software, ask one question first: are natural language actions routed through the same validated operations as UI actions? If not, you are likely looking at a chatbot wrapper, not architecture-level integration.',
        ],
      },
    ],
  },
  {
    slug: 'how-meskit-agents-call-mes-tools',
    title: 'How MESkit smart features call MES tools',
    excerpt:
      'Technical deep dive into tool registration, call chains, and event-driven quality monitoring.',
    category: 'MES architecture',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: ['MES API', 'programmable MES', 'MES tool layer', 'MES natural language'],
    summary:
      'MESkit smart features are configured with explicit tool definitions that map to the same typed functions used by UI server actions. A user prompt resolves into deterministic tool calls, then writes to Supabase through validated operations.',
    keyFacts: [
      'Tool contracts are typed and validated before execution.',
      'Ask MESkit can call all shop-floor and execution tools.',
      'Quality Monitor is event-driven and threshold-based.',
      'Production Planner is on-demand and analytics-oriented.',
    ],
    miniFaq: [
      {
        question: 'Does the natural language interface have a private API?',
        answer: 'No. Smart features use the same tool layer as the UI.',
      },
      {
        question: 'Can quality alerts trigger automatically?',
        answer:
          'Yes. The Quality Monitor listens to realtime conditions and runs when thresholds are breached.',
      },
    ],
    sections: [
      {
        heading: 'From intent to function call',
        paragraphs: [
          'When a user writes a command in chat, the intelligence layer forwards structured context: current mode, selected line, and related IDs when available. It then selects from registered tools and emits a call payload.',
          'The system executes the selected tool using schema-validated input. If validation fails, the call is rejected with a clear error, and no state mutation occurs.',
          'Once execution completes, the result is returned for final response generation and to the UI for direct rendering in the conversation timeline.',
        ],
      },
      {
        heading: 'Tool chain example: scrap a defective unit',
        paragraphs: [
          'A user asks: scrap SMX-00044 due to solder bridge. MESkit resolves this into a sequence: `search_units` to locate the unit, `create_quality_event` to store defect context, then `scrap_unit` to set terminal state.',
          'Because each call is explicit, the audit trail shows exactly what happened and in which order. This is critical for manufacturing QA workflows and post-incident analysis.',
          'The same operations are available in direct UI actions. The difference is only interface, not business logic.',
        ],
      },
      {
        heading: 'Event-driven quality monitoring',
        paragraphs: [
          'The Quality Monitor is not prompt-only. It can activate on realtime events when yield drops below threshold, when defect clusters form within a window, or when scrap rates rise unexpectedly.',
          'After activation, it uses read-focused tools like `get_yield_report`, `get_unit_history`, and `search_units`, then publishes a concise alert with likely root causes and suggested checks.',
          'This keeps monitoring proactive while preserving operator control over corrective actions.',
        ],
      },
    ],
  },
  {
    slug: 'isa-95-for-developers',
    title: 'ISA-95 for developers: practical mapping guide',
    excerpt:
      'A direct mapping from ISA-95 concepts to concrete tables, operations, and workflows in MESkit.',
    category: 'ISA-95',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: ['ISA-95 MES example', 'ISA-95 software model', 'manufacturing data model'],
    summary:
      'MESkit maps ISA-95 terms directly into a Postgres schema so engineers can reason about lines, routes, units, and quality without proprietary abstractions. Smart features operate at ISA-95 Level 3 through the same tool contracts as human users.',
    keyFacts: [
      'Physical assets map to `lines`, `workstations`, and `machines`.',
      'Product and process definitions map to `part_numbers`, `bom_entries`, `routes`, and `route_steps`.',
      'Execution state maps to `units` and `unit_history`.',
      'Quality events map to `quality_events` and `defect_codes`.',
    ],
    miniFaq: [
      {
        question: 'Does MESkit replace ISA-95?',
        answer: 'No. MESkit implements ISA-95-aligned concepts in a developer-friendly stack.',
      },
      {
        question: 'At which level do smart features operate?',
        answer: 'Level 3, the same coordination layer as human operators and supervisors.',
      },
    ],
    sections: [
      {
        heading: 'The hierarchy in code terms',
        paragraphs: [
          'ISA-95 defines how enterprise systems and shop floor operations connect. For developers, the value comes from predictable boundaries: what is physical, what is process, and what is execution state.',
          'MESkit encodes those boundaries in relational tables. A route step references a workstation. A unit references a route and part number. Quality events reference both a unit and workstation context.',
          'This structure keeps joins and constraints meaningful, which improves reporting and traceability.',
        ],
      },
      {
        heading: 'Execution traceability by default',
        paragraphs: [
          'In many systems, traceability is bolted on. In MESkit, `unit_history` is foundational. Every movement, pass/fail result, and defect context can be queried as a timeline.',
          'That trace is what powers both dashboard analytics and smart feature reasoning. The Quality Monitor and Planner both depend on it for diagnostics and capacity guidance.',
          'By standardizing this model early, teams can scale from simulation to real deployments without rewriting core data relationships.',
        ],
      },
      {
        heading: 'How to adopt incrementally',
        paragraphs: [
          'You can start with a single line and a simplified route while still preserving ISA-95 structure. This is useful for pilot projects or developer onboarding.',
          'As complexity grows, add multi-line routing, richer defect taxonomies, and device data ingestion through MQTT. The model already leaves room for this path.',
          'If your team is evaluating MES options, ask for explicit ISA-95 term mapping tables. If a product cannot provide one, integration debt often appears later.',
        ],
      },
    ],
  },
  {
    slug: 'from-simulation-to-mqtt-same-tools-different-transport',
    title: 'From simulation to MQTT: same tools, different transport',
    excerpt:
      'How MESkit transitions from simulated execution to device-fed events without rewriting business logic.',
    category: 'MQTT',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: ['MES MQTT integration', 'manufacturing simulation MQTT', 'MQTT edge function'],
    summary:
      'MESkit separates transport from operations. Simulation and MQTT both feed the same tool layer contracts, so production logic stays stable while input channels evolve.',
    keyFacts: [
      'MQTT interface is scheduled for milestone M6.',
      'Topic convention follows `meskit/{line_id}/{workstation_id}/{event_type}`.',
      'Edge functions validate and bridge MQTT payloads into Postgres.',
      'Machine Health Monitor extends event-driven analysis for sensor streams.',
    ],
    miniFaq: [
      {
        question: 'Do we need to rewrite tools for MQTT?',
        answer:
          'No. MQTT ingestion writes into the same operational model and reuses existing tool-driven workflows.',
      },
      {
        question: 'Can we test before hardware integration?',
        answer:
          'Yes. MESkit starts simulation-first and includes a virtual device model in the M6 path.',
      },
    ],
    sections: [
      {
        heading: 'Why transport decoupling matters',
        paragraphs: [
          'Many manufacturing pilots fail when moving from simulated events to live machine streams. The failure point is often hidden coupling between event transport and business logic.',
          'MESkit avoids this by treating transport as an outer layer. Whether an event originates from simulation controls or an MQTT broker, the mutation path still runs through validated MES tools.',
          'This reduces rework and keeps behavior predictable during rollout.',
        ],
      },
      {
        heading: 'MQTT message contract',
        paragraphs: [
          'The planned message schema includes timestamp, machine ID, event type, and payload. Topics encode line and workstation context for routing and subscription control.',
          'A Supabase Edge Function acts as the gateway: subscribe, validate, persist, and trigger downstream operations. Invalid payloads are rejected early and logged for diagnosis.',
          'The key outcome is continuity: simulation and device-driven execution feed the same monitoring and reporting surfaces.',
        ],
      },
      {
        heading: 'Operational rollout path',
        paragraphs: [
          'Teams can start by validating line flow and quality thresholds in simulation, then progressively mirror selected machines via MQTT topics.',
          'During mixed-mode operation, the planner and quality monitor continue to reason over one normalized execution history, not fragmented data streams.',
          'When M6 lands, the transport changes. The core tools, schema, and operator workflows remain consistent.',
        ],
      },
    ],
  },
  {
    slug: 'meskit-brain-of-the-factory',
    title: 'MESkit: Brain of the Factory — What Is MES Software and Why It Needs a Universal Tool Layer',
    excerpt:
      'A plain-language explainer of manufacturing execution systems, how MESkit turns every MES operation into a shared tool, and why that matters for human-AI collaboration on the factory floor.',
    category: 'MES architecture',
    author: 'MESkit Team',
    publishedAt: '2026-03-05',
    updatedAt: '2026-03-05',
    keywords: [
      'what is MES software',
      'manufacturing execution system open source',
      'AI factory software',
      'universal tool layer MES',
      'MES air traffic control',
      'human AI manufacturing',
      'MESkit architecture',
      'ISA-95 open source',
    ],
    summary:
      'A manufacturing execution system (MES) is the air-traffic-control software that tracks every product, machine, and operator across the factory floor. MESkit is an open-source MES toolkit built on ISA-95 that wraps every operation in a typed, validated tool — so humans clicking buttons and natural language commands execute the exact same business logic through one secure front door.',
    keyFacts: [
      'An MES tracks every product from raw material to finished good across the factory floor.',
      'MESkit is open-source, ISA-95 aligned, and self-hostable.',
      'The universal tool layer ensures humans and natural language commands call the same validated code.',
      'Every tool follows a four-step process: register, find, validate with Zod, then execute.',
      'ISA-95 support covers discrete, batch, and continuous manufacturing in one unified data model.',
      'Stack: Next.js frontend, Supabase backend (Postgres + Realtime), built-in smart features.',
    ],
    miniFaq: [
      {
        question: 'What is an MES in simple terms?',
        answer:
          'A manufacturing execution system (MES) is software that acts as air traffic control for a factory — it guides every product from start to finish, tracks machines and operators, and keeps production lines running on time.',
      },
      {
        question: 'What makes MESkit different from traditional MES software?',
        answer:
          'MESkit is open-source and built on the ISA-95 standard. Its universal tool layer means natural language commands and human operators share the same validated operations — there is no separate API or backdoor.',
      },
      {
        question: 'Who is MESkit designed for?',
        answer:
          'Three groups: manufacturing engineers learning MES concepts, smaller shops that need a powerful alternative to expensive enterprise systems, and developers building custom manufacturing applications.',
      },
      {
        question: 'What is the universal tool layer?',
        answer:
          'The tool layer wraps every MES operation — creating a line, moving a part, updating a machine — into a typed, schema-validated function. Both the UI and the natural language interface call the same tool, ensuring identical validation, audit trails, and business logic.',
      },
      {
        question: 'Does the natural language interface have special access that humans do not?',
        answer:
          'No. There is no separate API, no backdoor, and no special privileges. Natural language commands use the exact same secure, validated entry point as every human user.',
      },
    ],
    sections: [
      {
        heading: 'What is a manufacturing execution system?',
        paragraphs: [
          'A manufacturing execution system (MES) is the software that orchestrates everything happening on a factory floor — tracking every item, monitoring every machine, coordinating every operator, and keeping production lines moving without collisions or downtime. Think of it as air traffic control for production: it guides every product and lot from takeoff to landing, making sure nothing collides and everything arrives on time.',
          'The scale of the problem an MES solves is staggering. A single factory contains countless machines, tons of raw materials, and hundreds of operators in a constant whirlwind of activity. Without an MES, tracking individual items, maintaining quality, and preventing line stoppages becomes nearly impossible. The MES is the central nervous system that holds it all together.',
          'Traditional MES products are expensive, proprietary, and rigid. MESkit offers a modern, open-source alternative — one that speaks the same language as enterprise systems thanks to its ISA-95 foundation, while being flexible enough for small shops to self-host and developers to extend.',
        ],
      },
      {
        heading: 'Who is MESkit built for?',
        paragraphs: [
          'MESkit serves three distinct audiences. For manufacturing engineers, it is an accessible sandbox to learn the core concepts behind MES software without enterprise license costs. For smaller shops, it is a self-hosted alternative to expensive proprietary systems — install it on your own servers and own your data. For developers, it is a launch pad for building custom manufacturing applications on a proven data model.',
          'This flexibility is possible because MESkit is built on the ISA-95 standard, the universal translator for manufacturing software. ISA-95 defines how the factory floor and the business office talk to each other. By following this standard, MESkit speaks the same language as the biggest enterprise systems while remaining open and extensible.',
          'ISA-95 breaks production into three main types: discrete manufacturing for countable items like smartphones, batch production for mixed materials like paint or medicine, and continuous production for non-stop flows like chemicals or paper. MESkit\'s data model handles all three through one unified schema.',
        ],
      },
      {
        heading: 'How is MESkit architected?',
        paragraphs: [
          'MESkit follows a clean three-layer architecture. The frontend is the user interface that operators see and interact with, built with Next.js. The backend is the brain of the operation, powered by Supabase — which provides a Postgres database ideal for structured ISA-95 data, real-time subscriptions so every screen updates instantly when state changes, built-in authentication, and edge functions for on-demand logic. The planned device layer will connect to real-world sensors and machines via MQTT.',
          'Supabase was chosen deliberately. Postgres handles the highly structured, relational data that ISA-95 demands. The real-time feature means when a part moves on the factory floor, every operator\'s screen updates instantly — no manual refresh needed. Authentication and edge functions come built in, making the entire stack efficient to develop and deploy.',
          'But the real innovation is not in the stack choices — it is in the layer that sits between the frontend, the smart features, and the database. That layer is the universal tool layer.',
        ],
      },
      {
        heading: 'What is the universal tool layer?',
        paragraphs: [
          'The universal tool layer is MESkit\'s core architectural innovation. It takes every possible MES action — creating a production line, moving a part between stations, updating a machine status, recording a quality event — and wraps each one into a self-contained, typed, validated function called a tool. The critical insight: it does not matter whether a human clicks a button or types a natural language command. Both call the exact same tool through the exact same secure entry point.',
          'Every tool follows a strict four-step execution process. First, all tools are registered in a central registry. Second, when an action is triggered, the system locates the correct tool. Third — and this is the critical safety gate — inputs are validated using Zod, a schema validation library that acts as a bouncer checking every piece of data before it enters. If the data fails validation, the action is rejected. Only after validation passes does the tool\'s code actually execute against the database.',
          'Consider the Create Line tool as a concrete example. Its input schema requires a name (string) and optionally accepts a description. Its output is the newly created line object. The contract is simple, self-documenting, and completely unambiguous — whether you are a human developer reading the code or MESkit discovering available tools at runtime.',
        ],
      },
      {
        heading: 'Why does tool-centric architecture matter beyond the factory?',
        paragraphs: [
          'The universal tool layer delivers three concrete benefits. First, unified execution: one codebase serves both human and natural language interfaces, which drastically reduces code duplication and maintenance burden. Second, type safety doubles as live documentation — the system can discover available tools and receive a perfect, always-current list with validated schemas. That is automatic discoverability. Third, because every action routes through the central tool layer, audit logging is trivial — you know exactly who or what did what, and when.',
          'This pattern points toward a broader shift in software design. By creating a common, secure, and discoverable language for both humans and automation to execute operations, tool-centric architecture may become a blueprint for how we build all complex software — not just manufacturing systems. When natural language does not need a separate API or special backdoor, and when every action is validated and auditable regardless of who initiated it, the result is safer, more maintainable, and more transparent systems.',
          'MESkit demonstrates that the right abstraction is not "smart features bolted onto existing software" but rather a shared operational interface where clicks and conversation are peers. The same button click, the same voice command, the same guardrails. One front door for everyone.',
        ],
      },
    ],
  },
  {
    slug: 'm3-configure-mode-release-notes',
    title: 'M3 Release Notes: Configure Mode — Define Products, BOMs, Routes, and Serial Algorithms',
    excerpt:
      'MESkit M3 ships Configure Mode: full product definition through UI or natural language, with 15 new tools, a three-panel editor, and live cross-tab updates.',
    category: 'Release notes',
    author: 'MESkit Team',
    publishedAt: '2026-03-06',
    updatedAt: '2026-03-06',
    keywords: [
      'MESkit release notes',
      'Configure Mode MES',
      'product definition MES',
      'bill of materials software',
      'manufacturing route designer',
      'serial number algorithm',
      'AI MES product setup',
    ],
    summary:
      'Milestone 3 adds Configure Mode to MESkit — the product and process definition layer. Users can create part numbers, assemble bills of materials, configure serial number algorithms, and design multi-step manufacturing routes. All operations work through both the UI and Ask MESkit via natural language. 15 new tools power the feature, and Supabase Realtime keeps every browser tab in sync.',
    keyFacts: [
      '15 new tools implemented: part numbers, items, BOM entries, routes, route steps, and serial algorithms.',
      'Three-panel Configure Mode UI: part number list, product detail (BOM + serial config), and route designer.',
      'Ask MESkit now handles all Configure Mode operations via chat.',
      'Context injection includes selected part number and route.',
      'Supabase Realtime subscriptions keep Configure Mode live across browser tabs.',
      'Route steps validate against workstations created in Build Mode.',
    ],
    miniFaq: [
      {
        question: 'Can I define a product entirely through chat?',
        answer:
          'Yes. Ask MESkit can create part numbers, add BOM entries, configure serial algorithms, and design routes with steps — all through natural language commands.',
      },
      {
        question: 'What happens if I mix UI and chat?',
        answer:
          'Both interfaces call the same tool layer. You can create a part number in the UI and add its route via chat, or vice versa. Changes from either source appear instantly in both.',
      },
      {
        question: 'Do route steps require existing workstations?',
        answer:
          'Yes. The route step editor presents a dropdown of workstations from Build Mode. The database enforces this with a foreign key constraint.',
      },
    ],
    sections: [
      {
        heading: 'What shipped in M3',
        paragraphs: [
          'Configure Mode is the second functional mode in MESkit, following Build Mode (M2). Where Build Mode handles the physical shop floor — lines, workstations, and machines — Configure Mode handles the product and process layer: what you manufacture, what it is made of, how units are serialized, and which path they follow through the shop floor.',
          'The milestone delivers a complete product definition workflow. Users create part numbers (product definitions), attach bills of materials with items and quantities, configure serial number algorithms with prefix and padding, and design manufacturing routes with ordered steps assigned to workstations. Each step can optionally be a pass/fail quality gate.',
          'Every operation is available through both the three-panel UI and the Ask MESkit chat interface. The same 15 typed tools serve both paths, maintaining the unified architecture established in M1.',
        ],
      },
      {
        heading: 'The tool layer: 15 new operations',
        paragraphs: [
          'M3 adds 15 tools to the MESkit tool layer, replacing the stubs created during the M1 scaffold. The tools cover five entity types: part numbers (list, create, update, delete), items (list, create), BOM entries (get, set as upsert, delete), routes (list, create, update, delete), and serial algorithms (configure as upsert, get).',
          'Each tool follows the established pattern: a Zod schema for input validation, an async execute function against Supabase, and registration in the central tool registry. Ask MESkit has access to all 15 tools, and context injection now includes the selected part number and route so it can scope its actions.',
          'Route creation handles the multi-table insert (route + steps) with cleanup on failure — if step insertion fails, the orphaned route is deleted. Serial algorithm configuration uses an upsert pattern since it has a 1:1 relationship with part numbers. BOM entry setting checks for existing entries on the same part number and item combination, updating quantity and position rather than creating duplicates.',
        ],
      },
      {
        heading: 'Configure Mode UI',
        paragraphs: [
          'The UI follows the same three-panel layout established in Build Mode. The left panel lists part numbers with inline rename and delete. The center panel shows the selected product\'s detail: a BOM section where users add items from a dropdown (or create new items inline) with quantities, and a serial algorithm section with prefix, digit count, and a live preview of the generated format.',
          'The right panel is the route designer. Users create named routes, then expand them to add, reorder, or remove steps. Each step is assigned to a workstation via a dropdown populated from Build Mode, and has a pass/fail gate toggle shown as a shield icon. Steps can be reordered with up/down controls, and step counts are shown next to each route name.',
          'All UI operations go through server actions that wrap the tool layer — the UI never calls Supabase directly. This preserves the four-layer architecture and ensures audit logging is consistent across all actions.',
        ],
      },
      {
        heading: 'Realtime and cross-mode awareness',
        paragraphs: [
          'Configure Mode tables — part numbers, items, BOM entries, routes, route steps, and serial algorithms — are now published to Supabase Realtime. The UI subscribes to change events on all six tables, with debounced reloading to avoid rapid re-fetches during batch operations like route step reordering.',
          'Cross-mode selection cleanup ensures a clean context when switching between Build and Configure modes. Entering Build Mode clears any selected part number and route. Entering Configure Mode clears any selected line and workstation. This prevents stale context from leaking into agent prompts.',
          'The milestone badge in the top bar now shows M3, reflecting the current development state.',
        ],
      },
      {
        heading: 'What comes next: M4 Run Mode',
        paragraphs: [
          'With the physical shop floor (M2) and product definitions (M3) in place, M4 will bring Run Mode — production execution. Users will generate units from part numbers, move them through routes, encounter pass/fail quality gates, and track everything in real time.',
          'M4 also introduces the Quality Monitor, an event-driven feature that watches production in real time and alerts operators when yield drops or defect patterns emerge. The production simulator will let users auto-run production at configurable speeds.',
          'The foundation is set: the tools, schema, and architecture from M1 through M3 carry forward unchanged. M4 adds execution state on top of the definitions created in Configure Mode.',
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
