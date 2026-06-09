import "./load-env";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export type OpenAiJsonResult<T> =
  | {
      usedOpenAI: true;
      data: T;
      model: string;
    }
  | {
      usedOpenAI: false;
      data: T;
      reason: string;
    };

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function optionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join("\n")
      .trim() ?? ""
  );
}

function parseJsonObject<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] ?? trimmed) as T;
}

export async function completeAgentJson<T>({
  system,
  user,
  fallback,
}: {
  system: string;
  user: string;
  fallback: T;
}): Promise<OpenAiJsonResult<T>> {
  const apiKey = optionalEnv("OPENAI_API_KEY");

  if (!apiKey) {
    return {
      usedOpenAI: false,
      data: fallback,
      reason: "OPENAI_API_KEY is not set",
    };
  }

  const model = optionalEnv("OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL;

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "system",
            content: `${system}\nReturn JSON only.`,
          },
          {
            role: "user",
            content: user,
          },
        ],
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        usedOpenAI: false,
        data: fallback,
        reason: `OpenAI request failed: HTTP ${response.status} ${raw}`,
      };
    }

    const payload = JSON.parse(raw) as OpenAIResponse;
    const outputText = extractOutputText(payload);

    if (!outputText) {
      return {
        usedOpenAI: false,
        data: fallback,
        reason: "OpenAI response did not include output text",
      };
    }

    return {
      usedOpenAI: true,
      data: parseJsonObject<T>(outputText),
      model,
    };
  } catch (error) {
    return {
      usedOpenAI: false,
      data: fallback,
      reason: error instanceof Error ? error.message : "OpenAI call failed",
    };
  }
}
