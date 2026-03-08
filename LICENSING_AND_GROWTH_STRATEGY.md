# MESkit Licensing and Growth Strategy

- Status: Draft v1
- Last updated: 2026-03-08
- Purpose: Recommend a licensing, packaging, and go-to-market strategy for MESkit that protects the business while keeping growth self-serve.
- Note: This is product and business strategy guidance, not legal advice.

## Related Docs

- [Documentation Map](docs/DOCUMENTATION_MAP.md) — overview of the core doc system
- [README](README.md) — public product summary
- [Product Principles](PRODUCT_PRINCIPLES.md) — product constraints this strategy should support
- [PRD](MESKIT_PRD.md) — product strategy, pricing logic, and buyer journey
- [Roadmap](ROADMAP.md) — milestone sequencing and post-v1 tracks affected by growth strategy
- [Target Audience](docs/GTM_Target_Audience.md) — ICP that this PLG strategy is built around
- [Manufacturing Software Stack](docs/MANUFACTURING_SOFTWARE_STACK.md) — onboarding integrations required to make the self-serve strategy work
- [Licensing](LICENSING.md) and [License](LICENSE) — current plain-English and legal licensing terms

## 1. Executive Recommendation

MESkit should not stay 100% OSI open source if the business goal is:

- allow manufacturers to self-host for their own internal use
- avoid founder-led sales as the main go-to-market motion
- prevent another company from turning MESkit into a hosted or white-label commercial offering without your agreement

The cleanest strategy is:

1. Keep the core MES product source-available, not OSI open source.
2. Allow free internal self-hosting for manufacturers and internal business users.
3. Allow consultants and integrators to deploy and customize MESkit for a client's internal use.
4. Require a commercial agreement for hosted resale, OEM embedding, white-labeling, and multi-tenant third-party offerings.
5. Keep the company self-serve for the main path: simulator -> signup -> cloud or self-host.
6. Open more of the ecosystem than the core: SDKs, schemas, sample integrations, templates, and docs can stay permissive to maximize adoption.

This is the best fit for MESkit's market position: small manufacturers, low-friction adoption, no traditional sales team, and a need to avoid being commoditized by a better-capitalized hosted clone.

## 2. Why 100% Open Source Is the Wrong Fit for This Business

If MESkit remains under a true open-source license, you cannot stop another company from:

- offering MESkit as a hosted service
- bundling it into their own commercial platform
- white-labeling it
- building a services business where MESkit is the product they sell

That may be acceptable for a company whose moat is already strong. It is usually not a good early-stage choice when:

- the product category is still forming
- the hosted experience may become the easiest way to make money
- the founder does not want a heavy direct-sales motion
- the product still needs time to build data gravity, templates, and brand trust

The real issue is not ideology. It is timing. MESkit does not yet have enough adoption moat to give away commercial hosting rights for free.

## 3. The Best Sweet Spot

The practical sweet spot is:

### Core policy

- Free to read, fork, modify, and self-host for internal use.
- Free for a manufacturer to run MESkit in its own factory.
- Free for a consultant to install or customize MESkit for that manufacturer's internal use.
- Not free to sell MESkit as a product or service to third parties without permission.

### Why this works

- Manufacturers get low-friction adoption.
- GitHub users can still inspect the code, trust the architecture, and try the product.
- Integrators can still become a channel instead of being blocked.
- You preserve the highest-value monetization right: commercial distribution.

## 4. Recommended License Model

### 4.1 Recommendation

Use a source-available license for the core product.

For MESkit specifically, the best practical choice is:

- `Business Source License 1.1` for the core repo
- a clear `Additional Use Grant` that allows internal production use and self-hosting
- a `Change Date` 4 years out with `Apache License 2.0` as the change license
- a plain-English `LICENSING.md` that explicitly allows internal customer deployments by consultants
- a commercial license path for hosted/OEM/reseller use

This fits your current intent and is easier to explain than inventing a custom legal framework.

### 4.2 Why BSL 1.1 over pure open source

BSL gives you:

- public source code from day one
- internal and self-host use through the Additional Use Grant
- the ability to reserve commercial hosted rights
- a standard template with existing market familiarity
- an eventual change to an open-source license later

The main downside is that you must stop calling the protected core simply "open source." It is more accurate to say:

- `source-available`
- `free to self-host for internal use`
- `commercial license required for hosted or resale use`

### 4.3 Alternative if you want even clearer "internal use" language

An n8n-style fair-code model is also a strong fit. Their public docs are unusually clear about:

- internal business use being allowed
- consulting/support being allowed
- hosting/white-labeling for money being disallowed without a separate agreement

MESkit can borrow that clarity even if you stay on BSL.

## 5. What to Keep Open

If you protect the core, you should still open the parts that drive adoption.

Recommended permissive/open pieces:

- API clients and SDKs
- sample connectors
- simulator scenarios and demo datasets
- schemas and type definitions
- documentation content
- integration examples
- community templates

Why:

- these assets increase distribution
- they make MESkit easier to adopt
- they create ecosystem lock-in without giving away the hosted business

The core MES application, cloud product, and monetizable admin/platform features should remain under the protected core license.

## 6. Packaging Recommendation

MESkit should package around the user's stage of pain, not around seats or generic feature bundles.

### 6.1 Self-host Community

- Price: free
- License: source-available, internal-use only
- Audience: manufacturers evaluating MESkit, developers, integrators, cost-sensitive teams
- Goal: adoption, trust, community distribution, template creation

Included:

- full simulator
- build/configure/run/monitor core
- natural-language interface
- docs and setup guides

Not included by default:

- rights to offer MESkit as SaaS
- rights to white-label or OEM it

### 6.2 Cloud Starter

- Audience: spreadsheet replacement buyers
- Goal: self-serve conversion
- Motion: no call required

Positioning:

- start without hardware
- run a demo quickly
- move from spreadsheet pain to real production visibility

### 6.3 Cloud Pro

- Audience: teams under customer quality and traceability pressure
- Goal: expansion through operational need

### 6.4 Cloud Enterprise

- Audience: suppliers facing OEM, compliance, and sustainability pressure
- Goal: monetize higher-stakes use cases

### 6.5 Commercial License

- Audience: hosted providers, OEMs, white-label partners, embedded use cases
- Goal: reserve the monetizable distribution right
- Motion: inbound only, higher-touch, but not the main growth engine

This is the one place where a manual deal is worth it, because the economics are better and the lead volume should stay low.

## 7. Partner Policy Recommendation

Do not block partners too aggressively. That would hurt growth.

Recommended policy:

Allowed without a special commercial agreement:

- consulting
- implementation
- migration work
- custom configuration
- internal deployment for a single manufacturer's own use
- support and maintenance for that internal deployment

Requires a commercial agreement:

- hosted service for multiple customers
- white-labeled MESkit offering
- OEM embedding
- bundled resale where MESkit is a meaningful part of what is being sold
- any "MESkit-as-a-service" business

This gives you a channel without giving away your company.

## 8. Messaging Strategy

If you adopt the protected-core path, buyer-facing copy needs to change.

### 8.1 What to say

- `Source-available MES`
- `Free to self-host for internal use`
- `Commercial license required for hosted or resale use`
- `Start without hardware, connect when ready`

### 8.2 What to stop saying

- `MIT`
- `fully open source` for the protected core
- vague statements that imply unrestricted commercial reuse

### 8.3 How to preserve search demand

You can still capture open-source search intent without making a false license claim.

Use:

- comparison pages like `MESkit vs open-source MES alternatives`
- educational pages like `How to choose open-source or source-available MES software`
- FAQ language that explains the distinction directly

The category search demand is still useful. The claim just needs to be accurate.

## 9. Growth Strategy Without Founder-Led Sales

MESkit should behave like a product-led company with a partner-assisted edge, not a sales-led company.

### 9.1 Primary growth loop

1. User discovers MESkit through content, GitHub, or a comparison page.
2. User tries the simulator with minimal friction.
3. User sees a working factory flow in minutes.
4. User signs up for cloud or self-hosts.
5. User configures their real shop.
6. Production history, routes, and quality data accumulate.
7. MESkit becomes harder to replace.
8. User upgrades when traceability, planning, or compliance pressure appears.

### 9.2 What the product must do to make this work

- simulator accessible immediately
- very fast onboarding
- obvious first-run success
- templates by manufacturing type
- strong docs for self-host and cloud
- clear pricing
- visible upgrade path
- clear explanation of what is allowed under the license

### 9.3 Best acquisition channels for MESkit

Priority order:

1. SEO content for buyer pain
2. GitHub and developer trust
3. product demos and short videos
4. integrators and consultants
5. communities where engineers and small manufacturers look for tools

Least attractive right now:

- classic outbound sales
- enterprise procurement motions
- heavy paid acquisition before simulator conversion is tuned

## 10. Concrete 90-Day Plan

### Days 1-14: Fix the foundation

1. Finalize the license and plain-English licensing page.
2. Remove conflicting `MIT` and unrestricted `open source` claims from the repo and website copy.
3. Publish a `/licensing` page on the website.
4. Add a short `Can I use MESkit for my factory?` FAQ.
5. Add a short `Can I offer MESkit as a service?` FAQ.

Success criteria:

- no contradictory license messaging
- a manufacturer can understand usage rights in under 60 seconds

### Days 15-45: Build the self-serve engine

1. Make `Try the Simulator` the dominant CTA everywhere.
2. Add one-click demo templates for:
   - PCB assembly
   - CNC job shop
   - 3D print farm
3. Publish the pricing page with stage-based packaging.
4. Publish the first three buyer-intent content pieces:
   - `MES for small manufacturers`
   - `How to track lot traceability without enterprise software`
   - `What to look for in a production tracking system`
5. Add simple signup analytics:
   - visitor -> simulator
   - simulator -> signup
   - signup -> first configured line

Success criteria:

- improved simulator-to-signup conversion
- measurable first-run activation funnel

### Days 46-90: Add a channel without adding sales

1. Publish a partner page:
   - who MESkit is for
   - what partners are allowed to do
   - when a commercial agreement is required
2. Create a partner intake form for hosted/OEM/integrator inquiries.
3. Publish a `Deploy MESkit for clients` guide for internal-use deployments.
4. Launch 2 to 4 community templates.
5. Publish 2 comparison pages and 1 implementation tutorial.

Success criteria:

- first inbound partner conversations
- first repeatable self-host referrals
- growing organic traffic to high-intent pages

## 11. Metrics That Matter

Ignore vanity metrics at first. Track:

- simulator launches
- simulator-to-signup conversion
- signup-to-first-value conversion
- self-host doc visits
- cloud trial starts
- number of configured factories
- number of partner/integrator inbound leads
- number of users who reach traceability or quality-monitor workflows

The goal is not raw GitHub stars. The goal is activated factories and repeatable self-serve conversion.

## 12. Risks and How to Handle Them

### Risk 1: Trust drops if "open source" is removed

Mitigation:

- keep the source public
- explain the license simply
- keep ecosystem pieces permissive where possible
- emphasize "free internal self-hosting"

### Risk 2: The license blocks helpful partners

Mitigation:

- explicitly allow internal client deployments and support work
- block only hosted resale and productized third-party commercialization

### Risk 3: The company becomes too dependent on cloud revenue

Mitigation:

- preserve commercial-license revenue for OEM/hosted use
- let partners create inbound demand
- keep upgrade path strong from Starter to Pro to Enterprise

### Risk 4: Messaging becomes muddled

Mitigation:

- maintain a strict vocabulary
- separate developer-facing architecture language from buyer-facing outcome language
- keep pricing, licensing, and packaging pages consistent

## 13. Contributor and Relicensing Policy

Because licensing may continue to evolve, MESkit should set contributor expectations early.

Recommended approach:

- add a Contributor License Agreement if you want future relicensing flexibility
- if you do not want CLA overhead, keep external code contributions narrow until the license model settles
- make template, docs, and integration contributions easier than core-platform contributions

Important current note:

- The current git history appears effectively single-author, which makes this the easiest time to set the long-term license direction cleanly.

## 14. Final Recommendation

MESkit should be:

- source-available at the core
- free to self-host for internal use
- partner-friendly for implementation and consulting
- commercial-license required for hosted, OEM, white-label, and resale use
- aggressively self-serve in product and go-to-market

This is the best balance between adoption and defensibility.

If MESkit becomes dominant later, you can revisit how open the core should be. Right now, the priority is to maximize trust and adoption without giving away the most valuable monetization right before the moat exists.

## 15. References

- OSI FAQ: https://opensource.org/faq
- MariaDB BSL 1.1: https://mariadb.com/de/bsl11/
- MariaDB BSL adoption FAQ: https://mariadb.com/bsl-faq-adopting/
- n8n Sustainable Use License docs: https://docs.n8n.io/reference/license/
- n8n deployment/licensing overview: https://docs.n8n.io/choose-n8n/
- PostHog homepage/pricing philosophy: https://posthog.com/
- PostHog self-serve positioning: https://newsletter.posthog.com/p/what-is-posthog
