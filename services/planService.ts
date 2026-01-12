import { ManifestationPlan, MicroAction, Affirmation } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const fallbackPlan = (): ManifestationPlan => ({
  affirmations: [
    { id: generateId(), text: "I am capable of change.", reasoning: "Self-efficacy is the foundation of action.", isAcknowledged: false },
    { id: generateId(), text: "I embrace small steps.", reasoning: "Small wins build momentum.", isAcknowledged: false },
    { id: generateId(), text: "I focus on progress.", reasoning: "Perfectionism hinders execution.", isAcknowledged: false },
    { id: generateId(), text: "I am building a better me.", reasoning: "Identity-based habits stick longer.", isAcknowledged: false },
    { id: generateId(), text: "I trust the process.", reasoning: "Patience reduces cognitive load.", isAcknowledged: false },
  ],
  microActions: [
    { id: generateId(), text: "Take 3 deep breaths right now.", isCompleted: false },
    { id: generateId(), text: "Write down one top priority.", isCompleted: false }
  ],
  generatedAt: new Date().toISOString()
});

type PlanResponse = {
  affirmations: { text: string; reasoning: string }[];
  microActions: string[];
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

    const microActions: MicroAction[] = (data.microActions || []).slice(0, 2).map((actionText: string) => ({
      id: generateId(),
      text: actionText,
      isCompleted: false
    }));

    const affirmations: Affirmation[] = (data.affirmations || []).slice(0, 5).map((aff: any) => ({
      id: generateId(),
      text: aff.text,
      reasoning: aff.reasoning,
      isAcknowledged: false
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
