import { UpstreamError } from "../errors.js";

const SYSTEM_PROMPT =
  "You are a warm, brief, non-clinical companion for a Filipino student. " +
  "Use plain language. Never diagnose. Suggest professional help if the user " +
  "mentions self-harm or crisis.";

export function createMistralClient({
  apiKey,
  model,
  timeoutMs,
  fetchImpl = globalThis.fetch,
}) {
  return {
    async complete({ message, history }) {
      if (!apiKey) {
        throw new UpstreamError("The AI service is not configured");
      }

      let response;
      try {
        response = await fetchImpl(
          "https://api.mistral.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              temperature: 0.6,
              max_tokens: 320,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history,
                { role: "user", content: message },
              ],
            }),
            signal: AbortSignal.timeout(timeoutMs),
          },
        );
      } catch (error) {
        throw new UpstreamError(undefined, { cause: error });
      }

      if (!response.ok) {
        throw new UpstreamError();
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new UpstreamError("The AI service returned an invalid response", {
          cause: error,
        });
      }

      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) {
        throw new UpstreamError("The AI service returned an empty response");
      }

      return reply.trim();
    },
  };
}
