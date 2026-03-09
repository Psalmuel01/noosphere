const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'almost',
  'also',
  'among',
  'because',
  'before',
  'being',
  'between',
  'could',
  'every',
  'first',
  'from',
  'have',
  'into',
  'more',
  'most',
  'other',
  'should',
  'since',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'under',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
]);

function normalizeToken(token: string) {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(ing|ed|ly|es|s)$/g, '');
}

export function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function extractKeywords(texts: string[], limit = 10) {
  const counts = new Map<string, number>();

  texts.flatMap(tokenize).forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

export function keywordSimilarity(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  a.forEach((token) => {
    if (b.has(token)) {
      overlap += 1;
    }
  });

  return overlap / new Set([...a, ...b]).size;
}

export function scoreReasoning(
  premises: string[],
  conclusion: string,
  reasoningTypes: string[],
  changeMind: string,
  confidence: number,
) {
  const premiseKeywords = extractKeywords(premises, 12);
  const conclusionKeywords = extractKeywords([conclusion], 8);
  const lexicalBridge = keywordSimilarity(premiseKeywords, conclusionKeywords);
  const avgPremiseLength =
    premises.reduce((sum, premise) => sum + premise.trim().split(/\s+/).length, 0) /
    Math.max(premises.length, 1);
  const conclusionLength = conclusion.trim().split(/\s+/).length;
  const changeMindLength = changeMind.trim().split(/\s+/).filter(Boolean).length;
  const confidenceBalance = 1 - Math.abs(confidence - 7) / 7;
  const structureScore = Math.min(premises.length / 4, 1);
  const richnessScore = Math.min(avgPremiseLength / 18, 1);
  const conclusionScore = Math.min(conclusionLength / 20, 1);
  const reasoningTypeScore = Math.min(reasoningTypes.length / 3, 1);
  const falsifiabilityScore = Math.min(changeMindLength / 18, 1);
  const dedupePenalty =
    premiseKeywords.length < Math.max(3, premises.length * 2) ? 0.08 : 0;

  const score =
    0.16 +
    structureScore * 0.16 +
    richnessScore * 0.18 +
    conclusionScore * 0.16 +
    lexicalBridge * 0.16 +
    confidenceBalance * 0.1 +
    reasoningTypeScore * 0.12 +
    falsifiabilityScore * 0.12 -
    dedupePenalty;

  return Number(Math.max(0.35, Math.min(0.97, score)).toFixed(2));
}

export function clusterLabelFromKeywords(keywords: string[]) {
  const [first, second] = keywords;

  if (!first) {
    return 'Emergent Cluster';
  }

  if (!second) {
    return `${capitalize(first)} Cluster`;
  }

  return `${capitalize(first)} / ${capitalize(second)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
