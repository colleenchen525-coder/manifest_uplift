import { ManifestationPlan, Affirmation, MicroAction } from "../types";

// Helper to generate unique IDs (keep it local; no external import)
const generateId = () => Math.random().toString(36).slice(2, 11);

type PlanResponse = {
  affirmations: string[];
  micro_actions: string[];
};

/**
 * Minimal, broad fallback
 * Only used when:
 * - network error / fetch throws
 * - HTTP not ok
 * - response shape invalid
 */
const fallbackPlan = (): ManifestationPlan => ({
  affirmations: [
    { id: generateId(), text: "I take one small step today that supports my goal.", isAcknowledged: false },
    { id: generateId(), text: "I build progress through consistent practice.", isAcknowledged: false },
    { id: generateId(), text: "I focus on what I can control today.", isAcknowledged: false },
    { id: generateId(), text: "I keep moving forward, even with small steps.", isAcknowledged: false },
    { id: generateId(), text: "I trust steady actions to create change.", isAcknowledged: false }
  ],
  microActions: [
    { id: generateId(), text: "Do one 10-minute action that directly supports your goal.", isCompleted: false },
    { id: generateId(), text: "Decide the next time you will practice or take action.", isCompleted: false }
  ],
  generatedAt: new Date().toISOString()
});

export const generatePlanFromWish = async (
  wish: string,
  nickname: string,
  history: any[] = []
): Promise<ManifestationPlan> => {
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish, nickname, history })
    });

    if (!response.ok) {
      throw new Error(`Plan API failed with status ${response.status}`);
    }

    const data = (await response.json()) as Partial<PlanResponse>;

    // ✅ No "补齐" / no fallback mixing.
    // If response shape is wrong, treat as error and fallback.
    if (!Array.isArray(data.affirmations) || !Array.isArray(data.micro_actions)) {
      throw new Error("Invalid plan response shape");
    }

    const affirmations: Affirmation[] = data.affirmations.slice(0, 5).map((text) => ({
      id: generateId(),
      text: String(text),
      isAcknowledged: false
    }));

    const microActions: MicroAction[] = data.micro_actions.slice(0, 2).map((text) => ({
      id: generateId(),
      text: String(text),
      isCompleted: false
    }));

    return {
      affirmations,
      microActions,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating plan (fallback used):", error);
    return fallbackPlan();
  }
};
