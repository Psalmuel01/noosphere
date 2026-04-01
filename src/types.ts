export type Screen = 'landing' | 'questions' | 'create' | 'question' | 'synthesis' | 'docs';

export type QuestionStatus = 'open' | 'synthesizing' | 'complete';
export type VerificationMode = 'demo' | 'world-id';
export type StorageNetwork = 'storacha' | 'filecoin' | 'local-ipfs';
export type ReasoningType =
  | 'empirical evidence'
  | 'historical precedent'
  | 'logical inference'
  | 'personal expertise'
  | 'analogy';

export interface Question {
  id: string;
  text: string;
  description: string;
  creatorName: string;
  deadline: string;
  createdAt: string;
  status: QuestionStatus;
  tags: string[];
}

export interface VerificationRecord {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  nullifierHash: string;
  mode: VerificationMode;
  verifiedAt: string;
  proof: string | null;
}

export interface ReasoningSubmission {
  id: string;
  questionId: string;
  contributorName: string;
  walletAddress: string;
  premises: string[];
  conclusion: string;
  reasoningTypes: ReasoningType[];
  changeMind: string;
  confidence: number;
  qualityScore: number;
  createdAt: string;
  verificationNullifierHash: string;
  storageCid: string;
  storageNetwork: StorageNetwork;
  storageGatewayUrl: string | null;
  keywords: string[];
  clusterId: string;
}

export interface ClusterBreakdown {
  id: string;
  label: string;
  weight: number;
  stance: 'consensus' | 'dissent';
  submissionIds: string[];
}

export interface SynthesisOutput {
  id: string;
  questionId: string;
  generatedAt: string;
  contributorCount: number;
  verifiedHumanCount: number;
  dominantConclusion: string;
  consensusPoints: string[];
  dissensusPoints: string[];
  minorityViews: string[];
  qualityWeightedSummary: string;
  provider: 'gemini' | 'local-fallback';
  providerDetail: string;
  archiveCid: string;
  storageNetwork: StorageNetwork;
  archiveGatewayUrl: string | null;
  clusterBreakdown: ClusterBreakdown[];
}

export interface QuestionDraft {
  text: string;
  description: string;
  creatorName: string;
  deadline: string;
  tags: string[];
}

export interface SubmissionDraft {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  premises: string[];
  conclusion: string;
  reasoningTypes: ReasoningType[];
  changeMind: string;
  confidence: number;
}

export interface VerificationDraft {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  mode: VerificationMode;
  proof?: string | null;
}

export interface NoosphereState {
  questions: Question[];
  submissions: ReasoningSubmission[];
  syntheses: SynthesisOutput[];
  verifications: VerificationRecord[];
}

export interface IntegrationStatus {
  ok: boolean;
  label: string;
  detail: string;
}

export interface BackendStatus {
  storacha: IntegrationStatus;
  impulse: IntegrationStatus;
  gemini: IntegrationStatus;
  filecoin: IntegrationStatus;
}

export interface StorageStatusSummary extends IntegrationStatus {
  network: StorageNetwork;
  configured: boolean;
}
