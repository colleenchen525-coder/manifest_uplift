import { ManifestationPlan } from "../types";
import { generateId } from "../utils/id";

/**
 * 极简兜底：
 * - 只在系统失败（没网 / API 报错）时使用
 * - 内容宽泛，不带任何领域
 */
const fallbackPlan = (): ManifestationPlan => ({
  affirmations: [
    { id: generateId(), text: "I take one small step today that supports my goal.", isAcknowledged: false },
    { id: generateId(), text: "I build progress through consistent practice.", isAcknowledged: false },
    { id: generateId(), text: "I focus on what I can do today.", isAcknowledged: false },
    { id: generateId(), text: "I stay patient and keep moving forward.", isAcknowledged: false },
    { id: generateId(), text: "I trust small actions to compound over time.", isAcknowledged: false }
  ],
  microActions: [
    { id: generateId(), text: "Choose one 10-minute action that moves your goal forward.", isCompleted: false },
    { id: generateId(), text: "Decide when you will take the next small step.", isCompleted: false }
  ],
  generatedAt: new Date().toISOString()
});

export async function generatePlanFromWish(
  wish: string,
  nickname: string
): Promise<ManifestationPlan> {
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish, nickname })
    });

    // ❗只有 HTTP 失败才兜底
    if (!response.ok) {
      throw new Error(`Plan API error: ${response.status}`);
    }

    const data = await response.json();

    // ✅ 如实展示模型回答（不做任何补齐/校验）
    return {
      affirmations: data.affirmations.map((text: string) => ({
        id: generateId(),
        text,
        isAcknowledged: false
      })),
      microActions: data.micro_actions.map((text: string) => ({
        id: generateId(),
        text,
        isCompleted: false
      })),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Plan generation failed, fallback used:", error);
    return fallbackPlan();
  }
}
