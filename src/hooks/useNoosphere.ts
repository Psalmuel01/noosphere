import { useCallback, useEffect, useMemo, useState } from 'react';
import { createHexDigest } from '../lib/cid';
import { extractKeywords } from '../lib/scoring';
import {
  BackendStatus,
  NoosphereState,
  Question,
  QuestionDraft,
  ReasoningSubmission,
  StorageStatusSummary,
  SubmissionDraft,
  SynthesisOutput,
  VerificationDraft,
  VerificationRecord,
} from '../types';

type ApiQuestion = {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdAt: string;
  deadline: string;
  status: 'open' | 'closed' | 'synthesized';
  tags: string[];
};

type ApiSubmission = {
  id: string;
  questionId: string;
  contributorId: string;
  contributorName: string;
  conclusion: string;
  premises: string[];
  confidence: number;
  changeMind: string;
  persuasionScore: number;
  storachaCid: string;
  storageNetwork: 'storacha' | 'filecoin' | 'local-ipfs';
  storageGatewayUrl: string | null;
  reasoningTypes: string[];
  createdAt: string;
};

type ApiSynthesis = {
  questionId: string;
  consensusPoints: string[];
  dissensusPoints: string[];
  dominantConclusion: string;
  minorityViews: string[];
  summary: string;
  provider: 'openai' | 'local-fallback';
  providerDetail: string;
  filecoinCid: string;
  archiveGatewayUrl: string | null;
  createdAt: string;
};

type BootstrapResponse = {
  questions: ApiQuestion[];
  submissions: ApiSubmission[];
  syntheses: ApiSynthesis[];
  verifications: VerificationRecord[];
  status: BackendStatus;
};

type BootstrappedState = NoosphereState;

function mapQuestion(question: ApiQuestion): Question {
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

function mapSubmission(submission: ApiSubmission): ReasoningSubmission {
  const keywords = extractKeywords(
    [
      submission.conclusion,
      ...submission.premises,
      submission.changeMind,
      ...submission.reasoningTypes,
    ],
    10,
  );

  return {
    id: submission.id,
    questionId: submission.questionId,
    contributorName: submission.contributorName,
    walletAddress: submission.contributorId,
    premises: submission.premises,
    conclusion: submission.conclusion,
    reasoningTypes: submission.reasoningTypes as any,
    changeMind: submission.changeMind,
    confidence: Math.round(submission.confidence * 10),
    qualityScore: submission.persuasionScore,
    createdAt: submission.createdAt,
    verificationNullifierHash: submission.contributorId,
    storageCid: submission.storachaCid,
    storageNetwork: submission.storageNetwork,
    storageGatewayUrl: submission.storageGatewayUrl,
    keywords,
    clusterId: `cluster-${keywords[0] ?? 'emergent'}`,
  };
}

function mapSynthesis(synthesis: ApiSynthesis): SynthesisOutput {
  return {
    id: `syn-${synthesis.questionId}`,
    questionId: synthesis.questionId,
    generatedAt: synthesis.createdAt,
    contributorCount: 0,
    verifiedHumanCount: 0,
    dominantConclusion: synthesis.dominantConclusion,
    consensusPoints: synthesis.consensusPoints,
    dissensusPoints: synthesis.dissensusPoints,
    minorityViews: synthesis.minorityViews,
    qualityWeightedSummary: synthesis.summary,
    provider: synthesis.provider,
    providerDetail: synthesis.providerDetail,
    archiveCid: synthesis.filecoinCid,
    storageNetwork: 'filecoin',
    archiveGatewayUrl: synthesis.archiveGatewayUrl,
    clusterBreakdown: [],
  };
}

function buildBootstrappedState(payload: BootstrapResponse): BootstrappedState {
  const submissions = payload.submissions.map(mapSubmission);
  const submissionCounts = new Map<string, number>();
  const verificationCounts = new Map<string, Set<string>>();

  submissions.forEach((submission) => {
    submissionCounts.set(
      submission.questionId,
      (submissionCounts.get(submission.questionId) ?? 0) + 1,
    );
  });

  payload.verifications.forEach((verification) => {
    const contributors = verificationCounts.get(verification.questionId) ?? new Set<string>();
    contributors.add(verification.walletAddress.toLowerCase());
    verificationCounts.set(verification.questionId, contributors);
  });

  return {
    questions: payload.questions.map(mapQuestion),
    submissions,
    syntheses: payload.syntheses.map((synthesis) => ({
      ...mapSynthesis(synthesis),
      contributorCount: submissionCounts.get(synthesis.questionId) ?? 0,
      verifiedHumanCount: verificationCounts.get(synthesis.questionId)?.size ?? 0,
    })),
    verifications: payload.verifications,
  };
}

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function useNoosphere() {
  const [state, setState] = useState<NoosphereState>({
    questions: [],
    submissions: [],
    syntheses: [],
    verifications: [],
  });
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    storacha: { ok: false, label: 'Storacha', detail: 'Loading...' },
    impulse: { ok: false, label: 'Impulse AI', detail: 'Loading...' },
    openai: { ok: false, label: 'OpenAI', detail: 'Loading...' },
    filecoin: { ok: false, label: 'Filecoin', detail: 'Loading...' },
  });
  const [isSynthesizing, setIsSynthesizing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const payload = await request<BootstrapResponse>('/api/bootstrap');
    setBackendStatus(payload.status);
    setState((current) => ({
      ...current,
      ...buildBootstrappedState(payload),
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createQuestion(draft: QuestionDraft) {
    const question = await request<ApiQuestion>('/api/questions', {
      method: 'POST',
      body: JSON.stringify({
        title: draft.text.trim(),
        description: draft.description.trim(),
        creator: draft.creatorName.trim() || undefined,
        deadline: draft.deadline || undefined,
        tags: draft.tags,
      }),
    });

    await refresh();
    return mapQuestion(question);
  }

  async function verifyParticipant(draft: VerificationDraft) {
    const payload = `${draft.questionId}:${draft.walletAddress}:${draft.contributorName}`;
    const nullifierHash = `wid_${(await createHexDigest(payload)).slice(0, 20)}`;
    const verification: VerificationRecord = {
      questionId: draft.questionId,
      contributorName: draft.contributorName.trim(),
      walletAddress: draft.walletAddress.trim(),
      nullifierHash,
      mode: draft.mode,
      verifiedAt: new Date().toISOString(),
      proof: draft.proof ?? null,
    };

    await request<VerificationRecord>('/api/verifications', {
      method: 'POST',
      body: JSON.stringify(verification),
    });
    await refresh();
    return verification;
  }

  async function submitReasoning(draft: SubmissionDraft) {
    const contributorName = draft.contributorName.trim() || 'Anonymous';
    const contributorId =
      draft.walletAddress.trim() ||
      `anon_${(await createHexDigest(`${draft.questionId}:${contributorName}:${Date.now()}`)).slice(0, 12)}`;

    const payload = await request<ApiSubmission & { clusterId?: string }>(
      `/api/questions/${draft.questionId}/reasoning`,
      {
        method: 'POST',
        body: JSON.stringify({
          contributorId,
          contributorName,
          conclusion: draft.conclusion.trim(),
          premises: draft.premises.map((premise) => premise.trim()).filter(Boolean),
          confidence: Number((draft.confidence / 10).toFixed(2)),
          changeMind: draft.changeMind.trim(),
          reasoningTypes: draft.reasoningTypes,
          engagementCount: 0,
        }),
      },
    );

    await refresh();

    return {
      ...mapSubmission(payload),
      clusterId:
        payload.clusterId ??
        `cluster-${extractKeywords([payload.conclusion, ...payload.premises], 1)[0] ?? 'emergent'}`,
    };
  }

  async function runSynthesis(questionId: string) {
    setIsSynthesizing(questionId);

    try {
      const synthesis = await request<ApiSynthesis>(`/api/questions/${questionId}/aggregate`, {
        method: 'POST',
      });

      await refresh();
      return mapSynthesis(synthesis);
    } finally {
      setIsSynthesizing(null);
    }
  }

  async function resetDemoData() {
    const payload = await request<BootstrapResponse>('/api/admin/reset', { method: 'POST' });
    setBackendStatus(payload.status);
    setState(buildBootstrappedState(payload));
  }

  const storageStatus = useMemo<StorageStatusSummary>(() => {
    if (backendStatus.storacha.ok) {
      return {
        ...backendStatus.storacha,
        configured: true,
        network: 'storacha',
      };
    }

    if (backendStatus.filecoin.ok) {
      return {
        ...backendStatus.filecoin,
        configured: true,
        network: 'filecoin',
      };
    }

    return {
      ...backendStatus.storacha,
      configured: false,
      network: 'local-ipfs',
    };
  }, [backendStatus]);

  return {
    state,
    backendStatus,
    storageStatus,
    isSynthesizing,
    createQuestion,
    verifyParticipant,
    submitReasoning,
    runSynthesis,
    resetDemoData,
    refresh,
  };
}
