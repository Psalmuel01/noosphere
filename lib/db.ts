import postgres from 'postgres';
import { env } from './config';
import {
  QuestionInput,
  QuestionRecord,
  SubmissionRecord,
  SynthesisRecord,
  VerificationInput,
  VerificationRecord,
} from './models';
import { seedState } from '../src/data/seed';

type SqlClient = ReturnType<typeof postgres>;

let client: SqlClient | null = null;
let initPromise: Promise<void> | null = null;

function getConnectionString() {
  const connectionString = env.DATABASE_URL ?? env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or POSTGRES_URL.');
  }

  return connectionString;
}

function sql() {
  if (!client) {
    client = postgres(getConnectionString(), {
      prepare: false,
      max: env.NODE_ENV === 'production' ? 1 : 5,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }

  return client;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }

  return value as T;
}

function normalizeConfidence(value: number) {
  if (value > 1) {
    return Number((value / 10).toFixed(2));
  }

  return Number(value.toFixed(2));
}

function parseQuestionRow(row: Record<string, unknown>): QuestionRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    creator: String(row.creator),
    createdAt: String(row.created_at),
    deadline: String(row.deadline),
    status: row.status as QuestionRecord['status'],
    tags: parseJson<string[]>(row.tags_json, []),
  };
}

function parseSubmissionRow(row: Record<string, unknown>): SubmissionRecord {
  return {
    id: String(row.id),
    questionId: String(row.question_id),
    contributorId: String(row.contributor_id),
    contributorName: String(row.contributor_name),
    conclusion: String(row.conclusion),
    premises: parseJson<string[]>(row.premises_json, []),
    confidence: normalizeConfidence(Number(row.confidence)),
    changeMind: row.change_mind ? String(row.change_mind) : '',
    premiseCount: Number(row.premise_count),
    avgPremiseLength: Number(row.avg_premise_length),
    engagementCount: Number(row.engagement_count),
    persuasionScore: Number(row.persuasion_score),
    storachaCid: String(row.storacha_cid),
    storageGatewayUrl: row.storage_gateway_url ? String(row.storage_gateway_url) : null,
    storageNetwork: row.storage_network as SubmissionRecord['storageNetwork'],
    reasoningTypes: parseJson<string[]>(row.reasoning_types_json, []),
    createdAt: String(row.created_at),
  };
}

function parseSynthesisRow(row: Record<string, unknown>): SynthesisRecord {
  return {
    questionId: String(row.question_id),
    consensusPoints: parseJson<string[]>(row.consensus_points_json, []),
    dissensusPoints: parseJson<string[]>(row.dissensus_points_json, []),
    dominantConclusion: String(row.dominant_conclusion),
    minorityViews: parseJson<string[]>(row.minority_views_json, []),
    summary: String(row.summary),
    provider: (row.provider as SynthesisRecord['provider']) ?? 'local-fallback',
    providerDetail: row.provider_detail ? String(row.provider_detail) : '',
    filecoinCid: String(row.filecoin_cid),
    archiveGatewayUrl: row.archive_gateway_url ? String(row.archive_gateway_url) : null,
    createdAt: String(row.created_at),
  };
}

function parseVerificationRow(row: Record<string, unknown>): VerificationRecord {
  return {
    questionId: String(row.question_id),
    contributorName: String(row.contributor_name),
    walletAddress: String(row.wallet_address),
    nullifierHash: String(row.nullifier_hash),
    mode: row.mode as VerificationRecord['mode'],
    verifiedAt: String(row.verified_at),
    proof: row.proof ? String(row.proof) : null,
  };
}

async function seedDatabase() {
  const db = sql();

  for (const question of seedState.questions) {
    await db`
      INSERT INTO questions (id, title, description, creator, created_at, deadline, status, tags_json)
      VALUES (
        ${question.id},
        ${question.text},
        ${question.description},
        ${question.creatorName},
        ${question.createdAt},
        ${question.deadline},
        ${question.status === 'complete' ? 'synthesized' : question.status},
        ${JSON.stringify(question.tags)}::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const submission of seedState.submissions) {
    await db`
      INSERT INTO submissions (
        id, question_id, contributor_id, contributor_name, conclusion, premises_json, confidence,
        change_mind, premise_count, avg_premise_length, engagement_count, persuasion_score,
        storacha_cid, storage_gateway_url, storage_network, reasoning_types_json, created_at
      ) VALUES (
        ${submission.id},
        ${submission.questionId},
        ${submission.walletAddress},
        ${submission.contributorName},
        ${submission.conclusion},
        ${JSON.stringify(submission.premises)}::jsonb,
        ${normalizeConfidence(submission.confidence)},
        ${submission.changeMind},
        ${submission.premises.length},
        ${
          submission.premises.reduce((sum, premise) => sum + premise.length, 0) /
          Math.max(submission.premises.length, 1)
        },
        ${0},
        ${submission.qualityScore},
        ${submission.storageCid},
        ${submission.storageGatewayUrl},
        ${submission.storageNetwork},
        ${JSON.stringify(submission.reasoningTypes)}::jsonb,
        ${submission.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const synthesis of seedState.syntheses) {
    await db`
      INSERT INTO syntheses (
        question_id, consensus_points_json, dissensus_points_json, dominant_conclusion,
        minority_views_json, summary, provider, provider_detail, filecoin_cid, archive_gateway_url, created_at
      ) VALUES (
        ${synthesis.questionId},
        ${JSON.stringify(synthesis.consensusPoints)}::jsonb,
        ${JSON.stringify(synthesis.dissensusPoints)}::jsonb,
        ${synthesis.dominantConclusion},
        ${JSON.stringify(synthesis.minorityViews)}::jsonb,
        ${synthesis.qualityWeightedSummary},
        ${synthesis.provider ?? 'local-fallback'},
        ${synthesis.providerDetail ?? 'Seeded demo synthesis.'},
        ${synthesis.archiveCid},
        ${synthesis.archiveGatewayUrl},
        ${synthesis.generatedAt}
      )
      ON CONFLICT (question_id) DO NOTHING
    `;
  }

  for (const verification of seedState.verifications) {
    await db`
      INSERT INTO verifications (
        question_id, contributor_name, wallet_address, nullifier_hash, mode, verified_at, proof
      ) VALUES (
        ${verification.questionId},
        ${verification.contributorName},
        ${verification.walletAddress},
        ${verification.nullifierHash},
        ${verification.mode},
        ${verification.verifiedAt},
        ${verification.proof}
      )
      ON CONFLICT (question_id, wallet_address) DO NOTHING
    `;
  }
}

async function maybeSeedDatabase() {
  if (!env.NOOSPHERE_ENABLE_DEMO_SEED) {
    return;
  }

  const db = sql();
  const rows = (await db`SELECT COUNT(*)::int AS count FROM questions`) as Array<{ count: number }>;

  if ((rows[0]?.count ?? 0) === 0) {
    await seedDatabase();
  }
}

async function initializeDatabase() {
  const db = sql();

  await db`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      creator TEXT NOT NULL,
      created_at TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      contributor_id TEXT NOT NULL,
      contributor_name TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      premises_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      confidence DOUBLE PRECISION NOT NULL,
      change_mind TEXT,
      premise_count INTEGER NOT NULL,
      avg_premise_length DOUBLE PRECISION NOT NULL,
      engagement_count INTEGER NOT NULL DEFAULT 0,
      persuasion_score DOUBLE PRECISION NOT NULL,
      storacha_cid TEXT NOT NULL,
      storage_gateway_url TEXT,
      storage_network TEXT NOT NULL,
      reasoning_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TEXT NOT NULL
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS syntheses (
      question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
      consensus_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      dissensus_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      dominant_conclusion TEXT NOT NULL,
      minority_views_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'local-fallback',
      provider_detail TEXT NOT NULL DEFAULT '',
      filecoin_cid TEXT NOT NULL,
      archive_gateway_url TEXT,
      created_at TEXT NOT NULL
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS verifications (
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      contributor_name TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      nullifier_hash TEXT NOT NULL,
      mode TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      proof TEXT,
      PRIMARY KEY(question_id, wallet_address)
    )
  `;

  await maybeSeedDatabase();
}

async function ensureDatabase() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

export async function resetDatabase() {
  await ensureDatabase();
  const db = sql();

  await db`DELETE FROM verifications`;
  await db`DELETE FROM syntheses`;
  await db`DELETE FROM submissions`;
  await db`DELETE FROM questions`;

  await maybeSeedDatabase();
}

export async function refreshQuestionStatuses() {
  await ensureDatabase();
  const db = sql();

  await db`
    UPDATE questions
    SET status = 'closed'
    WHERE status = 'open'
      AND deadline <= ${new Date().toISOString()}
  `;
}

export async function listQuestions() {
  await refreshQuestionStatuses();
  const rows = (await sql()`SELECT * FROM questions ORDER BY created_at DESC`) as Array<
    Record<string, unknown>
  >;
  return rows.map(parseQuestionRow);
}

export async function getQuestion(questionId: string) {
  await refreshQuestionStatuses();
  const rows = (await sql()`SELECT * FROM questions WHERE id = ${questionId} LIMIT 1`) as Array<
    Record<string, unknown>
  >;
  return rows[0] ? parseQuestionRow(rows[0]) : null;
}

export async function createQuestion(input: QuestionInput) {
  await ensureDatabase();
  const question: QuestionRecord = {
    id: `q-${crypto.randomUUID()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    creator: input.creator.trim(),
    createdAt: new Date().toISOString(),
    deadline: input.deadline,
    status: 'open',
    tags: input.tags ?? [],
  };

  await sql()`
    INSERT INTO questions (id, title, description, creator, created_at, deadline, status, tags_json)
    VALUES (
      ${question.id},
      ${question.title},
      ${question.description},
      ${question.creator},
      ${question.createdAt},
      ${question.deadline},
      ${question.status},
      ${JSON.stringify(question.tags)}::jsonb
    )
  `;

  return question;
}

export async function listSubmissions(questionId?: string) {
  await refreshQuestionStatuses();
  const rows = questionId
    ? ((await sql()`
        SELECT * FROM submissions WHERE question_id = ${questionId} ORDER BY created_at DESC
      `) as Array<Record<string, unknown>>)
    : ((await sql()`SELECT * FROM submissions ORDER BY created_at DESC`) as Array<
        Record<string, unknown>
      >);

  return rows.map(parseSubmissionRow);
}

export async function insertSubmission(input: SubmissionRecord) {
  await ensureDatabase();

  await sql()`
    INSERT INTO submissions (
      id, question_id, contributor_id, contributor_name, conclusion, premises_json, confidence,
      change_mind, premise_count, avg_premise_length, engagement_count, persuasion_score,
      storacha_cid, storage_gateway_url, storage_network, reasoning_types_json, created_at
    ) VALUES (
      ${input.id},
      ${input.questionId},
      ${input.contributorId},
      ${input.contributorName},
      ${input.conclusion},
      ${JSON.stringify(input.premises)}::jsonb,
      ${input.confidence},
      ${input.changeMind},
      ${input.premiseCount},
      ${input.avgPremiseLength},
      ${input.engagementCount},
      ${input.persuasionScore},
      ${input.storachaCid},
      ${input.storageGatewayUrl},
      ${input.storageNetwork},
      ${JSON.stringify(input.reasoningTypes)}::jsonb,
      ${input.createdAt}
    )
  `;

  return input;
}

export async function listVerifications(questionId?: string) {
  await ensureDatabase();
  const rows = questionId
    ? ((await sql()`
        SELECT * FROM verifications WHERE question_id = ${questionId} ORDER BY verified_at DESC
      `) as Array<Record<string, unknown>>)
    : ((await sql()`SELECT * FROM verifications ORDER BY verified_at DESC`) as Array<
        Record<string, unknown>
      >);

  return rows.map(parseVerificationRow);
}

export async function upsertVerification(input: VerificationInput) {
  await ensureDatabase();
  const record: VerificationRecord = {
    questionId: input.questionId,
    contributorName: input.contributorName.trim(),
    walletAddress: input.walletAddress.trim(),
    nullifierHash: input.nullifierHash,
    mode: input.mode,
    verifiedAt: new Date().toISOString(),
    proof: input.proof ?? null,
  };

  await sql()`
    INSERT INTO verifications (
      question_id, contributor_name, wallet_address, nullifier_hash, mode, verified_at, proof
    ) VALUES (
      ${record.questionId},
      ${record.contributorName},
      ${record.walletAddress},
      ${record.nullifierHash},
      ${record.mode},
      ${record.verifiedAt},
      ${record.proof}
    )
    ON CONFLICT (question_id, wallet_address) DO UPDATE
    SET contributor_name = EXCLUDED.contributor_name,
        nullifier_hash = EXCLUDED.nullifier_hash,
        mode = EXCLUDED.mode,
        verified_at = EXCLUDED.verified_at,
        proof = EXCLUDED.proof
  `;

  return record;
}

export async function getSynthesis(questionId: string) {
  await ensureDatabase();
  const rows = (await sql()`
    SELECT * FROM syntheses WHERE question_id = ${questionId} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? parseSynthesisRow(rows[0]) : null;
}

export async function listSyntheses() {
  await ensureDatabase();
  const rows = (await sql()`SELECT * FROM syntheses ORDER BY created_at DESC`) as Array<
    Record<string, unknown>
  >;
  return rows.map(parseSynthesisRow);
}

export async function upsertSynthesis(record: SynthesisRecord) {
  await ensureDatabase();

  await sql()`
    INSERT INTO syntheses (
      question_id, consensus_points_json, dissensus_points_json, dominant_conclusion,
      minority_views_json, summary, provider, provider_detail, filecoin_cid, archive_gateway_url, created_at
    ) VALUES (
      ${record.questionId},
      ${JSON.stringify(record.consensusPoints)}::jsonb,
      ${JSON.stringify(record.dissensusPoints)}::jsonb,
      ${record.dominantConclusion},
      ${JSON.stringify(record.minorityViews)}::jsonb,
      ${record.summary},
      ${record.provider},
      ${record.providerDetail},
      ${record.filecoinCid},
      ${record.archiveGatewayUrl},
      ${record.createdAt}
    )
    ON CONFLICT (question_id) DO UPDATE
    SET consensus_points_json = EXCLUDED.consensus_points_json,
        dissensus_points_json = EXCLUDED.dissensus_points_json,
        dominant_conclusion = EXCLUDED.dominant_conclusion,
        minority_views_json = EXCLUDED.minority_views_json,
        summary = EXCLUDED.summary,
        provider = EXCLUDED.provider,
        provider_detail = EXCLUDED.provider_detail,
        filecoin_cid = EXCLUDED.filecoin_cid,
        archive_gateway_url = EXCLUDED.archive_gateway_url,
        created_at = EXCLUDED.created_at
  `;

  await sql()`UPDATE questions SET status = 'synthesized' WHERE id = ${record.questionId}`;

  return record;
}

export async function listQuestionSession(questionId: string) {
  return {
    question: await getQuestion(questionId),
    submissions: await listSubmissions(questionId),
    synthesis: await getSynthesis(questionId),
  };
}
