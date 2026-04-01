import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { z } from 'zod';
import { signRequest } from '@worldcoin/idkit/signing';
import { env } from '../lib/config';
import {
  createQuestion,
  getQuestion,
  insertSubmission,
  listQuestionSession,
  listQuestions,
  listSubmissions,
  listSyntheses,
  listVerifications,
  refreshQuestionStatuses,
  resetDatabase,
  upsertSynthesis,
  upsertVerification,
} from '../lib/db';
import { buildPredictionFeatures, getImpulseStatus, predictPersuasion } from '../lib/ai/impulse';
import { getGeminiStatus, synthesizeReasoning } from '../lib/ai/synthesis';
import { archiveSessionToFilecoin, getFilecoinStatus } from '../lib/archive/filecoin';
import { getStorachaStatus, uploadReasoningToStoracha } from '../lib/storage/storacha';
import { BootstrapPayload, QuestionRecord, SubmissionRecord, VerificationRecord } from '../lib/models';
import { extractKeywords, keywordSimilarity } from '../src/lib/scoring';

const app = express();
app.use(express.json({ limit: '2mb' }));

const questionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  creator: z.string().min(1).optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

const submissionSchema = z.object({
  questionId: z.string().min(1).optional(),
  contributorId: z.string().min(1).optional(),
  contributorName: z.string().min(1).optional(),
  conclusion: z.string().min(1),
  premises: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  changeMind: z.string().optional(),
  reasoningTypes: z.array(z.string()).optional(),
  engagementCount: z.number().int().min(0).optional(),
});

const verificationSchema = z.object({
  questionId: z.string().min(1),
  contributorName: z.string().min(1),
  walletAddress: z.string().min(1),
  nullifierHash: z.string().min(1),
  mode: z.enum(['demo', 'world-id']),
  proof: z.string().nullable().optional(),
});

const worldVerifySchema = z.object({
  idkitResponse: z.record(z.string(), z.any()),
  signal: z.string().optional(),
});

function buildRpContext() {
  const rpId = env.VITE_WORLD_ID_RP_ID;
  const action = env.VITE_WORLD_ID_ACTION ?? 'noosphere-submit-reasoning';
  const signingKey = env.RP_SIGNING_KEY ?? process.env.RP_SIGNING_KEY;

  if (!rpId) {
    throw new Error('Missing VITE_WORLD_ID_RP_ID.');
  }

  if (!signingKey) {
    throw new Error('Missing RP_SIGNING_KEY.');
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey);

  return {
    rp_id: rpId,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
    signature: sig,
  };
}

function defaultDeadline() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
}

async function createSubmission(questionId: string, input: z.infer<typeof submissionSchema>) {
  const question = getQuestion(questionId);

  if (!question) {
    throw new Error('Question not found.');
  }

  const contributorName = input.contributorName?.trim() || 'Anonymous';
  const contributorId = input.contributorId?.trim() || `anon-${crypto.randomUUID().slice(0, 12)}`;

  const features = buildPredictionFeatures({
    premises: input.premises,
    confidence: input.confidence,
    conclusion: input.conclusion,
    changeMind: input.changeMind,
    engagementCount: input.engagementCount ?? 0,
    createdAt: new Date().toISOString(),
    deadline: question.deadline,
  });

  const prediction = await predictPersuasion(features);
  const submissionId = `sub-${crypto.randomUUID()}`;
  const storage = await uploadReasoningToStoracha(
    {
      conclusion: input.conclusion,
      premises: input.premises,
      confidence: input.confidence,
      changeMind: input.changeMind ?? '',
      reasoningTypes: input.reasoningTypes ?? [],
      features,
      persuasionScore: prediction.persuasionScore,
    },
    submissionId,
  );

  const baseSubmission: SubmissionRecord = {
    id: submissionId,
    questionId,
    contributorId,
    contributorName,
    conclusion: input.conclusion,
    premises: input.premises,
    confidence: input.confidence,
    changeMind: input.changeMind ?? '',
    premiseCount: features.premiseCount,
    avgPremiseLength: features.avgPremiseLength,
    engagementCount: features.engagementCount,
    persuasionScore: prediction.persuasionScore,
    storachaCid: storage.cid,
    storageGatewayUrl: storage.gatewayUrl,
    storageNetwork: storage.network,
    reasoningTypes: input.reasoningTypes ?? [],
    createdAt: new Date().toISOString(),
  };

  const allForQuestion = listSubmissions(questionId);
  const clusterId = clusterIdFor(baseSubmission, allForQuestion);
  const stored = insertSubmission(baseSubmission);

  return {
    ...stored,
    clusterId,
    keywords: extractKeywords(
      [stored.conclusion, ...stored.premises, stored.changeMind, ...stored.reasoningTypes],
      10,
    ),
    qualityScore: stored.persuasionScore,
    storageCid: stored.storachaCid,
  };
}

function mapQuestion(question: QuestionRecord) {
  return {
    id: question.id,
    text: question.title,
    description: question.description,
    creatorName: question.creator,
    createdAt: question.createdAt,
    deadline: question.deadline,
    status:
      question.status === 'synthesized'
        ? 'complete'
        : question.status === 'closed'
          ? 'synthesizing'
          : 'open',
    tags: question.tags,
  };
}

function clusterIdFor(submission: SubmissionRecord, existing: SubmissionRecord[]) {
  const keywords = extractKeywords(
    [
      submission.conclusion,
      ...submission.premises,
      submission.changeMind,
      ...submission.reasoningTypes,
    ],
    10,
  );

  const matched = existing
    .map((candidate) => ({
      id: candidate.id,
      similarity: keywordSimilarity(keywords, extractKeywords(candidate.premises.concat(candidate.conclusion), 10)),
      clusterId: `cluster-${extractKeywords([candidate.conclusion], 2)[0] ?? 'emergent'}`,
    }))
    .sort((a, b) => b.similarity - a.similarity)[0];

  return matched && matched.similarity >= 0.25
    ? matched.clusterId
    : `cluster-${keywords[0] ?? 'emergent'}`;
}

function buildSystemStatus() {
  return {
    storacha: getStorachaStatus(),
    impulse: getImpulseStatus(),
    gemini: getGeminiStatus(),
    filecoin: getFilecoinStatus(),
  };
}

function buildBootstrap(): BootstrapPayload {
  refreshQuestionStatuses();
  const questions = listQuestions();
  const submissions = listSubmissions();
  const syntheses = listSyntheses();
  const verifications = listVerifications();

  return {
    questions,
    submissions,
    syntheses,
    verifications,
    status: buildSystemStatus(),
  };
}

async function synthesizeQuestion(questionId: string) {
  const session = listQuestionSession(questionId);

  if (!session.question) {
    throw new Error('Question not found.');
  }

  if (session.submissions.length === 0) {
    throw new Error('Cannot synthesize without submissions.');
  }

  const synthesis = await synthesizeReasoning(session.question, session.submissions);
  const archive = await archiveSessionToFilecoin(
    {
      question: session.question,
      submissions: session.submissions,
      persuasionScores: session.submissions.map((submission) => ({
        id: submission.id,
        persuasionScore: submission.persuasionScore,
      })),
      synthesis,
      timestamp: new Date().toISOString(),
    },
    questionId,
  );

  return upsertSynthesis({
    questionId,
    consensusPoints: synthesis.consensusPoints,
    dissensusPoints: synthesis.dissensusPoints,
    dominantConclusion: synthesis.dominantConclusion,
    minorityViews: synthesis.minorityViews,
    summary: synthesis.summary,
    provider: synthesis.provider,
    providerDetail: synthesis.providerDetail,
    filecoinCid: archive.cid,
    archiveGatewayUrl: archive.gatewayUrl,
    createdAt: new Date().toISOString(),
  });
}

app.get('/api/bootstrap', async (_req, res) => {
  res.json(buildBootstrap());
});

app.post('/api/world/rp-context', (_req, res) => {
  try {
    res.json(buildRpContext());
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to build RP context.',
    });
  }
});

app.post('/api/world/verify', async (req, res) => {
  let input: z.infer<typeof worldVerifySchema>;

  try {
    input = worldVerifySchema.parse(req.body);
  } catch (error) {
    res.status(400).json({ error: 'Invalid verification payload.' });
    return;
  }

  const rpId = env.VITE_WORLD_ID_RP_ID;
  if (!rpId) {
    res.status(400).json({ error: 'Missing VITE_WORLD_ID_RP_ID.' });
    return;
  }

  if (input.signal) {
    const providedSignal = String((input.idkitResponse as any).signal ?? '');
    if (providedSignal && providedSignal !== input.signal) {
      res.status(400).json({ error: 'World ID signal mismatch.' });
      return;
    }
  }

  const baseUrl = env.WORLD_ID_VERIFY_BASE_URL ?? 'https://developer.world.org';
  const url = `${baseUrl.replace(/\/$/, '')}/api/v4/verify/${rpId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.idkitResponse),
    });

    const payloadText = await response.text();
    if (!response.ok) {
      res.status(response.status).json({
        error: 'World ID verification failed.',
        detail: payloadText,
      });
      return;
    }

    res.json(payloadText ? JSON.parse(payloadText) : { success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'World ID verification failed.',
    });
  }
});

app.get('/api/questions', async (_req, res) => {
  res.json(listQuestions());
});

app.post('/api/questions', async (req, res) => {
  const input = questionSchema.parse(req.body);
  const question = createQuestion({
    title: input.title,
    description: input.description,
    creator: input.creator?.trim() || 'Anonymous',
    deadline: input.deadline || defaultDeadline(),
    tags: input.tags,
  });
  res.status(201).json(question);
});

app.post('/api/verifications', async (req, res) => {
  const input = verificationSchema.parse(req.body);
  const question = getQuestion(input.questionId);

  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }

  const verification = upsertVerification(input);
  res.status(201).json(verification);
});

app.get('/api/questions/:id/submissions', async (req, res) => {
  const session = listQuestionSession(req.params.id);

  if (!session.question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }

  res.json(session);
});

app.post('/api/questions/:id/reasoning', async (req, res) => {
  const input = submissionSchema.parse(req.body);

  try {
    const submission = await createSubmission(req.params.id, input);
    res.status(201).json(submission);
  } catch (error) {
    if (error instanceof Error && error.message === 'Question not found.') {
      res.status(404).json({ error: error.message });
      return;
    }

    throw error;
  }
});

app.post('/api/reasoning/submit', async (req, res) => {
  const input = submissionSchema.parse(req.body);
  if (!input.questionId) {
    res.status(400).json({ error: 'questionId is required.' });
    return;
  }

  try {
    const submission = await createSubmission(input.questionId, input);
    res.status(201).json(submission);
  } catch (error) {
    if (error instanceof Error && error.message === 'Question not found.') {
      res.status(404).json({ error: error.message });
      return;
    }

    throw error;
  }
});

app.post('/api/questions/:id/aggregate', async (req, res) => {
  const question = getQuestion(req.params.id);

  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }

  const synthesis = await synthesizeQuestion(question.id);
  res.json(synthesis);
});

app.post('/api/questions/:id/synthesize', async (req, res) => {
  const question = getQuestion(req.params.id);

  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }

  const synthesis = await synthesizeQuestion(question.id);
  res.json(synthesis);
});

app.get('/api/system/status', async (_req, res) => {
  res.json(buildSystemStatus());
});

app.post('/api/admin/reset', async (_req, res) => {
  resetDatabase();
  res.json(buildBootstrap());
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown server error.' });
});

app.listen(env.PORT, () => {
  console.log(`Noosphere backend listening on http://localhost:${env.PORT}`);
});
