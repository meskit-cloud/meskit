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
    title: 'What is an AI-native MES?',
    excerpt:
      'A practical definition of AI-native MES, and why shared tool interfaces matter more than chat widgets.',
    category: 'AI agents',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: [
      'AI-native MES',
      'AI manufacturing execution system',
      'MES with AI agents',
      'open source MES',
    ],
    summary:
      'An AI-native MES is built so AI agents and humans execute the same typed manufacturing operations. MESkit uses a shared tool layer, so natural-language commands and UI clicks trigger identical business logic.',
    keyFacts: [
      'AI-native means architecture-level integration, not a chatbot wrapper.',
      'In MESkit, every operation is a typed tool with validation.',
      'Agents and UI both call the same tool layer.',
      'Human oversight remains mandatory for operational decisions.',
    ],
    miniFaq: [
      {
        question: 'Is AI-native the same as AI-enhanced?',
        answer:
          'No. AI-enhanced usually means adding AI on top of an existing stack. AI-native means AI and UI are peers on one tool interface.',
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
          'Most MES products add AI as a sidecar. A sidecar can summarize data, but it usually cannot execute the same trusted operations your operators use. That creates drift between what the UI can do and what the AI can do.',
          'An AI-native MES removes that split. The operation to move a unit, create a quality event, or fetch WIP is defined once. Humans trigger it via UI actions. Agents trigger it via tool-use. The output path is identical and auditable.',
          'This architecture lowers operational risk because there is one source of truth for validation, permission checks, and side effects.',
        ],
      },
      {
        heading: 'The MESkit implementation pattern',
        paragraphs: [
          'MESkit places the tool layer between both clients and persistence. The frontend, Operator Assistant, Quality Analyst, and Production Planner all call typed functions validated with schemas before execution against Supabase.',
          'Because tools are typed and testable, the same function can be used in server actions, agent registrations, and isolated tests. This is how MESkit keeps behavior consistent across Build, Configure, Run, and Monitor workflows.',
          'The result is simple: every button has a voice equivalent, and every voice command has the same guardrails as a button.',
        ],
      },
      {
        heading: 'Boundary conditions and guardrails',
        paragraphs: [
          'AI-native does not imply autonomous control. MESkit agents operate with human oversight and through explicit tool calls. They do not bypass process constraints or invent hidden state transitions.',
          'MVP scope is focused on discrete manufacturing workflows. The schema is ready for batch and continuous types, but those UI experiences are post-MVP.',
          'If you are evaluating AI in manufacturing, ask one question first: are AI actions routed through the same validated operations as UI actions? If not, you are likely looking at an AI-enhanced layer, not an AI-native MES.',
        ],
      },
    ],
  },
  {
    slug: 'how-meskit-agents-call-mes-tools',
    title: 'How MESkit agents call MES tools',
    excerpt:
      'Technical deep dive into tool registration, call chains, and event-driven quality analysis.',
    category: 'MES architecture',
    author: 'MESkit Team',
    publishedAt: '2026-03-03',
    updatedAt: '2026-03-03',
    keywords: ['MES API', 'programmable MES', 'MES tool layer', 'Claude tool-use'],
    summary:
      'MESkit agents are configured with explicit tool definitions that map to the same typed functions used by UI server actions. A user prompt resolves into deterministic tool calls, then writes to Supabase through validated operations.',
    keyFacts: [
      'Tool contracts are typed and validated before execution.',
      'Operator Assistant can call all shop-floor and execution tools.',
      'Quality Analyst is event-driven and threshold-based.',
      'Production Planner is on-demand and analytics-oriented.',
    ],
    miniFaq: [
      {
        question: 'Do agents have a private API?',
        answer: 'No. Agents use the same tool layer as the UI.',
      },
      {
        question: 'Can quality alerts trigger automatically?',
        answer:
          'Yes. The Quality Analyst listens to realtime conditions and runs when thresholds are breached.',
      },
    ],
    sections: [
      {
        heading: 'From intent to function call',
        paragraphs: [
          'When a user writes a command in chat, the runtime forwards structured context: current mode, selected line, and related IDs when available. Claude tool-use then selects from registered tools and emits a call payload.',
          'The runtime executes the selected tool using schema-validated input. If validation fails, the call is rejected with a clear error, and no state mutation occurs.',
          'Once execution completes, the result is returned to the model for final response generation and to the UI for direct rendering in the conversation timeline.',
        ],
      },
      {
        heading: 'Tool chain example: scrap a defective unit',
        paragraphs: [
          'A user asks: scrap SMX-00044 due to solder bridge. The runtime resolves this into a sequence: `search_units` to locate the unit, `create_quality_event` to store defect context, then `scrap_unit` to set terminal state.',
          'Because each call is explicit, the audit trail shows exactly what happened and in which order. This is critical for manufacturing QA workflows and post-incident analysis.',
          'The same operations are available in direct UI actions. The difference is only interface, not business logic.',
        ],
      },
      {
        heading: 'Event-driven analyst flow',
        paragraphs: [
          'Quality Analyst is not prompt-only. It can activate on realtime events when yield drops below threshold, when defect clusters form within a window, or when scrap rates rise unexpectedly.',
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
      'MESkit maps ISA-95 terms directly into a Postgres schema so engineers can reason about lines, routes, units, and quality without proprietary abstractions. Agents operate at ISA-95 Level 3 through the same tool contracts as human users.',
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
        question: 'At which level do agents operate?',
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
          'That trace is what powers both dashboard analytics and agent reasoning. The Quality Analyst and Planner both depend on it for diagnostics and capacity guidance.',
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
      'Anomaly Monitor extends event-driven analysis for sensor streams.',
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
          'During mixed-mode operation, planner and quality agents continue to reason over one normalized execution history, not fragmented data streams.',
          'When M6 lands, the transport changes. The core tools, schema, and operator workflows remain consistent.',
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
