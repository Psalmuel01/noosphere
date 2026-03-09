import { env } from '../config';
import { PredictionFeatures } from '../contracts';

export interface ImpulsePrediction {
  persuasionScore: number;
  provider: 'impulse' | 'local-fallback';
  datasetRow: PredictionFeatures;
}

export interface ImpulseTrainingRow extends PredictionFeatures {
  mindChanged: number;
}

export function buildPredictionFeatures(input: {
  premises: string[];
  confidence: number;
  engagementCount?: number;
  createdAt?: string;
  deadline?: string;
  mindChanged?: number;
}) {
  const premiseCount = input.premises.length;
  const avgPremiseLength =
    input.premises.reduce((sum, premise) => sum + premise.length, 0) / Math.max(premiseCount, 1);
  const timeInSession =
    input.createdAt && input.deadline
      ? Math.max(
          0,
          (new Date(input.createdAt).getTime() - new Date(input.deadline).getTime()) /
            (1000 * 60),
        )
      : undefined;

  return {
    premiseCount,
    avgPremiseLength: Number(avgPremiseLength.toFixed(2)),
    confidence: input.confidence,
    engagementCount: input.engagementCount ?? 0,
    timeInSession,
    mindChanged: input.mindChanged,
  } satisfies PredictionFeatures;
}

export function formatTrainingDataset(
  rows: Array<PredictionFeatures & { mindChanged: number }>,
): ImpulseTrainingRow[] {
  return rows.map((row) => ({
    premiseCount: row.premiseCount,
    avgPremiseLength: Number(row.avgPremiseLength.toFixed(2)),
    confidence: Number(Math.max(0, Math.min(1, row.confidence)).toFixed(2)),
    engagementCount: Math.max(0, Math.trunc(row.engagementCount)),
    timeInSession: row.timeInSession,
    mindChanged: row.mindChanged ? 1 : 0,
  }));
}

function fallbackPersuasionScore(features: PredictionFeatures) {
  const score =
    0.18 +
    Math.min(features.premiseCount / 4, 1) * 0.2 +
    Math.min(features.avgPremiseLength / 180, 1) * 0.18 +
    Math.min(features.confidence, 1) * 0.2 +
    Math.min(features.engagementCount / 10, 1) * 0.12;

  return Number(Math.max(0.1, Math.min(0.98, score)).toFixed(2));
}

export function getImpulseStatus() {
  if (!env.IMPULSE_API_BASE_URL || !env.IMPULSE_API_KEY) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_API_BASE_URL or IMPULSE_API_KEY. Local fallback scoring is active.',
    };
  }

  return {
    ok: true,
    label: 'Impulse AI',
    detail: `Configured for ${env.IMPULSE_MODEL_ID} at ${env.IMPULSE_API_BASE_URL}.`,
  };
}

export async function checkImpulseHealth() {
  if (!env.IMPULSE_API_BASE_URL || !env.IMPULSE_API_KEY) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_API_BASE_URL or IMPULSE_API_KEY. Local fallback scoring is active.',
    };
  }

  try {
    const response = await fetch(`${env.IMPULSE_API_BASE_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.IMPULSE_API_KEY}`,
      },
      body: JSON.stringify({
        modelId: env.IMPULSE_MODEL_ID,
        premiseCount: 2,
        avgPremiseLength: 120,
        confidence: 0.6,
        engagementCount: 1,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        label: 'Impulse AI',
        detail: `Prediction probe failed with ${response.status}.`,
      };
    }

    return {
      ok: true,
      label: 'Impulse AI',
      detail: `Prediction API reachable at ${env.IMPULSE_API_BASE_URL}.`,
    };
  } catch (error) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: error instanceof Error ? error.message : 'Impulse health probe failed.',
    };
  }
}

export async function predictPersuasion(features: PredictionFeatures): Promise<ImpulsePrediction> {
  if (!env.IMPULSE_API_BASE_URL || !env.IMPULSE_API_KEY) {
    return {
      persuasionScore: fallbackPersuasionScore(features),
      provider: 'local-fallback',
      datasetRow: features,
    };
  }

  const response = await fetch(`${env.IMPULSE_API_BASE_URL.replace(/\/$/, '')}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.IMPULSE_API_KEY}`,
    },
    body: JSON.stringify({
      modelId: env.IMPULSE_MODEL_ID,
      ...features,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Impulse prediction failed: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { persuasionScore?: number; score?: number };
  const persuasionScore = payload.persuasionScore ?? payload.score;

  if (typeof persuasionScore !== 'number' || Number.isNaN(persuasionScore)) {
    throw new Error('Impulse prediction response did not include a numeric persuasionScore.');
  }

  return {
    persuasionScore: Number(Math.max(0, Math.min(1, persuasionScore)).toFixed(2)),
    provider: 'impulse',
    datasetRow: features,
  };
}
