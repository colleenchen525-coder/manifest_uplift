import {
  buildFallbackResponse,
  coerceStringArray,
  deriveFallbackGoalAnchor,
  extractKeywords,
  getUniqueStrings,
  hasConcreteObjectToken,
  hasKeywordCoverage,
  isValidGoalAnchor,
  matchesGenericActionPattern,
  parsePlanContent
} from "./planUtils.js";

const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const SYSTEM_PROMPT = `You are a behavioral science coach.

Your task is to convert a user's goal into
multiple goal-anchored affirmations and actions.

All outputs must stay anchored to the same goal domain.
Do not introduce new life domains.`;

const DEBUG_TAG = "ANCHOR_MULTI_V2";
const DEBUG_PLAN = process.env.DEBUG_PLAN === "true";

const buildUserPrompt = (goal: string, strictNoDuplicates = false) => `User goal: "${goal}"

Step 0: Define ONE goal anchor.
- Rewrite the user's goal into ONE short noun phrase (2-6 words).
- Preserve the original domain and intent.
- The goal_anchor MUST NOT equal the original goal sentence.

Examples:
- "I want to be rich" → "personal financial wealth"
- "I want to be healthier" → "physical health habits"
- "I want to improve my relationship" → "personal relationships"
- "I want to grow my career" → "career growth"

Step 1: Generate 5 affirmations.
Rules:
- Each affirmation must be meaningfully different (no duplicates).
- Each must express personal agency ("I", "my actions", "my choices").
- Avoid abstract or spiritual language.
- No affirmation may introduce a different domain.
- Each affirmation must include at least TWO keywords from the goal_anchor (or all keywords if fewer than 2).

Step 2: Generate 2 micro-actions.
Rules:
- Each action must be meaningfully different (no duplicates).
- Each action must take ≤5 minutes.
- Each action must involve a concrete object or behavior related to the goal_anchor.
- Each action must produce a visible or written outcome.
- Avoid vague verbs like "track", "reflect", "think" without an object.
- Each action must include at least TWO keywords from the goal_anchor (or all keywords if fewer than 2).

${strictNoDuplicates ? "CRITICAL: NO DUPLICATES. Every affirmation and action must be unique and non-repetitive." : ""}

Return JSON only in this exact format:
{
  "goal_anchor": "string",
  "affirmations": ["string", "string", "string", "string", "string"],
  "actions": ["string", "string"],
  "debug": "${DEBUG_TAG}"
}`;

const validatePlan = (plan: any, goal: string) => {
  const goalAnchor = typeof plan?.goal_anchor === "string" ? plan.goal_anchor.trim() : "";
  const affirmations = coerceStringArray(plan?.affirmations, 5);
  const actions = coerceStringArray(plan?.actions ?? plan?.micro_actions, 2);

  const isAnchorValid = isValidGoalAnchor(goalAnchor, goal);
  const keywords = extractKeywords(goalAnchor);

  const uniqueAffirmations = getUniqueStrings(affirmations);
  const uniqueActions = getUniqueStrings(actions);

  const hasValidCounts = affirmations.length === 5 && actions.length === 2;
  const hasUniqueCounts = uniqueAffirmations.length === 5 && uniqueActions.length === 2;

  const hasKeywordCoverageForItems = [...affirmations, ...actions].every(item =>
    hasKeywordCoverage(item, keywords)
  );

  const actionsAreConcrete = actions.every(action => {
    const hasConcreteObject = hasConcreteObjectToken(action, keywords);
    return hasConcreteObject && (!matchesGenericActionPattern(action) || hasConcreteObject);
  });

  return {
    goalAnchor,
    affirmations,
    actions,
    keywords,
    hasDuplicates: !hasUniqueCounts,
    isValid:
      isAnchorValid &&
      hasValidCounts &&
      hasUniqueCounts &&
      hasKeywordCoverageForItems &&
      actionsAreConcrete &&
      keywords.length > 0
  };
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = typeof req.body === "string" ? (() => {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  })() : req.body || {};

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

    if (DEBUG_PLAN) {
      console.log("[plan] raw content", content);
    }

    const parsed = parsePlanContent(content);
    if (DEBUG_PLAN) {
      console.log("[plan] parsed content", parsed);
    }

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
    const goalAnchor = deriveFallbackGoalAnchor(wish);
    res.status(200).json(buildFallbackResponse(goalAnchor, DEBUG_TAG));
    return;
  }

  res.status(200).json({
    goal_anchor: validatedPlan.goalAnchor,
    affirmations: validatedPlan.affirmations,
    actions: validatedPlan.actions,
    debug: DEBUG_TAG
  });
}
