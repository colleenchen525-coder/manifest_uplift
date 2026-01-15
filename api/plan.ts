const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const SYSTEM_PROMPT = `You are a behavioral science coach.

Your task is to convert the user's goal into:
- goal-aligned affirmations
- small, concrete actions the user can do today

Rules:
- Stay strictly aligned with the user's stated goal.
- Avoid generic motivation; be concrete and actionable.
- Output JSON only.`;

const buildUserPrompt = (goal: string) => `User goal: "${goal}"

Generate:
1) 5 affirmations
- First person ("I")
- Clearly and specifically related to the goal
- Concrete, not vague

2) 2 micro-actions
- Can be done today (<=15 minutes)
- Directly practice or move the goal forward
- Specific and actionable

Return JSON only:
{
  "affirmations": ["string"],
  "micro_actions": ["string"]
}`;

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

const parseJsonLenient = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  }
  return null;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = coerceBody(req.body);
  const { wish, nickname } = body || {};

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

  try {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(String(wish)) }
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
      res.status(500).json({ error: "No response content from model" });
      return;
    }

    const parsed = parseJsonLenient(String(content));
    if (!parsed || typeof parsed !== "object") {
      res.status(500).json({ error: "Invalid model output (not JSON)" });
      return;
    }

    const affirmations = Array.isArray((parsed as any).affirmations) ? (parsed as any).affirmations.slice(0, 5) : null;
    const microActions = Array.isArray((parsed as any).micro_actions) ? (parsed as any).micro_actions.slice(0, 2) : null;

    if (!affirmations || !microActions) {
      res.status(500).json({ error: "Invalid model output (missing fields)" });
      return;
    }

    // ✅ Return model answers as-is
    res.status(200).json({
      affirmations,
      micro_actions: microActions
    });
  } catch (err) {
    console.error("DashScope request failed:", err);
    res.status(500).json({ error: "Model request failed" });
  }
}
