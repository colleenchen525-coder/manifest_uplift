import { buildFallbackResponse, deriveFallbackGoalAnchor } from "../api/planUtils.js";

const goals = [
  "I want to be rich",
  "I want to get healthier",
  "I want to improve my relationship"
];

for (const goal of goals) {
  const anchor = deriveFallbackGoalAnchor(goal);
  const plan = buildFallbackResponse(anchor, "ANCHOR_MULTI_V2");
  console.log(`Goal: ${goal}`);
  console.log(JSON.stringify(plan, null, 2));
  console.log("---");
}
