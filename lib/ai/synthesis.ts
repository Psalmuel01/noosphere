import { z } from 'zod';
import { env } from '../config';
import { QuestionRecord, SubmissionRecord } from '../models';

const synthesisSchema = z.object({
  consensusPoints: z.array(z.string()).default([]),
  dissensusPoints: z.array(z.string()).default([]),
  dominantConclusion: z.string().default(''),
  minorityViews: z.array(z.string()).default([]),
  summary: z.string().default(''),
});

const stopwords = new Set([
  'about',
  'above',
  'after',
  'again',
  'against',
  'because',
  'being',
  'between',
  'could',
  'different',
  'during',
  'first',
  'from',
  'global',
  'have',
  'into',
  'likely',
  'might',
  'other',
  'rather',
  'should',
  'their',
  'there',
  'these',
  'those',
  'through',
  'under',
  'which',
  'while',
  'would',
]);

export type GeminiSynthesis = z.infer<typeof synthesisSchema> & {
  provider: 'gemini' | 'local-fallback';
  providerDetail: string;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stopwords.has(token));
}

function sentenceCase(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function jaccard(a: Set<string>, b: Set<string>) {
  const union = new Set([...a, ...b]);
  let overlap = 0;

  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }

  return union.size === 0 ? 0 : overlap / union.size;
}

function summarizeTerms(tokens: string[]) {
  const counts = new Map<string, number>();

  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([token]) => token);
}

function clusterConclusions(submissions: SubmissionRecord[]) {
  const clusters: Array<{ submissions: SubmissionRecord[]; tokens: Set<string> }> = [];

  submissions.forEach((submission) => {
    const tokenSet = new Set(tokenize(`${submission.conclusion} ${submission.premises.join(' ')}`));
    const match = clusters.find((cluster) => jaccard(cluster.tokens, tokenSet) >= 0.18);

    if (match) {
      match.submissions.push(submission);
      tokenSet.forEach((token) => match.tokens.add(token));
      return;
    }

    clusters.push({
      submissions: [submission],
      tokens: tokenSet,
    });
  });

  return clusters
    .map((cluster) => ({
      ...cluster,
      weight: cluster.submissions.reduce((sum, submission) => sum + submission.confidence, 0),
      lead: cluster.submissions
        .slice()
        .sort((a, b) => b.confidence - a.confidence)[0],
    }))
    .sort((a, b) => b.weight - a.weight);
}

function rankedPremises(submissions: SubmissionRecord[], focusTerms: string[]) {
  const seen = new Set<string>();
  const focus = new Set(focusTerms);

  return submissions
    .flatMap((submission) =>
      submission.premises.map((premise) => {
        const tokens = tokenize(premise);
        const overlap = tokens.filter((token) => focus.has(token)).length;

        return {
          premise: sentenceCase(premise),
          score: submission.confidence * 2 + overlap,
        };
      }),
    )
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = normalizeText(item.premise);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4)
    .map((item) => item.premise);
}

function fallbackSynthesis(
  question: QuestionRecord,
  submissions: SubmissionRecord[],
  providerDetail = 'Gemini unavailable. Generated using local aggregation heuristics.',
): GeminiSynthesis {
  const ranked = [...submissions].sort((a, b) => b.confidence - a.confidence);
  const clusters = clusterConclusions(ranked);
  const dominantCluster = clusters[0];
  const alternativeClusters = clusters.slice(1);
  const topTerms = summarizeTerms(
    ranked.flatMap((submission) =>
      tokenize(`${submission.conclusion} ${submission.premises.join(' ')} ${submission.changeMind}`),
    ),
  );
  const consensusPoints = rankedPremises(dominantCluster?.submissions ?? ranked, topTerms);
  const dissensusPoints =
    alternativeClusters.length > 0
      ? alternativeClusters.slice(0, 3).map((cluster) => sentenceCase(cluster.lead.conclusion))
      : ranked.slice(1, 3).map((submission) => sentenceCase(submission.conclusion));
  const minorityViews = alternativeClusters
    .flatMap((cluster) => cluster.submissions.map((submission) => sentenceCase(submission.conclusion)))
    .slice(0, 3);
  const dominantConclusion = sentenceCase(dominantCluster?.lead.conclusion ?? ranked[0]?.conclusion ?? '');
  const avgConfidence =
    ranked.reduce((sum, submission) => sum + submission.confidence, 0) / Math.max(ranked.length, 1);
  const confidenceRange = `${Math.round(
    Math.min(...ranked.map((submission) => submission.confidence)) * 100,
  )}-${Math.round(Math.max(...ranked.map((submission) => submission.confidence)) * 100)}%`;
  const dominantSupport = dominantCluster?.submissions.length ?? 0;
  const alternativeSummary =
    alternativeClusters.length > 0
      ? `The main counter-position argues that ${alternativeClusters[0].lead.conclusion.toLowerCase()}.`
      : 'There was limited structured disagreement across the submitted arguments.';
  const themesSummary =
    topTerms.length > 0
      ? `Across the submissions, the most repeated themes were ${topTerms.slice(0, 4).join(', ')}.`
      : '';

  return {
    consensusPoints,
    dissensusPoints,
    dominantConclusion,
    minorityViews,
    summary: [
      `Noosphere reviewed ${ranked.length} reasoning submissions for "${question.title}".`,
      dominantConclusion
        ? `The dominant line of reasoning, supported by ${dominantSupport} submission${
            dominantSupport === 1 ? '' : 's'
          }, is that ${dominantConclusion.toLowerCase()}.`
        : '',
      themesSummary,
      consensusPoints.length > 0
        ? `The strongest supporting premises emphasized ${consensusPoints
            .slice(0, 2)
            .map((point) => point.toLowerCase())
            .join(' and ')}.`
        : '',
      alternativeSummary,
      `Reported confidence averaged ${Math.round(avgConfidence * 100)}%, with a range of ${confidenceRange}.`,
    ]
      .filter(Boolean)
      .join(' '),
    provider: 'local-fallback',
    providerDetail,
  };
}

function extractGeminiText(payload: any) {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini response did not include text content.');
  }

  return text;
}

export function getGeminiStatus() {
  if (!env.GEMINI_API_KEY) {
    return {
      ok: false,
      label: 'Gemini',
      detail: 'Missing GEMINI_API_KEY. Local fallback synthesis is active.',
    };
  }

  return {
    ok: true,
    label: 'Gemini',
    detail: `Configured with model ${env.GEMINI_MODEL}.`,
  };
}

export async function synthesizeReasoning(
  question: QuestionRecord,
  submissions: SubmissionRecord[],
): Promise<GeminiSynthesis> {
  const ranked = [...submissions]
    .sort((a, b) => b.persuasionScore - a.persuasionScore)
    .slice(0, 25);

  if (!env.GEMINI_API_KEY) {
    console.log('[Gemini] Using local fallback synthesis', {
      reason: 'Missing GEMINI_API_KEY.',
      question,
      submissions: ranked,
    });
    return fallbackSynthesis(question, ranked, 'Missing GEMINI_API_KEY. Generated using local aggregation heuristics.');
  }

  const formattedSubmissions = ranked
    .map(
      (submission, index) => `${index + 1}.
Conclusion:
${submission.conclusion}

Premises:
${submission.premises.map((premise, premiseIndex) => `${premiseIndex + 1}. ${premise}`).join('\n')}

Quality score: ${submission.persuasionScore}
Confidence: ${submission.confidence}`,
    )
    .join('\n\n');

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are synthesizing a collective reasoning session.

Analyze the reasoning submissions and produce:
1. Key consensus points
2. Major disagreements
3. The dominant conclusion
4. Minority viewpoints
5. A detailed analytical summary of the collective reasoning

Return strict JSON with this exact shape:
{
  "consensusPoints": [],
  "dissensusPoints": [],
  "dominantConclusion": "",
  "minorityViews": [],
  "summary": ""
}

Question:
${question.title}

Question description:
${question.description}

Reasoning submissions:

${formattedSubmissions}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    console.log('[Gemini] Synthesis request', requestBody);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${text}`);
    }

    const payload = await response.json();
    console.log('[Gemini] Synthesis response', payload);
    const parsed = synthesisSchema.parse(JSON.parse(extractGeminiText(payload)));
    console.log('[Gemini] Synthesis parsed', parsed);

    return {
      ...parsed,
      provider: 'gemini',
      providerDetail: `Generated with Gemini model ${env.GEMINI_MODEL}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(`Gemini synthesis failed, using local fallback instead: ${message}`);
    return fallbackSynthesis(question, ranked, `Gemini request failed (${message}). Generated using local aggregation heuristics.`);
  }
}
