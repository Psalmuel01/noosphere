import type { IncomingMessage, ServerResponse } from 'node:http';
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
import { BootstrapPayload, QuestionRecord, SubmissionRecord } from '../lib/models';
import { extractKeywords, keywordSimilarity } from '../src/lib/scoring';

type NodeRequest = IncomingMessage & { body?: unknown };

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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function notFound(res: ServerResponse) {
  sendJson(res, 404, { error: 'Route not found.' });
}

async function readJson(req: NodeRequest) {
  if (typeof req.body !== 'undefined') {
    return req.body;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const bodyText = Buffer.concat(chunks).toString('utf8').trim();
  if (!bodyText) {
    return {};
  }

  return JSON.parse(bodyText);
}

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
  const question = await getQuestion(questionId);

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

  const allForQuestion = await listSubmissions(questionId);
  const clusterId = clusterIdFor(baseSubmission, allForQuestion);
  const stored = await insertSubmission(baseSubmission);

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
      similarity: keywordSimilarity(
        keywords,
        extractKeywords(candidate.premises.concat(candidate.conclusion), 10),
      ),
      clusterId: `cluster-${extractKeywords([candidate.conclusion], 2)[0] ?? 'emergent'}`,
    }))
    .sort((a, b) => b.similarity - a.similarity)[0];

  return matched && matched.similarity >= 0.25
    ? matched.clusterId
    : `cluster-${keywords[0] ?? 'emergent'}`;
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

function buildSystemStatus() {
  return {
    storacha: getStorachaStatus(),
    impulse: getImpulseStatus(),
    gemini: getGeminiStatus(),
    filecoin: getFilecoinStatus(),
  };
}

async function buildBootstrap(): Promise<BootstrapPayload> {
  await refreshQuestionStatuses();
  const [questions, submissions, syntheses, verifications] = await Promise.all([
    listQuestions(),
    listSubmissions(),
    listSyntheses(),
    listVerifications(),
  ]);

  return {
    questions,
    submissions,
    syntheses,
    verifications,
    status: buildSystemStatus(),
  };
}

async function synthesizeQuestion(questionId: string) {
  const session = await listQuestionSession(questionId);

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

function buildHealthPayload() {
  return {
    ok: true,
    service: 'noosphere',
    database: env.DATABASE_URL ?? env.POSTGRES_URL ? 'configured' : 'missing',
  };
}

export async function handleRequest(req: NodeRequest, res: ServerResponse) {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const routePath =
    pathname === '/api'
      ? '/'
      : pathname.startsWith('/api/')
        ? pathname.slice(4) || '/'
        : pathname;

  try {
    if (method === 'GET' && (pathname === '/healthz' || pathname === '/api/healthz')) {
      sendJson(res, 200, buildHealthPayload());
      return;
    }

    if (method === 'GET' && (pathname === '/api/bootstrap' || routePath === '/bootstrap')) {
      sendJson(res, 200, await buildBootstrap());
      return;
    }

    if (method === 'POST' && (pathname === '/api/world/rp-context' || routePath === '/world/rp-context')) {
      sendJson(res, 200, buildRpContext());
      return;
    }

    if (method === 'POST' && (pathname === '/api/world/verify' || routePath === '/world/verify')) {
      const input = worldVerifySchema.parse(await readJson(req));
      const rpId = env.VITE_WORLD_ID_RP_ID;

      if (!rpId) {
        sendJson(res, 400, { error: 'Missing VITE_WORLD_ID_RP_ID.' });
        return;
      }

      if (input.signal) {
        const providedSignal = String((input.idkitResponse as Record<string, unknown>).signal ?? '');
        if (providedSignal && providedSignal !== input.signal) {
          sendJson(res, 400, { error: 'World ID signal mismatch.' });
          return;
        }
      }

      const baseUrl = env.WORLD_ID_VERIFY_BASE_URL ?? 'https://developer.world.org';
      const verifyUrl = `${baseUrl.replace(/\/$/, '')}/api/v4/verify/${rpId}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.idkitResponse),
      });

      const payloadText = await response.text();
      if (!response.ok) {
        sendJson(res, response.status, {
          error: 'World ID verification failed.',
          detail: payloadText,
        });
        return;
      }

      sendJson(res, 200, payloadText ? JSON.parse(payloadText) : { success: true });
      return;
    }

    if (method === 'GET' && (pathname === '/api/questions' || routePath === '/questions')) {
      sendJson(res, 200, await listQuestions());
      return;
    }

    if (method === 'POST' && (pathname === '/api/questions' || routePath === '/questions')) {
      const input = questionSchema.parse(await readJson(req));
      const question = await createQuestion({
        title: input.title,
        description: input.description,
        creator: input.creator?.trim() || 'Anonymous',
        deadline: input.deadline || defaultDeadline(),
        tags: input.tags,
      });

      sendJson(res, 201, question);
      return;
    }

    if (method === 'POST' && (pathname === '/api/verifications' || routePath === '/verifications')) {
      const input = verificationSchema.parse(await readJson(req));
      const question = await getQuestion(input.questionId);

      if (!question) {
        sendJson(res, 404, { error: 'Question not found.' });
        return;
      }

      sendJson(res, 201, await upsertVerification(input));
      return;
    }

    const questionSubmissionsMatch = (pathname.match(/^\/api\/questions\/([^/]+)\/submissions$/) ??
      routePath.match(/^\/questions\/([^/]+)\/submissions$/));
    if (method === 'GET' && questionSubmissionsMatch) {
      const questionId = decodeURIComponent(questionSubmissionsMatch[1] ?? '');
      const session = await listQuestionSession(questionId);

      if (!session.question) {
        sendJson(res, 404, { error: 'Question not found.' });
        return;
      }

      sendJson(res, 200, session);
      return;
    }

    const questionReasoningMatch = (pathname.match(/^\/api\/questions\/([^/]+)\/reasoning$/) ??
      routePath.match(/^\/questions\/([^/]+)\/reasoning$/));
    if (method === 'POST' && questionReasoningMatch) {
      const input = submissionSchema.parse(await readJson(req));
      const questionId = decodeURIComponent(questionReasoningMatch[1] ?? '');
      sendJson(res, 201, await createSubmission(questionId, input));
      return;
    }

    if (method === 'POST' && (pathname === '/api/reasoning/submit' || routePath === '/reasoning/submit')) {
      const input = submissionSchema.parse(await readJson(req));

      if (!input.questionId) {
        sendJson(res, 400, { error: 'questionId is required.' });
        return;
      }

      sendJson(res, 201, await createSubmission(input.questionId, input));
      return;
    }

    const questionAggregateMatch = (pathname.match(/^\/api\/questions\/([^/]+)\/(aggregate|synthesize)$/) ??
      routePath.match(/^\/questions\/([^/]+)\/(aggregate|synthesize)$/));
    if (method === 'POST' && questionAggregateMatch) {
      const questionId = decodeURIComponent(questionAggregateMatch[1] ?? '');
      const question = await getQuestion(questionId);

      if (!question) {
        sendJson(res, 404, { error: 'Question not found.' });
        return;
      }

      sendJson(res, 200, await synthesizeQuestion(question.id));
      return;
    }

    if (method === 'GET' && (pathname === '/api/system/status' || routePath === '/system/status')) {
      sendJson(res, 200, buildSystemStatus());
      return;
    }

    if (method === 'POST' && (pathname === '/api/admin/reset' || routePath === '/admin/reset')) {
      await resetDatabase();
      sendJson(res, 200, await buildBootstrap());
      return;
    }

    notFound(res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(res, 400, {
        error: 'Invalid request payload.',
        detail: error.flatten(),
      });
      return;
    }

    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: 'Malformed JSON body.' });
      return;
    }

    if (error instanceof Error && error.message === 'Question not found.') {
      sendJson(res, 404, { error: error.message });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown server error.' });
  }
}
