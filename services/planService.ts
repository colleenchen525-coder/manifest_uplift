import { ManifestationPlan, MicroAction, Affirmation } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const fallbackPlan = (): ManifestationPlan => ({
  affirmations: [
    { id: generateId(), text: "I am taking steady steps toward my financial goal.", isAcknowledged: false },
    { id: generateId(), text: "I control my spending choices to build financial security.", isAcknowledged: false },
    { id: generateId(), text: "I am actively growing my career skills every day.", isAcknowledged: false },
    { id: generateId(), text: "I am prioritizing my health through consistent daily habits.", isAcknowledged: false },
    { id: generateId(), text: "I am showing up for my relationships with care and intention.", isAcknowledged: false }
  ],
  microActions: [
    { id: generateId(), text: "Track one expense or habit related to your goal for 10 minutes.", isCompleted: false },
    { id: generateId(), text: "Write down one measurable action you can complete today.", isCompleted: false }
  ],
  generatedAt: new Date().toISOString()
});

type PlanResponse = {
  affirmations: string[];
  micro_actions: string[];
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

    const fallback = fallbackPlan();
    const affirmationTexts = Array.isArray(data.affirmations) && data.affirmations.length
      ? data.affirmations.slice(0, 5)
      : fallback.affirmations.map(affirmation => affirmation.text);
    const microActionTexts = Array.isArray(data.micro_actions) && data.micro_actions.length
      ? data.micro_actions.slice(0, 2)
      : fallback.microActions.map(action => action.text);

    const affirmations: Affirmation[] = affirmationTexts.map(text => ({
      id: generateId(),
      text,
      isAcknowledged: false
    }));

    const microActions: MicroAction[] = microActionTexts.map(text => ({
      id: generateId(),
      text,
      isCompleted: false
    }));

    return {
      affirmations,
      microActions,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating plan:", error);
    return fallbackPlan();
  }
};
