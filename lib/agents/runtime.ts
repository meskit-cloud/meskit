import { streamText, stepCountIs, type ModelMessage } from "ai";
import { getModel } from "@/lib/ai/provider";
import { toAISDKTools } from "@/lib/ai/tools";
import { getToolsByNames } from "@/lib/tools/registry";

// Ensure tool modules are loaded so they register themselves
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";
import "@/lib/tools/carbon";     // PCF: get_carbon_footprint, compare_carbon_by_line, export_pathfinder_json
import "@/lib/tools/blockchain"; // Blockchain: verify_blockchain_anchor

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  systemPrompt: string;
  toolNames: string[];
  messages: AgentMessage[];
  agentName?: string;
}

export async function runAgent(
  request: AgentRequest,
): Promise<ReadableStream<Uint8Array>> {
  const mesTools = getToolsByNames(request.toolNames);
  const tools = toAISDKTools(mesTools, request.agentName);
  const encoder = new TextEncoder();

  const messages: ModelMessage[] = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const result = streamText({
          model: getModel(),
          temperature: 0,
          system: request.systemPrompt,
          messages,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          stopWhen: stepCountIs(10),
        });

        for await (const part of result.fullStream) {
          switch (part.type) {
            case "text-delta":
              send("text", { text: part.text });
              break;
            case "tool-call":
              send("tool_call", { name: part.toolName, input: part.input });
              break;
            case "tool-result": {
              const output = part.output;
              const isError =
                typeof output === "object" &&
                output !== null &&
                "error" in output;
              if (isError) {
                send("tool_error", {
                  name: part.toolName,
                  error: (output as { error: string }).error,
                });
              } else {
                send("tool_result", {
                  name: part.toolName,
                  result: output,
                });
              }
              break;
            }
          }
        }

        send("done", {});
        controller.close();
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        send("error", { error: errorMsg });
        controller.close();
      }
    },
  });
}
