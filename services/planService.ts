import { ManifestationPlan, GoalAction, Affirmation } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Safer fallback:
 * - NEVER repeat the same sentence
 * - Still goal-anchored
 */
const fallbackPlan = (goalAnchor: string): ManifestationPlan => {
  const affirmations = [
    `I am taking small, consistent steps toward ${goalAnchor}.`,
    `My daily choices support my progress in ${goalAnchor}.`,
    `I am capable of moving forward in ${goalAnchor}, one step at a time.`,
    `I build confidence in ${goalAnchor} through action.`,
    `Today, I show up intentionally for ${goalAnchor}.`
  ].map(text => ({
    id: generateId(),
    text,
    isAcknowledged: false
  }));

  const actions = [
    `Write down one concrete action you can take today related to ${goalAnchor}.`,
    `Identify one tool, person, or resource that can support ${goalAnchor} today.`
  ].map(text => ({
    id: generateId(),
    text,
    isCompleted: false
  }));

  return {
    affirmations,
    actions,
    generatedAt: new Date().toISOString()
  };
};

type PlanResponse = {
  goal_anchor?: string;
  affirmations?: string[];
  actions?: string[];
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish, nickname, history })
    });

    if (!response.ok) {
      throw new Error(`Plan API failed with status ${response.status}`);
    }

    const data = (await response.json()) as PlanResponse;

    const goalAnchor =
      typeof data.goal_anchor === "string" && data.goal_anchor.trim()
        ? data.goal_anchor.trim()
        : wish.trim();

    // Use model output if present; DO NOT auto-duplicate
    const affirmationTexts =
      Array.isArray(data.affirmations) && data.affirmations.length >= 3
        ? data.affirmations.slice(0, 5)
        : [];

    const actionTexts =
      Array.isArray(data.actions) && data.actions.length >= 1
        ? data.actions.slice(0, 2)
        : [];

    // If model gave us nothing usable → fallback
    if (affirmationTexts.length === 0 || actionTexts.length === 0) {
      return fallbackPlan(goalAnchor);
    }

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
