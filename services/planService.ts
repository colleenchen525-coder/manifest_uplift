const fallbackPlan = (goalAnchor: string): ManifestationPlan => {
  const pools = [
    [
      `I can move with ${goalAnchor} without needing perfect confidence.`,
      `I’m allowed to learn my way into ${goalAnchor}.`,
      `I keep my promises to myself about ${goalAnchor}, even in small ways.`
    ],
    [
      `A slow day doesn’t erase my progress in ${goalAnchor}.`,
      `I can reset and try again with ${goalAnchor}.`,
      `I treat setbacks in ${goalAnchor} as feedback, not failure.`
    ],
    [
      `I make ${goalAnchor} easier by reducing one small friction today.`,
      `I set up my environment to support ${goalAnchor}.`,
      `I can ask for one resource that supports ${goalAnchor}.`
    ]
  ];

  const pickOne = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const rawAff = [
    pickOne(pools[0]),
    pickOne(pools[1]),
    pickOne(pools[2]),
    pickOne(pools[0]),
    pickOne(pools[1])
  ];

  // 去重（防止随机撞车）
  const seen = new Set<string>();
  const affirmations = rawAff
    .filter(s => {
      const k = s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5)
    .map(text => ({ id: generateId(), text, isAcknowledged: false }));

  const actionPool = [
    `Set a 5-minute timer and do the smallest first step for ${goalAnchor}.`,
    `Remove one tiny obstacle blocking ${goalAnchor} (prep, open, place, simplify).`,
    `Write one sentence: "Today I will ____ for 5 minutes for ${goalAnchor}." Then do it.`
  ];

  const actions = [pickOne(actionPool), pickOne(actionPool)]
    .map(text => ({ id: generateId(), text, isCompleted: false }));

  return { affirmations, actions, generatedAt: new Date().toISOString() };
};
