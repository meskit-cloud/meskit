/**
 * Generates public/llms.txt from lib/site.ts config.
 * Run: node scripts/generate-llms-txt.mjs
 * Wired into: npm run build (via prebuild script)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Parse site.ts to extract config values (avoids needing tsx/ts-node)
const siteSource = readFileSync(join(root, 'lib/site.ts'), 'utf-8');

function extract(varName) {
  const regex = new RegExp(`${varName}:\\s*['"](.+?)['"]`);
  const match = siteSource.match(regex);
  return match ? match[1] : '';
}

const url = extract('url');
const description = extract('description');

// Extract coreFacts array
const factsMatch = siteSource.match(/export const coreFacts = \[([\s\S]*?)\];/);
const facts = factsMatch
  ? [...factsMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : [];

// Extract navLinks
const navMatch = siteSource.match(/export const navLinks[\s\S]*?= \[([\s\S]*?)\];/);
const navLinks = navMatch
  ? [...navMatch[1].matchAll(/href:\s*'([^']+)',\s*label:\s*'([^']+)'/g)].map((m) => ({
      href: m[1],
      label: m[2],
    }))
  : [];

const pageDescriptions = {
  '/product': 'Build, Configure, Run, Monitor modes',
  '/agents': 'Three specialized agents sharing one typed tool layer',
  '/architecture': 'Four-layer design with tool layer rationale',
  '/isa-95': 'Standards alignment and database schema mapping',
  '/roadmap': 'M1-M6 milestone timeline',
};

const productLinks = navLinks
  .filter((l) => !['/blog', '/faq'].includes(l.href))
  .map((l) => `- [${l.label}](${url}${l.href}): ${pageDescriptions[l.href] || ''}`)
  .join('\n');

const factsBlock = facts.map((f) => `- ${f}`).join('\n');

const content = `# MESkit — The AI-Native MES
> ${description}

## What is MESkit
- [What is MESkit? (FAQ)](${url}/faq): Core definitions and product status
- [What is an AI-native MES?](${url}/blog/what-is-an-ai-native-mes): Category-defining explainer

## Product
${productLinks}

## Technical
- [How agents call MES tools](${url}/blog/how-meskit-agents-call-mes-tools): Tool registration and call chain deep-dive
- [From simulation to MQTT](${url}/blog/from-simulation-to-mqtt-same-tools-different-transport): Transport transition without logic rewrites
- [ISA-95 for developers](${url}/blog/isa-95-for-developers): Practical mapping from standard to Postgres schema

## Key facts
${factsBlock}
`;

const outPath = join(root, 'public/llms.txt');
writeFileSync(outPath, content, 'utf-8');
console.log(`Generated ${outPath} (${content.length} bytes)`);
