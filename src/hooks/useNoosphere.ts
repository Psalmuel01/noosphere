import { useEffect, useRef, useState } from 'react';
import { seedState } from '../data/seed';
import { createHexDigest, createIpfsCid } from '../lib/cid';
import { extractKeywords, keywordSimilarity, scoreReasoning } from '../lib/scoring';
import { synthesizeQuestion } from '../lib/synthesis';
import {
  NoosphereState,
  Question,
  QuestionDraft,
  ReasoningSubmission,
  SubmissionDraft,
  SynthesisOutput,
  VerificationDraft,
  VerificationRecord,
} from '../types';

const STORAGE_KEY = 'noosphere-state-v1';

function cloneSeedState(): NoosphereState {
  return JSON.parse(JSON.stringify(seedState)) as NoosphereState;
}

function loadState() {
  const persisted = localStorage.getItem(STORAGE_KEY);

  if (!persisted) {
    return cloneSeedState();
  }

  try {
    return JSON.parse(persisted) as NoosphereState;
  } catch {
    return cloneSeedState();
  }
}

function persistState(state: NoosphereState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deriveQuestionStatus(question: Question, syntheses: SynthesisOutput[]) {
  if (syntheses.some((synthesis) => synthesis.questionId === question.id)) {
    return 'complete' as const;
  }

  return new Date(question.deadline) <= new Date() ? 'synthesizing' : 'open';
}

function normalizeState(state: NoosphereState): NoosphereState {
  return {
    ...state,
    questions: state.questions.map((question) => ({
      ...question,
      status: deriveQuestionStatus(question, state.syntheses),
    })),
  };
}

export function useNoosphere() {
  const [state, setState] = useState<NoosphereState>(() => normalizeState(loadState()));
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState<string | null>(null);
  const stateRef = useRef(state);
  const synthInFlight = useRef(new Set<string>());

  useEffect(() => {
    stateRef.current = state;
    persistState(state);
    setIsHydrated(true);
  }, [state]);

  async function createQuestion(draft: QuestionDraft) {
    const question: Question = {
      id: `q-${crypto.randomUUID()}`,
      text: draft.text.trim(),
      description: draft.description.trim(),
      creatorName: draft.creatorName.trim(),
      deadline: draft.deadline,
      createdAt: new Date().toISOString(),
      status: 'open',
      tags: draft.tags,
    };

    setState((current) =>
      normalizeState({
        ...current,
        questions: [question, ...current.questions],
      }),
    );

    return question;
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

    setState((current) => {
      const existing = current.verifications.filter(
        (item) =>
          !(
            item.questionId === verification.questionId &&
            item.walletAddress === verification.walletAddress
          ),
      );

      return normalizeState({
        ...current,
        verifications: [verification, ...existing],
      });
    });

    return verification;
  }

  async function submitReasoning(draft: SubmissionDraft) {
    const currentState = stateRef.current;
    const verification = currentState.verifications.find(
      (item) =>
        item.questionId === draft.questionId &&
        item.walletAddress.toLowerCase() === draft.walletAddress.trim().toLowerCase(),
    );

    if (!verification) {
      throw new Error('World ID verification is required before submitting reasoning.');
    }

    const premises = draft.premises.map((premise) => premise.trim()).filter(Boolean);
    if (premises.length < 2) {
      throw new Error('At least two premises are required.');
    }

    const conclusion = draft.conclusion.trim();
    const qualityScore = scoreReasoning(premises, conclusion, draft.confidence);
    const keywords = extractKeywords([...premises, conclusion], 10);
    const questionSubmissions = currentState.submissions.filter(
      (submission) => submission.questionId === draft.questionId,
    );

    const matchedCluster = questionSubmissions
      .map((submission) => ({
        clusterId: submission.clusterId,
        similarity: keywordSimilarity(keywords, submission.keywords),
      }))
      .sort((a, b) => b.similarity - a.similarity)[0];

    const clusterId =
      matchedCluster && matchedCluster.similarity >= 0.28
        ? matchedCluster.clusterId
        : `cluster-${keywords[0] ?? 'emergent'}-${crypto.randomUUID().slice(0, 6)}`;

    const submission: ReasoningSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      questionId: draft.questionId,
      contributorName: draft.contributorName.trim(),
      walletAddress: draft.walletAddress.trim(),
      premises,
      conclusion,
      confidence: draft.confidence,
      qualityScore,
      createdAt: new Date().toISOString(),
      verificationNullifierHash: verification.nullifierHash,
      storageCid: await createIpfsCid({
        contributor: draft.contributorName.trim(),
        walletAddress: draft.walletAddress.trim(),
        premises,
        conclusion,
        confidence: draft.confidence,
        qualityScore,
      }),
      storageNetwork: 'ipfs',
      keywords,
      clusterId,
    };

    setState((current) =>
      normalizeState({
        ...current,
        submissions: [submission, ...current.submissions],
      }),
    );

    return submission;
  }

  async function runSynthesis(questionId: string) {
    if (synthInFlight.current.has(questionId)) {
      return stateRef.current.syntheses.find((synthesis) => synthesis.questionId === questionId);
    }

    const currentState = stateRef.current;
    const question = currentState.questions.find((item) => item.id === questionId);
    if (!question) {
      throw new Error('Question not found.');
    }

    const questionSubmissions = currentState.submissions.filter(
      (submission) => submission.questionId === questionId,
    );
    if (questionSubmissions.length === 0) {
      throw new Error('Cannot synthesize without submissions.');
    }

    synthInFlight.current.add(questionId);
    setIsSynthesizing(questionId);

    try {
      const synthesis = await synthesizeQuestion(
        question,
        questionSubmissions,
        currentState.verifications,
      );

      setState((current) => {
        const syntheses = current.syntheses.filter((item) => item.questionId !== questionId);

        return normalizeState({
          ...current,
          syntheses: [synthesis, ...syntheses],
        });
      });

      return synthesis;
    } finally {
      synthInFlight.current.delete(questionId);
      setIsSynthesizing(null);
    }
  }

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const dueQuestions = state.questions.filter((question) => {
      const hasSynthesis = state.syntheses.some((synthesis) => synthesis.questionId === question.id);
      const hasSubmissions = state.submissions.some(
        (submission) => submission.questionId === question.id,
      );

      return !hasSynthesis && hasSubmissions && new Date(question.deadline) <= new Date();
    });

    dueQuestions.forEach((question) => {
      if (!synthInFlight.current.has(question.id)) {
        void runSynthesis(question.id);
      }
    });
  }, [isHydrated, state.questions, state.submissions, state.syntheses]);

  function resetDemoData() {
    const nextState = normalizeState(cloneSeedState());
    setState(nextState);
  }

  return {
    state,
    isSynthesizing,
    createQuestion,
    verifyParticipant,
    submitReasoning,
    runSynthesis,
    resetDemoData,
  };
}
