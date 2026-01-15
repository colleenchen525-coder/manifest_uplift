const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

/**
 * 通用目标教练
 */
const SYSTEM_PROMPT = `You are a behavioral science coach.

Your task is to turn a user's goal into:
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { wish, nickname } = req.body || {};
  if (!wish || !nickname) {
    res.status(400).json({ error: "Missing wish or nickname" });
    return;
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "DASHSCOPE_API_KEY not configured" });
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
          { role: "user", content: buildUserPrompt(wish) }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText });
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "No model content" });
      return;
    }

    // 只做最宽松的 JSON 解析
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed?.affirmations || !parsed?.micro_actions) {
      res.status(500).json({ error: "Invalid model output" });
      return;
    }

    // ✅ 原样返回模型结果
    res.status(200).json({
      affirmations: parsed.affirmations,
      micro_actions: parsed.micro_actions
    });
  } catch (err) {
    console.error("DashScope request failed:", err);
    res.status(500).json({ error: "Model request failed" });
  }
}
