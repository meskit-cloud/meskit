# MESkit Product Principles

- Status: Draft v1
- Last updated: 2026-03-08
- Purpose: This document defines the product truths that should outlive individual milestones, PRDs, launches, and pricing experiments. If the PRD explains what MESkit is building, this document explains what MESkit must remain.

## Related Docs

- [Documentation Map](docs/DOCUMENTATION_MAP.md) — overview of the core doc set
- [README](README.md) — high-level public product summary
- [PRD](MESKIT_PRD.md) — product strategy and specification derived from these principles
- [Roadmap](ROADMAP.md) — milestone execution that should remain consistent with these principles
- [Licensing and Growth Strategy](LICENSING_AND_GROWTH_STRATEGY.md) — business strategy that should not violate these product constraints
- [Target Audience](docs/GTM_Target_Audience.md) — concrete ICP definition for the buyer described here

## 1. Product Thesis

MESkit exists to give small manufacturers a real MES before they are ready for enterprise software.

The product starts where these shops actually are: spreadsheets, whiteboards, tribal knowledge, manual floor walks, and reactive quality management. MESkit should help them move from "I do not know what is happening on my floor" to "I can see, trace, and improve production from one system" without forcing an enterprise implementation project.

The long-term promise is simple:

> MESkit helps small manufacturing teams see problems before they stop the line, answer operational questions in seconds, and grow from basic visibility to full traceability and compliance without switching systems.

This implies three durable truths:

1. MESkit is a manufacturing system first, not an AI wrapper.
2. MESkit is designed for operators and supervisors with limited time, not software consultants.
3. MESkit must grow with the shop from early execution needs to later traceability and compliance needs.

## 2. Who MESkit Is For

### Primary user and buyer

The primary buyer is the ops manager, production lead, or owner at a small contract manufacturer with roughly 10 to 100 employees.

This person usually:
- Is replacing spreadsheets, whiteboards, or informal processes.
- Does not have a dedicated MES admin or internal IT team.
- Needs fast answers about WIP, quality, and delivery risk.
- Can make a software decision without a long procurement cycle.
- Feels external pressure from customers before they feel internal excitement about software.

Their language is practical, not abstract:
- "Where are my units?"
- "Are we going to hit the deadline?"
- "Why does Station 3 keep failing?"
- "What happened to lot 4472?"
- "Can I show this to the customer or auditor?"

### Secondary users

- Floor supervisors and operators who need simple, low-training workflows.
- Developers and integrators who self-host MESkit or deploy it for clients.

### Non-targets for now

- Large enterprise manufacturers with long procurement, heavy IT requirements, and custom integration projects as the entry point.
- Teams that want a generic AI manufacturing demo more than a real execution system.
- Highly regulated categories that require deep validation and compliance overhead before a small-shop wedge exists.

## 3. Core User Job

The core user job is not "use an MES."

It is:

> Help me understand what is happening in production, act on it quickly, and produce records I can trust when a customer, auditor, or regulator asks questions.

Everything MESkit ships should strengthen at least one of these outcomes:
- Visibility: know what is happening now.
- Control: take the next correct action quickly.
- Traceability: reconstruct what happened later.
- Readiness: meet the next level of customer or regulatory pressure without replacing the system.

## 4. Immutable Product Principles

These principles should be treated as product constraints, not preferences.

### 4.1 Target spreadsheets, not SAP

MESkit wins by serving shops that have outgrown informal tools but cannot absorb enterprise MES complexity.

Implication:
- Favor fast setup, self-serve onboarding, and obvious value over breadth aimed at enterprise buyers.

### 4.2 Be a real system of record

MESkit is not allowed to be a thin chat layer, dashboard shell, or workflow mockup. It must create durable operational records for production, quality, and traceability.

Implication:
- Features that only "look smart" but do not improve the underlying system of record are lower priority.

### 4.3 Operators stay in command

MESkit can recommend, summarize, detect, and automate coordination, but it must not remove human accountability for production decisions.

Implication:
- Smart features operate with explicit tools, validation, and auditability.
- Avoid product framing that implies autonomous plant control.

### 4.4 One operational contract

The same core MES operations should power UI workflows, natural-language workflows, automations, and external integrations.

Implication:
- New capabilities should be implemented through the shared tool layer and produce the same audit trail regardless of interface.

### 4.5 Simulation before hardware

MESkit should prove value before a customer connects real devices, brokers, or factory infrastructure.

Implication:
- The simulator is not demo fluff. It is the primary path to fast activation, onboarding, testing, and learning.
- The right promise is "start without hardware, connect when ready," not "hardware does not matter."

### 4.6 Standards over proprietary abstractions

MESkit should use manufacturing language and models that travel well: ISA-95 for operations, clear event history, and interoperable interfaces.

Implication:
- Prefer durable manufacturing concepts over clever internal abstractions that only make sense inside MESkit.

### 4.7 Natural language is an interface, not the product

Plain-English interaction is a major adoption advantage, but the product is still the MES.

Implication:
- Chat should reduce friction for real workflows, not compensate for missing operational foundations.

### 4.8 Grow with the shop

MESkit must support the same buyer across three stages:
- Stage 1: visibility and execution.
- Stage 2: traceability and quality accountability.
- Stage 3: compliance, carbon, and external reporting pressure.

Implication:
- Advanced capabilities should feel like a natural extension of the same system, not a separate product line.

### 4.9 Every important action should become traceable history

If a production event matters operationally, it should be reconstructable later.

Implication:
- Prefer designs that create reliable event history over designs that optimize only for surface-level convenience.

### 4.10 Self-serve by default

MESkit should not require a services-heavy sales motion to become useful.

Implication:
- Prioritize setup paths, defaults, documentation, and product ergonomics that work without an integrator in the loop.

### 4.11 Lead with manufacturer outcomes, not AI terminology

MESkit should describe itself in the language manufacturers already use: production visibility, quality alerts, planning, traceability, and plain-English answers.

Implication:
- Buyer-facing surfaces should not lead with terms like "AI-native," "agent," "LLM," or model-provider names.
- Internal architecture terms can remain in developer-facing documentation when they are useful and accurate.

## 5. Product Strategy Implications

These principles imply a clear shape for the roadmap.

### 5.1 Build the execution spine first

Build, Configure, Run, and Monitor are not separate product islands. Together they form the minimum operational backbone. Predictive and compliance features only matter if the execution backbone is credible.

Roadmap consequence:
- Prefer end-to-end execution loops over isolated feature surfaces.

### 5.2 Prioritize time-to-value aggressively

A small shop should be able to understand MESkit quickly and experience a running system without implementation drag.

Roadmap consequence:
- Onboarding, simulator flows, demo environments, and sensible defaults are strategic features, not polish.

### 5.3 Ship features that remove coordination burden

MESkit should reduce the amount of manual chasing, asking, reconstructing, and cross-checking required to run production.

Roadmap consequence:
- Favor alerts, summaries, traceability views, planner outputs, and natural-language actions that collapse multi-step coordination work.

### 5.4 Earn the right to add intelligence

Planning, anomaly detection, and quality automation only work if the underlying production and quality signals are trustworthy.

Roadmap consequence:
- Data capture and operational correctness come before more advanced smart features.

### 5.5 Compliance should emerge from core operations, not a separate silo

Traceability, carbon accounting, and audit readiness should build on the same production history that powers daily operations.

Roadmap consequence:
- Avoid creating parallel systems for "compliance data" that are detached from execution reality.

### 5.6 Present value in buyer order

MESkit should introduce itself in the order a small manufacturer feels pain, not in the order the architecture feels novel.

Roadmap consequence:
- Lead with production visibility and dashboards, then quality alerts and traceability, then planning, then natural-language interaction, then simulator and connected-device depth.
- Advanced technical language belongs below the fold or in developer surfaces.

## 6. What MESkit Should Not Become

MESkit should not drift into:

- A generic chatbot for manufacturing without deterministic operational actions.
- An enterprise-service product whose success depends on custom implementation work.
- A dashboard-only analytics layer with weak execution and traceability foundations.
- A developer toy optimized for architecture admiration but not operator adoption.
- A feature pile that serves many factory types poorly instead of a clear small-manufacturer wedge well.

## 7. PRD Guardrails

Every meaningful PRD or feature brief should answer these questions explicitly.

### 7.1 User and trigger

- Which target user is this for?
- What trigger causes them to care now?
- Which stage does it serve: visibility, traceability, or compliance?

### 7.2 Operational outcome

- What faster, safer, or more reliable action becomes possible?
- What question can the user answer after this exists that they could not answer before?

### 7.3 System integrity

- Does this strengthen the system of record?
- Does it route through the shared operational contract?
- Does it preserve auditability and operator control?

### 7.4 Adoption cost

- Can a small team use this without training overhead or services?
- Does it improve time-to-value or make the product harder to adopt?

### 7.5 Roadmap fit

- Is this a prerequisite for later roadmap layers?
- Or is it a branch feature that adds surface area without deepening the core?

### 7.6 Communication discipline

- Is this written in manufacturer language before technical language?
- Are internal architecture terms clearly separated from buyer-facing terms?
- Does the narrative lead with outcomes like tracking production, preventing problems, and getting answers quickly?

If a PRD cannot answer these cleanly, it is probably not ready.

## 8. Prioritization Rules

When roadmap tradeoffs are hard, use these tie-breakers in order:

1. Protect fit for the primary small-manufacturer user.
2. Preserve operator control and auditability.
3. Strengthen the shared execution layer instead of creating one-off paths.
4. Reduce time-to-value and setup burden.
5. Prefer features that compound into later traceability or compliance advantages.
6. Delay feature breadth that mainly serves enterprise edge cases.

## 9. Success Measures

MESkit should be judged by whether it becomes useful, trusted, and harder to replace over time.

### Leading indicators

- Time to first value: how quickly a new user sees meaningful production flow.
- Time to answer: how quickly a user can answer common floor questions.
- Activation depth: whether a user progresses from setup to execution to monitoring.
- Shared-operation coverage: whether important actions are available through the same core tool layer across interfaces.

### Outcome indicators

- Repeat operational use, not just initial exploration.
- Growth from visibility workflows into traceability and quality workflows.
- Trust in audit history and production records.
- Expansion into higher-stakes use cases without system replacement.

## 10. Product Decision Checklist

Before shipping a roadmap item, ask:

1. Does this help a small manufacturer replace spreadsheets with a trustworthy operating system?
2. Does it make the MES more real, or just more impressive in a demo?
3. Does it preserve the rule that operators stay in command?
4. Does it work through the same operational contract as the rest of the product?
5. Does it shorten time-to-value or improve a repeated operational job?
6. Does it help MESkit grow with the shop instead of fragmenting into separate products?

If the answer to most of these is no, the feature is likely off-strategy.

## 11. Summary

MESkit should remain a self-serve, simulation-first, standards-aligned MES for small manufacturers upgrading from spreadsheets. Its job is to make production visible, actions faster, history trustworthy, and later compliance attainable from the same system.

That is the bar every roadmap decision, PRD, integration, pricing change, and interface experiment should be measured against.
