import { ManifestationPlan, GoalAction, Affirmation } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const fallbackPlan = (goalAnchor: string): ManifestationPlan => ({
  affirmations: Array.from({ length: 5 }, () => ({
    id: generateId(),
    text: `I am taking intentional actions toward my ${goalAnchor}.`,
    isAcknowledged: false
  })),
  actions: Array.from({ length: 2 }, () => ({
    id: generateId(),
    text: `Write down one concrete step you can take today related to ${goalAnchor}.`,
    isCompleted: false
  })),
  generatedAt: new Date().toISOString()
});

type PlanResponse = {
  goal_anchor?: string;
  affirmations: string[];
  actions: string[];
  debug?: string;
};

export const generatePlanFromWish = async (
  wish: string,
  nickname: string,
  history: any[] = []
): Promise<ManifestationPlan> => {
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ wish, nickname, history })
    });

    if (!response.ok) {
      throw new Error(`Plan API failed with status ${response.status}`);
    }

    const data = (await response.json()) as PlanResponse;
    const goalAnchor = (typeof data.goal_anchor === "string" && data.goal_anchor.trim())
      ? data.goal_anchor.trim()
      : wish.trim();

    const fallback = fallbackPlan(goalAnchor);
    const affirmationTexts = Array.isArray(data.affirmations) && data.affirmations.length
      ? data.affirmations.slice(0, 5)
      : fallback.affirmations.map(affirmation => affirmation.text);
    const actionTexts = Array.isArray(data.actions) && data.actions.length
      ? data.actions.slice(0, 2)
      : fallback.actions.map(action => action.text);

    const affirmations: Affirmation[] = affirmationTexts.map(text => ({
      id: generateId(),
      text,
      isAcknowledged: false
    }));

    const actions: GoalAction[] = actionTexts.map(text => ({
      id: generateId(),
      text,
      isCompleted: false
    }));

    return {
      affirmations,
      actions,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating plan:", error);
    return fallbackPlan(wish.trim() || "goal progress");
  }
};
