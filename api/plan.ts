const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

/**
 * 目标：最大化展示模型输出，而不是落入兜底
 * 策略：
 * - 不做禁用词拦截（避免误伤）
 * - 仅在解析失败/结构不合规时重试一次
 * - 解析成功则“局部补齐”，不整套 fallback
 */
const SYSTEM_PROMPT = `You are a goal-anchored behavioral science coach.

Your task is not to motivate, but to convert vague goals into concrete, controllable actions.

Requirements:
- First, interpret the goal into ONE concrete path (career income / business revenue / investment assets / skill monetization).
- Keep outputs anchored to that path; avoid unrelated life domains.
- Micro-actions must be doable today (<=15 minutes) and should be specific and controllable.
- Output JSON only.`;

const buildUserPrompt = (goal: string) => `User goal: "${goal}"

Step 1) Choose exactly ONE wealth-building path (internal decision; do not output this step):
- career_income (raise, promotion, salary negotiation, job switch, visibility)
- business_revenue (side project, freelancing, selling, marketing, pricing)
- investment_assets (portfolio, allocation, risk control, investing habit)
- skill_monetization (learn -> package -> sell)

Step 2) Create an internal "Goal Anchor" sentence that implies HOW progress is created (earn/sell/ship/negotiate/invest).
Do not output the anchor.

Step 3) Generate:
A) 5 affirmations (<= 15 words each)
- Must include agency ("I" + action verb)
- Must clearly relate to the chosen path

B) 2 micro-actions (<= 15 minutes each)
- Must be executable today
- Must be specific and controllable
- Must clearly connect to the chosen path

Return JSON only in this format:
{
  "affirmations": ["string"],
  "micro_actions": ["string"]
}`;

/**
 * Retry prompt：仅用于“格式不合规”时，让模型自检 JSON 结构
 * 不做内容禁用/过滤，避免误伤
 */
const SYSTEM_PROMPT_RETRY = `Your previous output may be invalid JSON or missing required fields.
Fix it now.

Rules:
- Output MUST be valid JSON and MUST match the schema exactly.
- Do NOT add any extra keys.
- Provide 5 affirmations and 2 micro_actions as arrays of strings.

Output JSON only.`;

/** body 兼容 */
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

/**
 * 更宽泛兜底：避免“金融模板化”
 * 并做随机化：即便兜底也不那么像兜底
 */
const FALLBACK_AFFIRMATIONS_POOL = [
  "I take one clear step today that moves my goal forward.",
  "I build momentum through small, consistent actions.",
  "I choose actions that create real progress, not just intention.",
  "I focus on what I can control and execute it calmly.",
  "I follow through on the next small step.",
  "I create value through action, not waiting.",
  "I improve my skills and decisions one day at a time.",
  "I keep moving even when the goal feels big."
];

const FALLBACK_ACTIONS_POOL = [
  "Define one concrete outcome you want by tonight (one sentence).",
  "List 3 possible next steps; choose the easiest and do it for 10 minutes.",
  "Send one message that advances your goal (ask, pitch, apply, request feedback).",
  "Create a tiny deliverable in 15 minutes (draft, outline, checklist, sample).",
  "Make one decision that removes friction for tomorrow (schedule, prepare, set up).",
  "Identify one obstacle and write one workaround you can try today."
];

const pickRandomUnique = (pool: string[], count: number) => {
  const copy = [...pool];
  const picked: string[] = [];
  while (picked.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
};

const buildFallbackResponse = () => ({
  affirmations: pickRandomUnique(FALLBACK_AFFIRMATIONS_POOL, 5),
  micro_actions: pickRandomUnique(FALLBACK_ACTIONS_POOL, 2)
});

/** 宽容 JSON 提取 */
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

const normalizeStrings = (arr: unknown, maxLen: number) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, maxLen);
};

async function callDashScopeChatCompletion(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  userPrompt: string;
}) {
  const { baseUrl, apiKey, model, temperature, systemPrompt, userPrompt } = opts;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false as const, errorText: errorText || "DashScope request failed" };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false as const, errorText: "No response content from DashScope" };
  }

  return { ok: true as const, content: String(content) };
}

function extractModelResult(content: string) {
  const parsed = parsePlanContent(content);
  if (!parsed || typeof parsed !== "object") return null;

  // 兼容 micro_actions / microActions
  const rawAff = (parsed as any)?.affirmations;
  const rawActs = (parsed as any)?.micro_actions ?? (parsed as any)?.microActions;

  const affirmations = normalizeStrings(rawAff, 5);
  const microActions = normalizeStrings(rawActs, 2);

  // 如果两者都空，视为无效
  if (affirmations.length === 0 && microActions.length === 0) return null;

  return { affirmations, microActions };
}

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

  const userPrompt = buildUserPrompt(String(wish));

  // === Attempt 1 ===
  const attempt1 = await callDashScopeChatCompletion({
    baseUrl,
    apiKey,
    model,
    temperature: 0.7,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt
  });

  if (!attempt1.ok) {
    // API 层失败：直接给宽泛 fallback（保证体验）
    res.status(200).json(buildFallbackResponse());
    return;
  }

  const result1 = extractModelResult(attempt1.content);

  // 解析成功：局部补齐（尽量展示模型）
  if (result1) {
    const fallback = buildFallbackResponse();
    res.status(200).json({
      affirmations: result1.affirmations.length ? result1.affirmations : fallback.affirmations,
      micro_actions: result1.microActions.length ? result1.microActions : fallback.micro_actions
    });
    return;
  }

  // === Attempt 2: only for formatting / parsing failure ===
  const attempt2 = await callDashScopeChatCompletion({
    baseUrl,
    apiKey,
    model,
    temperature: 0.4,
    systemPrompt: `${SYSTEM_PROMPT}\n\n${SYSTEM_PROMPT_RETRY}`,
    userPrompt
  });

  if (!attempt2.ok) {
    res.status(200).json(buildFallbackResponse());
    return;
  }

  const result2 = extractModelResult(attempt2.content);
  if (result2) {
    const fallback = buildFallbackResponse();
    res.status(200).json({
      affirmations: result2.affirmations.length ? result2.affirmations : fallback.affirmations,
      micro_actions: result2.microActions.length ? result2.microActions : fallback.micro_actions
    });
    return;
  }

  // === Final fallback ===
  res.status(200).json(buildFallbackResponse());
}
