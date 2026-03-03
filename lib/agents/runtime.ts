import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";
import { executeTool, getToolsByNames, toGeminiTools } from "@/lib/tools/registry";

// Ensure tool modules are loaded so they register themselves
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  systemPrompt: string;
  toolNames: string[];
  messages: AgentMessage[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function runAgent(
  request: AgentRequest,
): Promise<ReadableStream<Uint8Array>> {
  const tools = toGeminiTools(getToolsByNames(request.toolNames));
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: request.systemPrompt,
          tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
        });

        // Convert messages to Gemini format
        const history: Content[] = request.messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const lastMessage = request.messages[request.messages.length - 1];

        const chat = model.startChat({ history });

        // Tool-use loop
        let currentInput: string | Part[] = lastMessage.content;
        let continueLoop = true;

        while (continueLoop) {
          continueLoop = false;

          const result = await chat.sendMessageStream(currentInput);

          let fullText = "";
          const functionCalls: { name: string; args: Record<string, unknown> }[] = [];

          for await (const chunk of result.stream) {
            const candidate = chunk.candidates?.[0];
            if (!candidate?.content?.parts) continue;

            for (const part of candidate.content.parts) {
              if (part.text) {
                fullText += part.text;
                send("text", { text: part.text });
              }
              if (part.functionCall) {
                functionCalls.push({
                  name: part.functionCall.name,
                  args: part.functionCall.args as Record<string, unknown>,
                });
              }
            }
          }

          // If the model wants to call tools, execute them and continue
          if (functionCalls.length > 0) {
            continueLoop = true;

            const functionResponses: Part[] = [];

            for (const fc of functionCalls) {
              send("tool_call", { name: fc.name, input: fc.args });

              try {
                const toolResult = await executeTool(fc.name, fc.args);
                functionResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: { result: toolResult },
                  },
                });
                send("tool_result", { name: fc.name, result: toolResult });
              } catch (error) {
                const errorMsg =
                  error instanceof Error ? error.message : "Unknown error";
                functionResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: { error: errorMsg },
                  },
                });
                send("tool_error", { name: fc.name, error: errorMsg });
              }
            }

            // Send tool results back to the model
            currentInput = functionResponses;
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
