import { env } from '../config';
import { PredictionFeatures } from '../models';

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
  conclusion: string;
  changeMind?: string;
  engagementCount?: number;
  createdAt?: string;
  deadline?: string;
  mindChanged?: number;
}) {
  const premiseCount = input.premises.length;
  const avgPremiseLength =
    input.premises.reduce((sum, premise) => sum + premise.length, 0) / Math.max(premiseCount, 1);
  const conclusionLength = input.conclusion.trim().length;
  const hasChangeMind = Boolean(input.changeMind && input.changeMind.trim().length > 0);
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
    conclusionLength,
    hasChangeMind,
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
    conclusionLength: Math.max(0, Math.trunc(row.conclusionLength)),
    hasChangeMind: Boolean(row.hasChangeMind),
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
    Math.min(features.conclusionLength / 180, 1) * 0.08 +
    (features.hasChangeMind ? 0.04 : 0) +
    Math.min(features.engagementCount / 10, 1) * 0.12;

  return Number(Math.max(0.1, Math.min(0.98, score)).toFixed(2));
}

export function getImpulseStatus() {
  if (!env.IMPULSE_API_KEY) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_API_KEY. Local fallback scoring is active.',
    };
  }

  const trainingConfigured = Boolean(env.IMPULSE_API_BASE_URL);
  const inferenceConfigured = Boolean(
    env.IMPULSE_INFERENCE_BASE_URL && env.IMPULSE_DEPLOYMENT_ID,
  );

  if (!inferenceConfigured) {
    const notes: string[] = [
      'Impulse inference not configured. Local fallback scoring is active.',
    ];

    if (trainingConfigured && env.IMPULSE_API_BASE_URL) {
      notes.push(`Training base URL set (${env.IMPULSE_API_BASE_URL}).`);
    }

    if (!env.IMPULSE_INFERENCE_BASE_URL) {
      notes.push('Set IMPULSE_INFERENCE_BASE_URL when inference is available.');
    }

    if (!env.IMPULSE_DEPLOYMENT_ID) {
      notes.push('Set IMPULSE_DEPLOYMENT_ID after deploying a model.');
    }

    return {
      ok: false,
      label: 'Impulse AI',
      detail: notes.join(' '),
    };
  }

  return {
    ok: true,
    label: 'Impulse AI',
    detail: `Inference configured for deployment ${env.IMPULSE_DEPLOYMENT_ID} at ${env.IMPULSE_INFERENCE_BASE_URL}.`,
  };
}

export async function checkImpulseHealth() {
  if (!env.IMPULSE_API_KEY) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_API_KEY. Local fallback scoring is active.',
    };
  }

  if (!env.IMPULSE_INFERENCE_BASE_URL || !env.IMPULSE_DEPLOYMENT_ID) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_INFERENCE_BASE_URL or IMPULSE_DEPLOYMENT_ID. Local fallback scoring is active.',
    };
  }

  return {
    ok: true,
    label: 'Impulse AI',
    detail:
      'Inference configuration present. Live probe is skipped until an inference endpoint is confirmed.',
  };
}

export async function predictPersuasion(features: PredictionFeatures): Promise<ImpulsePrediction> {
  if (
    !env.IMPULSE_API_KEY ||
    !env.IMPULSE_INFERENCE_BASE_URL ||
    !env.IMPULSE_DEPLOYMENT_ID
  ) {
    console.log('[Impulse] Using local fallback scoring', {
      reason: 'Missing IMPULSE_API_KEY, IMPULSE_INFERENCE_BASE_URL, or IMPULSE_DEPLOYMENT_ID.',
      features,
    });
    return {
      persuasionScore: fallbackPersuasionScore(features),
      provider: 'local-fallback',
      datasetRow: features,
    };
  }

  try {
    const requestBody = {
      deployment_id: env.IMPULSE_DEPLOYMENT_ID,
      inputs: {
        confidence: features.confidence,
        premise_count: features.premiseCount,
        has_change_mind: features.hasChangeMind,
        conclusion_length: features.conclusionLength,
        avg_premise_length: features.avgPremiseLength,
      },
    };

    console.log('[Impulse] Inference request', requestBody);

    const response = await fetch(`${env.IMPULSE_INFERENCE_BASE_URL.replace(/\/$/, '')}/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.IMPULSE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Impulse inference failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as {
      score?: number;
      prediction?: number | { quality_score?: number; score?: number };
      quality_score?: number;
      output?: number | { quality_score?: number; score?: number };
    };
    console.log('[Impulse] Inference response', payload);
    const nestedPrediction =
      typeof payload.prediction === 'object' && payload.prediction
        ? payload.prediction.quality_score ?? payload.prediction.score
        : undefined;
    const nestedOutput =
      typeof payload.output === 'object' && payload.output
        ? payload.output.quality_score ?? payload.output.score
        : undefined;
    const persuasionScore =
      payload.quality_score ??
      payload.score ??
      (typeof payload.prediction === 'number' ? payload.prediction : undefined) ??
      nestedPrediction ??
      (typeof payload.output === 'number' ? payload.output : undefined) ??
      nestedOutput;

    if (typeof persuasionScore !== 'number' || Number.isNaN(persuasionScore)) {
      throw new Error('Impulse inference response did not include a numeric score.');
    }

    return {
      persuasionScore: Number(Math.max(0, Math.min(1, persuasionScore)).toFixed(2)),
      provider: 'impulse',
      datasetRow: features,
    };
  } catch (error) {
    console.warn('Impulse inference failed; using local fallback.', error);
    return {
      persuasionScore: fallbackPersuasionScore(features),
      provider: 'local-fallback',
      datasetRow: features,
    };
  }
}
