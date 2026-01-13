const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const SYSTEM_PROMPT = `You are a behavioral science coach.

Your task is to convert a user's goal into
multiple goal-anchored affirmations and actions.

All outputs must stay anchored to the same goal domain.
Do not introduce new life domains.`;

const DEBUG_TAG = "ANCHOR_MULTI_V1";

const buildUserPrompt = (goal: string, strict = false) => `User goal: "${goal}"

Step 0: Define ONE goal anchor.
- Rewrite the user's goal into ONE short anchor phrase.
- Preserve the original domain and intent.
- Do NOT generalize or switch domains.

Examples:
- "I want to be rich" → "personal financial wealth"
- "I want to be healthier" → "physical health habits"
- "I want to improve my relationship" → "personal relationships"
- "I want to grow my career" → "career growth"

Step 1: Generate 5 affirmations.
Rules:
- Each affirmation must explicitly reference the same goal anchor.
- Each must express personal agency ("I", "my actions", "my choices").
- Avoid abstract or spiritual language.
- No affirmation may introduce a different domain.

Step 2: Generate 2 micro-actions.
Rules:
- Each action must take ≤5 minutes.
- Each must involve a concrete object or behavior related to the goal anchor.
- Each must produce a visible or written outcome.
- Avoid vague verbs like "track", "reflect", "think" without an object.

${strict ? "CRITICAL: Every affirmation and action must include the exact goal_anchor phrase verbatim." : ""}

Return JSON only in this exact format:
{
  "goal_anchor": "string",
  "affirmations": ["string", "string", "string", "string", "string"],
  "actions": ["string", "string"],
  "debug": "${DEBUG_TAG}"
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

const normalizeText = (value: string) => value.toLowerCase().trim();

const deriveGoalAnchor = (goal: string, provided?: string) => {
  if (typeof provided === "string" && provided.trim()) {
    return provided.trim();
  }
  return goal.trim();
};

const buildFallbackResponse = (goalAnchor: string) => ({
  goal_anchor: goalAnchor,
  affirmations: Array.from({ length: 5 }, () => `I am taking intentional actions toward my ${goalAnchor}.`),
  actions: Array.from({ length: 2 }, () => `Write down one concrete step you can take today related to ${goalAnchor}.`),
  debug: DEBUG_TAG
});

const coerceStringArray = (value: unknown, limit: number) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, limit);
};

const isAnchorReferenced = (item: string, goalAnchor: string) =>
  normalizeText(item).includes(normalizeText(goalAnchor));

const validatePlan = (plan: any, goal: string) => {
  const goalAnchor = deriveGoalAnchor(goal, plan?.goal_anchor);
  const affirmations = coerceStringArray(plan?.affirmations, 5);
  const actions = coerceStringArray(plan?.actions ?? plan?.micro_actions, 2);

  const hasValidCounts = affirmations.length === 5 && actions.length === 2;
  const hasAnchoredItems = [...affirmations, ...actions].every(item =>
    isAnchorReferenced(item, goalAnchor)
  );

  return {
    goalAnchor,
    affirmations,
    actions,
    isValid: hasValidCounts && hasAnchoredItems
  };
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

  const prompts = [buildUserPrompt(wish), buildUserPrompt(wish, true)];
  let validatedPlan: ReturnType<typeof validatePlan> | null = null;

  for (const prompt of prompts) {
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
          { role: "user", content: prompt }
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
      continue;
    }

    const parsed = parsePlanContent(content);
    if (!parsed || typeof parsed !== "object") {
      continue;
    }

    const validation = validatePlan(parsed, wish);
    if (validation.isValid) {
      validatedPlan = validation;
      break;
    }

    validatedPlan = validation;
  }

  if (!validatedPlan || !validatedPlan.isValid) {
    const goalAnchor = validatedPlan?.goalAnchor ?? deriveGoalAnchor(wish);
    res.status(200).json(buildFallbackResponse(goalAnchor));
    return;
  }

  res.status(200).json({
    goal_anchor: validatedPlan.goalAnchor,
    affirmations: validatedPlan.affirmations,
    actions: validatedPlan.actions,
    debug: DEBUG_TAG
  });
}
