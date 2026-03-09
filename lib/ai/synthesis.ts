import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config';
import { QuestionRecord, SubmissionRecord } from '../contracts';

const synthesisSchema = z.object({
  consensusPoints: z.array(z.string()).default([]),
  dissensusPoints: z.array(z.string()).default([]),
  dominantConclusion: z.string().default(''),
  minorityViews: z.array(z.string()).default([]),
  summary: z.string().default(''),
});

export type OpenAISynthesis = z.infer<typeof synthesisSchema> & {
  provider: 'openai' | 'local-fallback';
};

function fallbackSynthesis(question: QuestionRecord, submissions: SubmissionRecord[]): OpenAISynthesis {
  const ranked = [...submissions].sort((a, b) => b.confidence - a.confidence);
  const dominant = ranked[0];

  return {
    consensusPoints: ranked.flatMap((submission) => submission.premises).slice(0, 3),
    dissensusPoints: ranked.slice(1, 3).map((submission) => submission.conclusion),
    dominantConclusion: dominant?.conclusion ?? '',
    minorityViews: ranked.slice(1, 3).map((submission) => submission.conclusion),
    summary: `Fallback synthesis for "${question.title}" based on the top ${
      Math.min(ranked.length, 3)
    } persuasive submissions.`,
    provider: 'local-fallback',
  };
}

export function getOpenAIStatus() {
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      label: 'OpenAI',
      detail: 'Missing OPENAI_API_KEY. Local fallback synthesis is active.',
    };
  }

  return {
    ok: true,
    label: 'OpenAI',
    detail: `Configured with model ${env.OPENAI_MODEL}.`,
  };
}

export async function synthesizeReasoning(
  question: QuestionRecord,
  submissions: SubmissionRecord[],
): Promise<OpenAISynthesis> {
  const ranked = [...submissions]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 25);

  if (!env.OPENAI_API_KEY) {
    return fallbackSynthesis(question, ranked);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const formattedSubmissions = ranked
    .map(
      (submission, index) => `${index + 1}.
Conclusion:
${submission.conclusion}

Premises:
${submission.premises.map((premise, premiseIndex) => `${premiseIndex + 1}. ${premise}`).join('\n')}

Confidence: ${submission.confidence}`,
    )
    .join('\n\n');

  try {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      instructions:
        'Analyze the reasoning submissions and produce: 1. Key consensus points 2. Major disagreements 3. The dominant conclusion 4. Minority viewpoints 5. A short summary of the collective reasoning. Respond with strict JSON matching the provided schema.',
      input: [
        {
          role: 'user',
          content: `Question:
${question.title}

Question description:
${question.description}

Reasoning submissions:

${formattedSubmissions}`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'noosphere_synthesis',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              consensusPoints: { type: 'array', items: { type: 'string' } },
              dissensusPoints: { type: 'array', items: { type: 'string' } },
              dominantConclusion: { type: 'string' },
              minorityViews: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
            },
            required: [
              'consensusPoints',
              'dissensusPoints',
              'dominantConclusion',
              'minorityViews',
              'summary',
            ],
          },
        },
      },
    });

    const parsed = synthesisSchema.parse(JSON.parse(response.output_text));

    return {
      ...parsed,
      provider: 'openai',
    };
  } catch (error) {
    console.warn(
      `OpenAI synthesis failed, using local fallback instead: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return fallbackSynthesis(question, ranked);
  }
}
