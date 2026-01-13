import assert from "node:assert/strict";
import {
  countKeywordHits,
  extractKeywords,
  getUniqueStrings,
  hasKeywordCoverage,
  parsePlanContent
} from "../api/planUtils.js";

const run = () => {
  const parsed = parsePlanContent(
    '{"goal_anchor":"health habits","affirmations":["a"],"actions":["b"],"debug":"ANCHOR_MULTI_V2"}'
  );
  assert.equal(parsed.goal_anchor, "health habits");

  const parsedWrapped = parsePlanContent(
    'Here is your plan:\n{"goal_anchor":"career growth","affirmations":[],"actions":[],"debug":"ANCHOR_MULTI_V2"}\nThanks'
  );
  assert.equal(parsedWrapped.goal_anchor, "career growth");

  const keywords = extractKeywords("physical health habits");
  assert.deepEqual(keywords, ["physical", "health", "habits"]);
  assert.equal(countKeywordHits("I build physical health habits.", keywords), 3);
  assert.equal(hasKeywordCoverage("I build health habits.", keywords), true);
  assert.equal(hasKeywordCoverage("I build health.", keywords), false);

  const unique = getUniqueStrings(["Same", "same ", "Different"]);
  assert.deepEqual(unique, ["Same", "Different"]);
};

run();
console.log("plan utils tests passed");
