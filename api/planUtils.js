const WORD_REGEX = /[a-z0-9]+/gi;
const STOPWORDS = new Set([
  "i",
  "want",
  "to",
  "be",
  "my",
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "for",
  "of",
  "with",
  "get",
  "make",
  "become",
  "grow",
  "more",
  "improve",
  "improving",
  "better",
  "your",
  "our",
  "we"
]);

const GENERIC_ACTION_PATTERNS = [
  /write down one concrete step/i,
  /track one habit/i,
  /write one measurable action/i,
  /write down one measurable action/i,
  /write down one action/i,
  /note one measurable action/i
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
  "focusing"
]);

const normalizeText = value => value.toLowerCase().replace(/\s+/g, " ").trim();

const getWords = text => (text.match(WORD_REGEX) || []).map(word => word.toLowerCase());

const extractKeywords = text => {
  const words = getWords(text).filter(word => word.length >= 3);
  return [...new Set(words)];
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countKeywordHits = (text, keywords) => {
  const normalized = normalizeText(text);
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
    return regex.test(normalized) ? count + 1 : count;
  }, 0);
};

const hasKeywordCoverage = (text, keywords) => {
  const requiredHits = Math.min(2, keywords.length);
  if (requiredHits === 0) return false;
  return countKeywordHits(text, keywords) >= requiredHits;
};

const getWordCount = text => getWords(text).length;

const isValidGoalAnchor = (goalAnchor, goal) => {
  if (typeof goalAnchor !== "string") return false;
  const trimmed = goalAnchor.trim();
  if (!trimmed) return false;
  const wordCount = getWordCount(trimmed);
  if (wordCount < 2 || wordCount > 6) return false;
  return normalizeText(trimmed) !== normalizeText(goal);
};

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
  GENERIC_ACTION_PATTERNS.some(pattern => pattern.test(action));

const hasConcreteObjectToken = (action, anchorKeywords) => {
  const tokens = getWords(action).filter(word => word.length >= 3);
  return tokens.some(
    token => !GENERIC_ACTION_WORDS.has(token) && !anchorKeywords.includes(token)
  );
};

const coerceStringArray = (value, limit) => {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === "string").slice(0, limit);
};

const parsePlanContent = content => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
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

const deriveFallbackGoalAnchor = goal => {
  const goalWords = getWords(goal);
  const filtered = goalWords.filter(word => !STOPWORDS.has(word));
  let selected = filtered.slice(0, 4);
  if (selected.length === 1) {
    selected = [selected[0], "progress"];
  }
  if (selected.length === 0) {
    selected = ["goal", "progress"];
  }
  const anchor = selected.join(" ").trim();
  if (!anchor || normalizeText(anchor) === normalizeText(goal)) {
    return "goal progress";
  }
  return anchor;
};

const selectAnchorKeywords = goalAnchor => {
  const keywords = extractKeywords(goalAnchor);
  if (keywords.length >= 2) return keywords.slice(0, 2);
  const anchorWords = getWords(goalAnchor).filter(word => word.length >= 3);
  if (anchorWords.length >= 2) return anchorWords.slice(0, 2);
  if (anchorWords.length === 1) return [anchorWords[0], "progress"];
  return ["goal", "progress"];
};

const buildFallbackResponse = (goalAnchor, debugTag) => {
  const [kw1, kw2] = selectAnchorKeywords(goalAnchor);
  const keywordPair = `${kw1} ${kw2}`.trim();
  const affirmations = [
    `I choose daily behaviors that strengthen my ${keywordPair}.`,
    `My ${keywordPair} grows as I build consistent habits.`,
    `I am capable of making ${keywordPair} gains through my choices.`,
    `I take ownership of my ${keywordPair} by practicing focused actions.`,
    `I commit to ${keywordPair} improvements with steady effort.`
  ];

  const actions = [
    `Write a 3-item list of ${keywordPair} resources you can use this week.`,
    `Draft a 2-sentence note describing one ${keywordPair} step you will take tomorrow and the tool or person involved.`
  ];

  return {
    goal_anchor: goalAnchor,
    affirmations,
    actions,
    debug: debugTag
  };
};

export {
  buildFallbackResponse,
  coerceStringArray,
  countKeywordHits,
  deriveFallbackGoalAnchor,
  extractKeywords,
  getUniqueStrings,
  hasConcreteObjectToken,
  hasKeywordCoverage,
  isValidGoalAnchor,
  matchesGenericActionPattern,
  normalizeText,
  parsePlanContent
};
