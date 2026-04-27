import { GoogleGenerativeAI } from "@google/generative-ai";
import { task } from "@trigger.dev/sdk/v3";

export type LlmNodeOutput = { kind: "text"; text: string };

export const llmNodeTask = task({
  id: "llm-node",
  maxDuration: 600,
  run: async (payload: {
    systemPrompt?: string;
    userMessage: string;
    imageUrls?: string[];
    model: string;
    temperature: number;
    maxTokens: number;
  }): Promise<LlmNodeOutput> => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: payload.model || "gemini-1.5-flash",
      systemInstruction: payload.systemPrompt?.trim() || undefined,
    });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: payload.userMessage },
    ];

    for (const url of payload.imageUrls ?? []) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download image for LLM: ${url}`);
      const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      const buf = Buffer.from(await res.arrayBuffer());
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: buf.toString("base64"),
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: payload.temperature,
        maxOutputTokens: payload.maxTokens,
      },
    });

    const text = result.response.text();
    return { kind: "text", text: text ?? "" };
  },
});
