# Blockchain Anchor Generator

Scaffold blockchain anchoring code for a MESkit entity type.

## Input

$ARGUMENTS — entity type + description (e.g., "production_order -- anchor batch certificate on work order completion")

## Instructions

Parse the entity type and description from the input (split on `--` if present). Generate three files following the blockchain anchoring architecture defined in `docs/blockchain-batch-anchoring.md`:

1. **Edge Function** — `supabase/functions/anchor-{entity}/index.ts`
2. **Verification tool** — append to `lib/tools/blockchain.ts`
3. **UI badge component** — `components/{entity}-anchor-badge.tsx`

If `lib/tools/blockchain.ts` does not exist, create it with the standard file header.

### Architecture Reference

```
Entity record changes status (Supabase)
         |
         v
Supabase Edge Function (Deno / TypeScript)
         |
     1. Fetch full entity record from DB
     2. Assemble certificate JSON (deterministic, sorted keys)
     3. SHA-256 hash → bytes32
     4. Call MeskitAnchor.anchorBatch(hash, entityId) on Polygon
     5. Store tx_hash back in entity row
         |
         v
Polygon PoS (Amoy testnet for dev, mainnet for production)
```

### Smart Contract Reference

The `MeskitAnchor` contract is already deployed. Do not generate new contracts unless the user explicitly asks. Reference the existing ABI:

```solidity
// Already deployed — do not regenerate
// MeskitAnchor.sol (Polygon Amoy testnet)
function anchorBatch(bytes32 batchHash, string calldata entityId) external;
event BatchAnchored(bytes32 indexed batchHash, string entityId, uint256 timestamp);
```

---

### 1. Edge Function Pattern

```typescript
// supabase/functions/anchor-{entity}/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6";
import { crypto } from "https://deno.land/std/crypto/mod.ts";

const CONTRACT_ABI = [
  "function anchorBatch(bytes32 batchHash, string calldata entityId) external",
  "event BatchAnchored(bytes32 indexed batchHash, string entityId, uint256 timestamp)",
];

Deno.serve(async (req) => {
  const { record } = await req.json();
  const entityId = record.id;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Fetch full entity record
  const { data: entity, error } = await supabase
    .from("{table_name}")
    .select("{relevant_columns}")
    .eq("id", entityId)
    .single();

  if (error || !entity) {
    return new Response(JSON.stringify({ error: "Entity not found" }), { status: 404 });
  }

  // 2. Assemble certificate (deterministic — sorted keys)
  const certificate = assembleCertificate(entity);
  const certJson = JSON.stringify(certificate, Object.keys(certificate).sort());

  // 3. SHA-256 hash
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(certJson));
  const hashHex = "0x" + Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 4. Write to Polygon
  const provider = new ethers.JsonRpcProvider(Deno.env.get("BLOCKCHAIN_RPC_URL")!);
  const wallet = new ethers.Wallet(Deno.env.get("BLOCKCHAIN_PRIVATE_KEY")!, provider);
  const contract = new ethers.Contract(Deno.env.get("CONTRACT_ADDRESS")!, CONTRACT_ABI, wallet);

  const tx = await contract.anchorBatch(hashHex, entityId);
  await tx.wait();

  // 5. Store tx hash back in the entity row
  await supabase
    .from("{table_name}")
    .update({ blockchain_anchor_tx: tx.hash, blockchain_anchored_at: new Date().toISOString() })
    .eq("id", entityId);

  return new Response(JSON.stringify({ tx_hash: tx.hash }), { status: 200 });
});

function assembleCertificate(entity: Record<string, unknown>) {
  // Return a deterministic object with only the fields that should be hashed.
  // Include: IDs, timestamps, quantities, quality results, operator IDs.
  // Exclude: internal DB columns (created_at, updated_at, blockchain_anchor_tx).
  return {
    // {entity_type}_id: entity.id,
    // ... entity-specific fields
  };
}
```

**Required Supabase secrets for the Edge Function:**

```bash
supabase secrets set BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
supabase secrets set BLOCKCHAIN_PRIVATE_KEY=<funded_wallet_private_key>
supabase secrets set CONTRACT_ADDRESS=<meskit_anchor_contract_address>
```

**DB webhook configuration** (Supabase Dashboard: Database → Webhooks):

```
Table:  {table_name}
Event:  UPDATE
Filter: status=eq.{completion_status}   # e.g. status=eq.complete
URL:    https://<project>.supabase.co/functions/v1/anchor-{entity}
```

---

### 2. Blockchain Tool Pattern

Append to `lib/tools/blockchain.ts`. Follow the standard tool registration pattern from `lib/tools/registry.ts`.

```typescript
// lib/tools/blockchain.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "@/lib/tools/registry";

// --- verify_blockchain_anchor ---

export const verifyBlockchainAnchorSchema = z.object({
  entity_id: z.string().uuid().describe("ID of the entity to verify"),
  entity_type: z
    .enum(["production_order" /* add more as anchoring is expanded */])
    .describe("Type of entity to verify"),
});

export type VerifyBlockchainAnchorInput = z.infer<typeof verifyBlockchainAnchorSchema>;

export async function verifyBlockchainAnchor(input: VerifyBlockchainAnchorInput) {
  const { entity_id, entity_type } = verifyBlockchainAnchorSchema.parse(input);
  const supabase = await createClient();

  const tableMap: Record<string, string> = {
    production_order: "production_orders",
    // add future anchor targets here
  };

  const { data, error } = await supabase
    .from(tableMap[entity_type])
    .select("id, blockchain_anchor_tx, blockchain_anchored_at")
    .eq("id", entity_id)
    .single();

  if (error) throw new Error(`verify_blockchain_anchor failed: ${error.message}`);

  return {
    entity_id,
    entity_type,
    anchored: !!data?.blockchain_anchor_tx,
    tx_hash: data?.blockchain_anchor_tx ?? null,
    anchored_at: data?.blockchain_anchored_at ?? null,
    explorer_url: data?.blockchain_anchor_tx
      ? `https://amoy.polygonscan.com/tx/${data.blockchain_anchor_tx}`
      : null,
  };
}

registerTool({
  name: "verify_blockchain_anchor",
  description:
    "Check whether a MESkit entity (production order, batch record) has been anchored to the blockchain. Returns the transaction hash and Polygonscan explorer URL if anchored.",
  schema: verifyBlockchainAnchorSchema,
  execute: verifyBlockchainAnchor,
});
```

---

### 3. UI Badge Component Pattern

```tsx
// components/{entity}-anchor-badge.tsx
"use client";

interface {Entity}AnchorBadgeProps {
  txHash: string | null;
  anchoredAt: string | null;
}

export function {Entity}AnchorBadge({ txHash, anchoredAt }: {Entity}AnchorBadgeProps) {
  if (!txHash) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Not yet anchored
      </span>
    );
  }

  const explorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
      title={`Anchored ${anchoredAt ? new Date(anchoredAt).toLocaleString() : ""}. View on Polygonscan.`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      Verified on-chain
    </a>
  );
}
```

---

### Entity Catalog

When generating anchoring code for known entities, use these table names and certificate fields:

| Entity | Table | Completion status | Certificate fields |
|--------|-------|-------------------|--------------------|
| `production_order` | `production_orders` | `complete` | `id`, `part_number_id`, `quantity_ordered`, `quantity_completed`, `route_id`, `started_at`, `completed_at`, `carbon_footprint_kgco2e_per_unit` |
| `quality_event` | `quality_events` | *(on INSERT)* | `id`, `unit_id`, `workstation_id`, `event_type`, `result`, `defect_code_id`, `created_at` |
| `maintenance_request` | `maintenance_requests` | `closed` | `id`, `machine_id`, `request_type`, `priority`, `created_at`, `closed_at` |

For new entity types not in this catalog: identify the table, the completion trigger event/status, and the fields that constitute the tamper-sensitive record. Include timestamps and foreign key IDs. Exclude mutable metadata columns.

---

### Migration Pattern

If the target table does not yet have `blockchain_anchor_tx` and `blockchain_anchored_at` columns, generate a migration:

```sql
-- supabase/migrations/{timestamp}_add_blockchain_anchor_to_{table}.sql

ALTER TABLE {table_name}
  ADD COLUMN IF NOT EXISTS blockchain_anchor_tx    TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_anchored_at  TIMESTAMPTZ;

COMMENT ON COLUMN {table_name}.blockchain_anchor_tx IS
  'Polygon transaction hash from MeskitAnchor.anchorBatch(). NULL until anchored.';

COMMENT ON COLUMN {table_name}.blockchain_anchored_at IS
  'Timestamp when the blockchain anchor transaction was confirmed.';
```

---

### Conventions

- Certificate JSON must be **deterministic**: use `JSON.stringify(obj, sortedKeys)` — key order must not vary between runs
- Only hash **immutable fields**: IDs, timestamps, quantities, quality results — never hash `updated_at` or other mutable metadata
- The Edge Function must be **idempotent**: if `blockchain_anchor_tx` is already set, skip the anchor and return the existing tx hash
- Always use Polygon Amoy testnet (`https://rpc-amoy.polygon.technology`) during development, never mainnet
- The `explorer_url` in the tool response links to Amoy testnet by default — update to mainnet URL (`https://polygonscan.com`) when promoting to production
- Badge components use `text-accent` (MESkit's accent color token) for the "verified" state — consistent with design tokens in `CLAUDE.md`
- Never expose `BLOCKCHAIN_PRIVATE_KEY` in client-side code — all signing happens in Edge Functions only
