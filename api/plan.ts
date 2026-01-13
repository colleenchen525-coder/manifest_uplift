const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const SYSTEM_PROMPT = `You are a behavioral science coach.

Your task is not to motivate,
but to convert vague goals into concrete, controllable actions.

You must NOT reinterpret the goal.
You must stay anchored to the user's stated intent.`;

const buildUserPrompt = (goal: string) => `User goal: "${goal}"

Step 0: Define the goal anchor.
- Rewrite the user's goal into ONE concrete anchor phrase.
- The anchor must preserve the original intent.
- Do NOT change the meaning or domain.

Examples:
- "I want to be rich" → "personal financial wealth and money management"
- "I want to be healthier" → "physical health and daily habits"

Return the anchor internally (do not show to user).

Step 1: Classify the goal:
- Domain (financial / health / career / relationship)
- Time horizon (short / long)
- What the user can directly control today

Step 2: Generate:
1. 5 affirmations:
- Must mention personal agency
- Must explicitly reference the goal domain and the goal anchor
- within 15 words

2. 2 micro-actions:
- Must be doable in 15 minutes
- Must involve a concrete object related to the anchor
  (e.g. bank app, cash amount, balance, expense number)
- Must produce a visible or written outcome
- Do NOT use vague verbs like "track", "think", "reflect" without an object
- Must clearly connect to the goal and the goal anchor

Return JSON only in the following format:
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

const FALLBACK_RESPONSE = {
  affirmations: [
    "I am taking steady steps toward my financial goal.",
    "I control my spending choices to build financial security.",
    "I am actively growing my career skills every day.",
    "I am prioritizing my health through consistent daily habits.",
    "I am showing up for my relationships with care and intention."
  ],
  micro_actions: [
    "Track one expense or habit related to your goal for 10 minutes.",
    "Write down one measurable action you can complete today."
  ]
};

const parsePlanContent = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(wish) }
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

  const parsed = parsePlanContent(content);
  if (!parsed || typeof parsed !== "object") {
    res.status(200).json(FALLBACK_RESPONSE);
    return;
  }

  const affirmations = Array.isArray(parsed.affirmations)
    ? parsed.affirmations.filter((item: unknown) => typeof item === "string").slice(0, 5)
    : [];
  const microActions = Array.isArray(parsed.micro_actions)
    ? parsed.micro_actions.filter((item: unknown) => typeof item === "string").slice(0, 2)
    : [];

  res.status(200).json({
    affirmations: affirmations.length ? affirmations : FALLBACK_RESPONSE.affirmations,
    micro_actions: microActions.length ? microActions : FALLBACK_RESPONSE.micro_actions
  });
}
