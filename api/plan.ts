// api/plan.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  coerceStringArray,
  getUniqueStrings,
  matchesGenericActionPattern,
  normalizeText,
  parsePlanContent
} from "./planUtils.js";

const BASE_URL =
  process.env.DASHSCOPE_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const MODEL = process.env.DASHSCOPE_MODEL || "qwen3-vl-flash";
const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || "";

type PlanOut = {
  goal_anchor: string;
  affirmations: string[];
  actions: string[];
  debug?: string;
};

const SYSTEM_PROMPT = `
You are a behavioral science coach.

You generate:
- 5 affirmations (varied styles, NOT templated, NOT repetitive)
- 2 micro-actions (tiny, doable, specific, NOT generic)

Hard rules:
- Output JSON only.
- No markdown, no explanations, no extra keys.
- Avoid repeating the user's goal sentence verbatim.
- Avoid repeating sentence structure across affirmations.
- Avoid generic motivational filler (e.g., "I can do it", "one step at a time") unless it is made concrete with context.

Diversity rules:
Affirmations should span different "tracks":
1) identity (who I am becoming)
2) emotional regulation (how I hold feelings)
3) cognitive reframe (how I interpret setbacks)
4) behavioral confidence (I take action)
5) environment/support (I set up conditions)

Micro-actions should be:
- 2–10 minutes
- concrete, with a clear first step
- not "write down one action", not "track a habit" generic prompts
`.trim();

function buildUserPrompt(goal: string) {
  return `
User goal: "${goal}"

Return JSON with:
{
  "goal_anchor": "short rewritten anchor (<= 12 words)",
  "affirmations": ["...", "...", "...", "...", "..."],
  "actions": ["...", "..."]
}

Constraints:
- goal_anchor must keep the same domain as the goal.
- affirmations: 5 items, each from a different track.
- actions: 2 items, tiny + concrete.
`.trim();
}

function softFilterAffirmations(items: string[], goalAnchor: string): string[] {
  // 只做“轻过滤”：去空、去重、去极端泛句（很短且无信息）
  const cleaned = items
    .map(s => String(s || "").trim())
    .filter(Boolean)
    .filter(s => normalizeText(s) !== normalizeText(goalAnchor))
    .filter(s => s.length >= 18); // 太短的基本都是空话

  return getUniqueStrings(cleaned).slice(0, 5);
}

function softFilterActions(items: string[]): string[] {
  const cleaned = items
    .map(s => String(s || "").trim())
    .filter(Boolean)
    .filter(s => s.length >= 12)
    // 不要把 action 过滤得太死，但把“明显模板化”踢掉
    .filter(s => !matchesGenericActionPattern(s));

  return getUniqueStrings(cleaned).slice(0, 2);
}

function diversifiedFallback(goalAnchor: string, debug?: string): PlanOut {
  // 兜底也要“多池”而不是固定模板
  const A_POOLS = [
    // identity
    [
      `I am the kind of person who shows up for ${goalAnchor}, even imperfectly.`,
      `I’m becoming someone who keeps promises to myself about ${goalAnchor}.`,
      `I can be both learning and committed to ${goalAnchor} at the same time.`
    ],
    // emotion
    [
      `Even when I feel stuck, I can stay gentle with myself while pursuing ${goalAnchor}.`,
      `I can feel pressure and still take a calm step toward ${goalAnchor}.`,
      `I don’t need perfect confidence to move with ${goalAnchor}.`
    ],
    // cognitive
    [
      `A slow day doesn’t cancel my progress in ${goalAnchor}.`,
      `I can treat setbacks in ${goalAnchor} as feedback, not failure.`,
      `I’m allowed to iterate my way into ${goalAnchor}.`
    ],
    // behavioral
    [
      `I choose one small action today that supports ${goalAnchor}.`,
      `I build momentum in ${goalAnchor} by starting before I feel ready.`,
      `My progress in ${goalAnchor} comes from small repeats, not big moods.`
    ],
    // environment/support
    [
      `I set up my environment to make ${goalAnchor} easier, not harder.`,
      `I can ask for support or tools that make ${goalAnchor} more likely.`,
      `I can reduce friction and help myself succeed in ${goalAnchor}.`
    ]
  ];

  const actionsPool = [
    `Set a 5-minute timer and do the smallest “first step” for ${goalAnchor}. (Just start; stop when the timer ends.)`,
    `Remove one tiny obstacle that blocks ${goalAnchor} (close a tab, prepare a file, put an item within reach).`,
    `Write a one-sentence plan for ${goalAnchor}: "Today I will ____ for 5 minutes." Then do it.`,
    `Do a 2-minute “setup” for ${goalAnchor} (open the doc, lay out tools, create a note titled "Next step").`
  ];

  // pick 1 from each pool (unique-ish by normalize)
  const affirmations: string[] = [];
  for (const pool of A_POOLS) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    affirmations.push(pick);
  }

  const actions = [
    actionsPool[Math.floor(Math.random() * actionsPool.length)],
    actionsPool[Math.floor(Math.random() * actionsPool.length)]
  ];

  // ensure uniqueness
  const uniqA = getUniqueStrings(affirmations).slice(0, 5);
  const uniqAct = getUniqueStrings(actions).slice(0, 2);

  return {
    goal_anchor: goalAnchor,
    affirmations: uniqA.length ? uniqA : affirmations,
    actions: uniqAct.length ? uniqAct : actions,
    debug
  };
}

async function callModel(goal: string) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(goal) }
    ],
    temperature: 0.9,
    top_p: 0.9
  };

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Model API error ${resp.status}: ${t.slice(0, 300)}`);
  }

  const json = await resp.json();
  const content =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    "";

  return String(content || "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { wish } = (req.body || {}) as { wish?: string };
    const goal = String(wish || "").trim();

    if (!goal) {
      res.status(200).json(diversifiedFallback("goal progress", "empty_goal"));
      return;
    }

    const raw = await callModel(goal);
    const parsed = parsePlanContent(raw) || {};

    const goal_anchor =
      typeof parsed.goal_anchor === "string" && parsed.goal_anchor.trim()
        ? parsed.goal_anchor.trim()
        : goal;

    const affirmations = softFilterAffirmations(
      coerceStringArray(parsed.affirmations, 8),
      goal_anchor
    );

    const actions = softFilterActions(coerceStringArray(parsed.actions, 5));

    // 如果模型输出不够，就用“多池兜底”补足，而不是整套回退成固定模板
    if (affirmations.length < 5 || actions.length < 2) {
      const fb = diversifiedFallback(goal_anchor, "partial_or_low_quality");
      res.status(200).json({
        goal_anchor,
        affirmations: (affirmations.length ? affirmations : fb.affirmations).slice(0, 5),
        actions: (actions.length ? actions : fb.actions).slice(0, 2),
        debug: fb.debug
      });
      return;
    }

    res.status(200).json({
      goal_anchor,
      affirmations: affirmations.slice(0, 5),
      actions: actions.slice(0, 2)
    });
  } catch (e: any) {
    const goal = String((req.body || {})?.wish || "").trim() || "goal progress";
    res.status(200).json(diversifiedFallback(goal, `exception:${String(e?.message || e)}`));
  }
}
