const WORD_REGEX = /[a-z0-9]+/gi;

const GENERIC_ACTION_PATTERNS = [
  /write down one concrete step/i,
  /track one habit/i,
  /write one measurable action/i,
  /write down one measurable action/i,
  /write down one action/i,
  /note one measurable action/i,
  /one step at a time/i
];

const GENERIC_ACTION_WORDS = new Set([
  "write",
  "down",
  "one",
  "two",
  "three",
  "four",
  "five",
  "today",
  "daily",
  "weekly",
  "step",
  "steps",
  "track",
  "tracking",
  "habit",
  "habits",
  "measurable",
  "action",
  "actions",
  "plan",
  "plans",
  "planning",
  "goal",
  "goals",
  "list",
  "lists",
  "note",
  "notes",
  "journal",
  "reflect",
  "reflection",
  "think",
  "thinking",
  "review",
  "record",
  "recording",
  "log",
  "logging",
  "simple",
  "quick",
  "short",
  "minute",
  "minutes",
  "task",
  "tasks",
  "practice",
  "practicing",
  "progress",
  "improve",
  "improving",
  "build",
  "building",
  "focus",
  "focusing",
  "toward",
  "related"
]);

// IMPORTANT: stricter normalize to prevent "punctuation-only" differences
const normalizeText = value =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();

const getWords = text => (String(text || "").match(WORD_REGEX) || []).map(w => w.toLowerCase());

const getUniqueStrings = items => {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(item);
  }
  return unique;
};

const matchesGenericActionPattern = action =>
  GENERIC_ACTION_PATTERNS.some(pattern => pattern.test(String(action || "")));

// "Concrete object token" heuristic:
// action must contain at least one token that is NOT generic and NOT in anchorKeywords (we pass [] in C方案)
const hasConcreteObjectToken = (action, anchorKeywords = []) => {
  const tokens = getWords(action).filter(w => w.length >= 3);
  return tokens.some(token => !GENERIC_ACTION_WORDS.has(token) && !anchorKeywords.includes(token));
};

const coerceStringArray = (value, limit) => {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === "string").slice(0, limit);
};

const parsePlanContent = content => {
  try {
    return JSON.parse(content);
  } catch {
    const match = String(content || "").match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export {
  coerceStringArray,
  getUniqueStrings,
  hasConcreteObjectToken,
  matchesGenericActionPattern,
  normalizeText,
  parsePlanContent
};
