import { z } from "zod";
import { registerTool } from "./registry";

// --- Stub for Future Milestone: Blockchain Anchoring ---

// --- verify_blockchain_anchor ---

export const verifyBlockchainAnchorSchema = z.object({
  production_order_id: z.string().uuid(),
});
export type VerifyBlockchainAnchorInput = z.infer<typeof verifyBlockchainAnchorSchema>;

registerTool({
  name: "verify_blockchain_anchor",
  description: "Verify a production order's blockchain anchor hash",
  schema: verifyBlockchainAnchorSchema,
  execute: async () => {
    throw new Error("verify_blockchain_anchor not implemented until blockchain milestone");
  },
});
