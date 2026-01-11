import { GoogleGenAI, Type } from "@google/genai";
import { ManifestationPlan, MicroAction, Affirmation } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generatePlanFromWish = async (wish: string, nickname: string, history: any[] = []): Promise<ManifestationPlan> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const historyContext = history.length > 0 
    ? `User History: ${JSON.stringify(history.slice(0, 3))}` 
    : "No previous history.";

  const systemPrompt = `
    You are an expert in Behavioral Psychology and Self-Affirmation Theory.
    Help user "${nickname}" turn a wish into a plan.
    
    Context: ${historyContext}

    1. **Affirmations**: Create 5 distinct, powerful, present-tense "I am" statements. 
       **CONSTRAINT**: Each affirmation must be **UNDER 10 WORDS**.
    2. **Reasoning**: For each affirmation, briefly explain scientifically why it works (1 sentence).
    3. **Micro-Actions**: Break the wish down into **EXACTLY 2** incredibly small, immediate actions (Tiny Habits). 
       These must be doable TODAY, taking less than 5 minutes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `My wish is: "${wish}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            affirmations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The affirmation statement (max 10 words)." },
                  reasoning: { type: Type.STRING, description: "Scientific reasoning." }
                },
                required: ["text", "reasoning"]
              },
              description: "List of 5 distinct affirmations."
            },
            microActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of exactly 2 immediate micro-actions."
            }
          },
          required: ["affirmations", "microActions"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    const microActions: MicroAction[] = data.microActions.slice(0, 2).map((actionText: string) => ({
      id: generateId(),
      text: actionText,
      isCompleted: false
    }));

    const affirmations: Affirmation[] = data.affirmations.map((aff: any) => ({
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
    return {
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
    };
  }
};