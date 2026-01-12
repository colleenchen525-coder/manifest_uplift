const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const buildSystemPrompt = (nickname: string, history: any[]) => {
  const historyContext =
    history && history.length > 0
      ? `User History: ${JSON.stringify(history.slice(0, 3))}`
      : "No previous history.";

  return `
    You are an expert in Behavioral Psychology and Self-Affirmation Theory.
    Help user "${nickname}" turn a wish into a plan.
    
    Context: ${historyContext}

    1. **Affirmations**: Create 5 distinct, powerful, present-tense "I am" statements. 
       **CONSTRAINT**: Each affirmation must be **UNDER 10 WORDS**.
    2. **Reasoning**: For each affirmation, briefly explain scientifically why it works (1 sentence).
    3. **Micro-Actions**: Break the wish down into **EXACTLY 2** incredibly small, immediate actions (Tiny Habits). 
       These must be doable TODAY, taking less than 5 minutes.
  `;
};

const coerceBody = (body: any) => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = coerceBody(req.body);
  const { wish, nickname, history = [] } = body || {};

  if (!wish || !nickname) {
    res.status(400).json({ error: "Missing wish or nickname" });
    return;
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "DASHSCOPE_API_KEY is not configured" });
    return;
  }

  const baseUrl = process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.QWEN_MODEL || DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(nickname, history) },
        { role: "user", content: `My wish is: "${wish}"` }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    res.status(response.status).json({ error: errorText || "DashScope request failed" });
    return;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    res.status(500).json({ error: "No response content from DashScope" });
    return;
  }

  try {
    const parsed = JSON.parse(content);
    const affirmations = Array.isArray(parsed.affirmations) ? parsed.affirmations.slice(0, 5) : [];
    const microActions = Array.isArray(parsed.microActions) ? parsed.microActions.slice(0, 2) : [];

    res.status(200).json({ affirmations, microActions });
  } catch (error: any) {
    res.status(500).json({ error: "Invalid JSON response from DashScope" });
  }
}
