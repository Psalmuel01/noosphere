import Database from 'better-sqlite3';
import { databasePath } from './config';
import { env } from './config';
import {
  QuestionInput,
  QuestionRecord,
  QuestionStatus,
  SubmissionInput,
  SubmissionRecord,
  SynthesisRecord,
  VerificationInput,
  VerificationRecord,
} from './models';
import { seedState } from '../src/data/seed';

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    creator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    deadline TEXT NOT NULL,
    status TEXT NOT NULL,
    tags_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    contributor_id TEXT NOT NULL,
    contributor_name TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    premises_json TEXT NOT NULL,
    confidence REAL NOT NULL,
    change_mind TEXT,
    premise_count INTEGER NOT NULL,
    avg_premise_length REAL NOT NULL,
    engagement_count INTEGER NOT NULL DEFAULT 0,
    persuasion_score REAL NOT NULL,
    storacha_cid TEXT NOT NULL,
    storage_gateway_url TEXT,
    storage_network TEXT NOT NULL,
    reasoning_types_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS syntheses (
    question_id TEXT PRIMARY KEY,
    consensus_points_json TEXT NOT NULL,
    dissensus_points_json TEXT NOT NULL,
    dominant_conclusion TEXT NOT NULL,
    minority_views_json TEXT NOT NULL,
    summary TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'local-fallback',
    provider_detail TEXT NOT NULL DEFAULT '',
    filecoin_cid TEXT NOT NULL,
    archive_gateway_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS verifications (
    question_id TEXT NOT NULL,
    contributor_name TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    nullifier_hash TEXT NOT NULL,
    mode TEXT NOT NULL,
    verified_at TEXT NOT NULL,
    proof TEXT,
    PRIMARY KEY(question_id, wallet_address),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );
`);

const synthesisColumns = db.prepare(`PRAGMA table_info(syntheses)`).all() as Array<{ name: string }>;
if (!synthesisColumns.some((column) => column.name === 'provider')) {
  db.exec(`ALTER TABLE syntheses ADD COLUMN provider TEXT NOT NULL DEFAULT 'local-fallback';`);
}
if (!synthesisColumns.some((column) => column.name === 'provider_detail')) {
  db.exec(`ALTER TABLE syntheses ADD COLUMN provider_detail TEXT NOT NULL DEFAULT '';`);
}

function parseQuestionRow(row: any): QuestionRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creator: row.creator,
    createdAt: row.created_at,
    deadline: row.deadline,
    status: row.status,
    tags: JSON.parse(row.tags_json),
  };
}

function parseSubmissionRow(row: any): SubmissionRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    contributorId: row.contributor_id,
    contributorName: row.contributor_name,
    conclusion: row.conclusion,
    premises: JSON.parse(row.premises_json),
    confidence: normalizeConfidence(row.confidence),
    changeMind: row.change_mind ?? '',
    premiseCount: row.premise_count,
    avgPremiseLength: row.avg_premise_length,
    engagementCount: row.engagement_count,
    persuasionScore: row.persuasion_score,
    storachaCid: row.storacha_cid,
    storageGatewayUrl: row.storage_gateway_url ?? null,
    storageNetwork: row.storage_network,
    reasoningTypes: JSON.parse(row.reasoning_types_json),
    createdAt: row.created_at,
  };
}

function parseSynthesisRow(row: any): SynthesisRecord {
  return {
    questionId: row.question_id,
    consensusPoints: JSON.parse(row.consensus_points_json),
    dissensusPoints: JSON.parse(row.dissensus_points_json),
    dominantConclusion: row.dominant_conclusion,
    minorityViews: JSON.parse(row.minority_views_json),
    summary: row.summary,
    provider: row.provider ?? 'local-fallback',
    providerDetail: row.provider_detail ?? '',
    filecoinCid: row.filecoin_cid,
    archiveGatewayUrl: row.archive_gateway_url ?? null,
    createdAt: row.created_at,
  };
}

function parseVerificationRow(row: any): VerificationRecord {
  return {
    questionId: row.question_id,
    contributorName: row.contributor_name,
    walletAddress: row.wallet_address,
    nullifierHash: row.nullifier_hash,
    mode: row.mode,
    verifiedAt: row.verified_at,
    proof: row.proof ?? null,
  };
}

function normalizeConfidence(value: number) {
  if (value > 1) {
    return Number((value / 10).toFixed(2));
  }

  return Number(value.toFixed(2));
}

function seedDatabase() {
  if (!env.NOOSPHERE_ENABLE_DEMO_SEED) {
    return;
  }

  const existing = db.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, title, description, creator, created_at, deadline, status, tags_json)
    VALUES (@id, @title, @description, @creator, @createdAt, @deadline, @status, @tagsJson)
  `);
  const insertSubmission = db.prepare(`
    INSERT INTO submissions (
      id, question_id, contributor_id, contributor_name, conclusion, premises_json, confidence,
      change_mind, premise_count, avg_premise_length, engagement_count, persuasion_score,
      storacha_cid, storage_gateway_url, storage_network, reasoning_types_json, created_at
    ) VALUES (
      @id, @questionId, @contributorId, @contributorName, @conclusion, @premisesJson, @confidence,
      @changeMind, @premiseCount, @avgPremiseLength, @engagementCount, @persuasionScore,
      @storachaCid, @storageGatewayUrl, @storageNetwork, @reasoningTypesJson, @createdAt
    )
  `);
  const insertSynthesis = db.prepare(`
    INSERT INTO syntheses (
      question_id, consensus_points_json, dissensus_points_json, dominant_conclusion,
      minority_views_json, summary, provider, provider_detail, filecoin_cid, archive_gateway_url, created_at
    ) VALUES (
      @questionId, @consensusPointsJson, @dissensusPointsJson, @dominantConclusion,
      @minorityViewsJson, @summary, @provider, @providerDetail, @filecoinCid, @archiveGatewayUrl, @createdAt
    )
  `);
  const insertVerification = db.prepare(`
    INSERT INTO verifications (
      question_id, contributor_name, wallet_address, nullifier_hash, mode, verified_at, proof
    ) VALUES (
      @questionId, @contributorName, @walletAddress, @nullifierHash, @mode, @verifiedAt, @proof
    )
  `);

  const transaction = db.transaction(() => {
    for (const question of seedState.questions) {
      insertQuestion.run({
        id: question.id,
        title: question.text,
        description: question.description,
        creator: question.creatorName,
        createdAt: question.createdAt,
        deadline: question.deadline,
        status: question.status === 'complete' ? 'synthesized' : question.status,
        tagsJson: JSON.stringify(question.tags),
      });
    }

    for (const submission of seedState.submissions) {
      insertSubmission.run({
        id: submission.id,
        questionId: submission.questionId,
        contributorId: submission.walletAddress,
        contributorName: submission.contributorName,
        conclusion: submission.conclusion,
        premisesJson: JSON.stringify(submission.premises),
        confidence: normalizeConfidence(submission.confidence),
        changeMind: submission.changeMind,
        premiseCount: submission.premises.length,
        avgPremiseLength:
          submission.premises.reduce((sum, premise) => sum + premise.length, 0) /
          Math.max(submission.premises.length, 1),
        engagementCount: 0,
        persuasionScore: submission.qualityScore,
        storachaCid: submission.storageCid,
        storageGatewayUrl: submission.storageGatewayUrl,
        storageNetwork: submission.storageNetwork,
        reasoningTypesJson: JSON.stringify(submission.reasoningTypes),
        createdAt: submission.createdAt,
      });
    }

    for (const synthesis of seedState.syntheses) {
      insertSynthesis.run({
        questionId: synthesis.questionId,
        consensusPointsJson: JSON.stringify(synthesis.consensusPoints),
        dissensusPointsJson: JSON.stringify(synthesis.dissensusPoints),
        dominantConclusion: synthesis.dominantConclusion,
        minorityViewsJson: JSON.stringify(synthesis.minorityViews),
        summary: synthesis.qualityWeightedSummary,
        provider: synthesis.provider ?? 'local-fallback',
        providerDetail: synthesis.providerDetail ?? 'Seeded demo synthesis.',
        filecoinCid: synthesis.archiveCid,
        archiveGatewayUrl: synthesis.archiveGatewayUrl,
        createdAt: synthesis.generatedAt,
      });
    }

    for (const verification of seedState.verifications) {
      insertVerification.run({
        questionId: verification.questionId,
        contributorName: verification.contributorName,
        walletAddress: verification.walletAddress,
        nullifierHash: verification.nullifierHash,
        mode: verification.mode,
        verifiedAt: verification.verifiedAt,
        proof: verification.proof,
      });
    }
  });

  transaction();
}

seedDatabase();

export function resetDatabase() {
  db.exec(`
    DELETE FROM verifications;
    DELETE FROM syntheses;
    DELETE FROM submissions;
    DELETE FROM questions;
  `);
  seedDatabase();
}

export function refreshQuestionStatuses() {
  db.prepare(
    `UPDATE questions SET status = 'closed' WHERE status = 'open' AND deadline <= ?`,
  ).run(new Date().toISOString());
}

export function listQuestions() {
  refreshQuestionStatuses();
  const rows = db.prepare(`SELECT * FROM questions ORDER BY created_at DESC`).all();
  return rows.map(parseQuestionRow);
}

export function getQuestion(questionId: string) {
  refreshQuestionStatuses();
  const row = db.prepare(`SELECT * FROM questions WHERE id = ?`).get(questionId);
  return row ? parseQuestionRow(row) : null;
}

export function createQuestion(input: QuestionInput) {
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

  db.prepare(`
    INSERT INTO questions (id, title, description, creator, created_at, deadline, status, tags_json)
    VALUES (@id, @title, @description, @creator, @createdAt, @deadline, @status, @tagsJson)
  `).run({
    ...question,
    tagsJson: JSON.stringify(question.tags),
  });

  return question;
}

export function listSubmissions(questionId?: string) {
  refreshQuestionStatuses();
  const rows = questionId
    ? db.prepare(`SELECT * FROM submissions WHERE question_id = ? ORDER BY created_at DESC`).all(questionId)
    : db.prepare(`SELECT * FROM submissions ORDER BY created_at DESC`).all();
  return rows.map(parseSubmissionRow);
}

export function insertSubmission(input: SubmissionRecord) {
  db.prepare(`
    INSERT INTO submissions (
      id, question_id, contributor_id, contributor_name, conclusion, premises_json, confidence,
      change_mind, premise_count, avg_premise_length, engagement_count, persuasion_score,
      storacha_cid, storage_gateway_url, storage_network, reasoning_types_json, created_at
    ) VALUES (
      @id, @questionId, @contributorId, @contributorName, @conclusion, @premisesJson, @confidence,
      @changeMind, @premiseCount, @avgPremiseLength, @engagementCount, @persuasionScore,
      @storachaCid, @storageGatewayUrl, @storageNetwork, @reasoningTypesJson, @createdAt
    )
  `).run({
    ...input,
    premisesJson: JSON.stringify(input.premises),
    reasoningTypesJson: JSON.stringify(input.reasoningTypes),
  });

  return input;
}

export function listVerifications(questionId?: string) {
  const rows = questionId
    ? db.prepare(`SELECT * FROM verifications WHERE question_id = ? ORDER BY verified_at DESC`).all(questionId)
    : db.prepare(`SELECT * FROM verifications ORDER BY verified_at DESC`).all();

  return rows.map(parseVerificationRow);
}

export function upsertVerification(input: VerificationInput) {
  const record: VerificationRecord = {
    questionId: input.questionId,
    contributorName: input.contributorName.trim(),
    walletAddress: input.walletAddress.trim(),
    nullifierHash: input.nullifierHash,
    mode: input.mode,
    verifiedAt: new Date().toISOString(),
    proof: input.proof ?? null,
  };

  db.prepare(`
    INSERT INTO verifications (
      question_id, contributor_name, wallet_address, nullifier_hash, mode, verified_at, proof
    ) VALUES (
      @questionId, @contributorName, @walletAddress, @nullifierHash, @mode, @verifiedAt, @proof
    )
    ON CONFLICT(question_id, wallet_address) DO UPDATE SET
      contributor_name=excluded.contributor_name,
      nullifier_hash=excluded.nullifier_hash,
      mode=excluded.mode,
      verified_at=excluded.verified_at,
      proof=excluded.proof
  `).run(record);

  return record;
}

export function getSynthesis(questionId: string) {
  const row = db.prepare(`SELECT * FROM syntheses WHERE question_id = ?`).get(questionId);
  return row ? parseSynthesisRow(row) : null;
}

export function listSyntheses() {
  const rows = db.prepare(`SELECT * FROM syntheses ORDER BY created_at DESC`).all();
  return rows.map(parseSynthesisRow);
}

export function upsertSynthesis(record: SynthesisRecord) {
  db.prepare(`
    INSERT INTO syntheses (
      question_id, consensus_points_json, dissensus_points_json, dominant_conclusion,
      minority_views_json, summary, provider, provider_detail, filecoin_cid, archive_gateway_url, created_at
    ) VALUES (
      @questionId, @consensusPointsJson, @dissensusPointsJson, @dominantConclusion,
      @minorityViewsJson, @summary, @provider, @providerDetail, @filecoinCid, @archiveGatewayUrl, @createdAt
    )
    ON CONFLICT(question_id) DO UPDATE SET
      consensus_points_json=excluded.consensus_points_json,
      dissensus_points_json=excluded.dissensus_points_json,
      dominant_conclusion=excluded.dominant_conclusion,
      minority_views_json=excluded.minority_views_json,
      summary=excluded.summary,
      provider=excluded.provider,
      provider_detail=excluded.provider_detail,
      filecoin_cid=excluded.filecoin_cid,
      archive_gateway_url=excluded.archive_gateway_url,
      created_at=excluded.created_at
  `).run({
    questionId: record.questionId,
    consensusPointsJson: JSON.stringify(record.consensusPoints),
    dissensusPointsJson: JSON.stringify(record.dissensusPoints),
    dominantConclusion: record.dominantConclusion,
    minorityViewsJson: JSON.stringify(record.minorityViews),
    summary: record.summary,
    provider: record.provider,
    providerDetail: record.providerDetail,
    filecoinCid: record.filecoinCid,
    archiveGatewayUrl: record.archiveGatewayUrl,
    createdAt: record.createdAt,
  });

  db.prepare(`UPDATE questions SET status = 'synthesized' WHERE id = ?`).run(record.questionId);

  return record;
}

export function listQuestionSession(questionId: string) {
  return {
    question: getQuestion(questionId),
    submissions: listSubmissions(questionId),
    synthesis: getSynthesis(questionId),
  };
}
