import {
  coerceStringArray,
  getUniqueStrings,
  hasConcreteObjectToken,
  matchesGenericActionPattern,
  normalizeText,
  parsePlanContent
} from "./planUtils.js";

const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3-vl-flash";

const SYSTEM_PROMPT = `You are a behavioral science coach.`;

const DEBUG_TAG = "LEVER_MULTI_V1";
const DEBUG_PLAN = process.env.DEBUG_PLAN === "true";

const buildUserPrompt = (goal: string, strictNoDuplicates = false) => `
User goal:
"${goal}"

Your task is to transform this goal into:
- 5 daily affirmations
- 2 micro-actions

The goal may be broad, open-ended, or long-term.
Do NOT restrict yourself to a single life domain unless the goal clearly implies one.

----------------
INTERNAL REASONING (do NOT output):

1) Identify 3–5 distinct levers that could realistically help a person achieve this goal.
   Examples of levers (choose only what fits):
   - identity or self-concept
   - skills or practice
   - habits or routines
   - environment or tools
   - motivation or energy
   - accountability or social support
   - planning or prioritization
   - emotional regulation
   - feedback or reflection

2) These levers must be meaningfully different from each other.
   Avoid trivial rewording.

----------------
OUTPUT RULES:

AFFIRMATIONS (5):
- Each affirmation must be based on a DIFFERENT lever.
- Each must express personal agency ("I", "my actions", "I choose", "I build").
- Each must reference a concrete aspect of the goal (not just "my goal").
- Do NOT copy or paste the user's goal sentence.
- Do NOT reuse the same sentence structure.
- Avoid generic motivational phrases (e
