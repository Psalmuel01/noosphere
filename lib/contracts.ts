export type QuestionStatus = 'open' | 'closed' | 'synthesized';
export type StorageNetwork = 'storacha' | 'filecoin' | 'local-ipfs';

export interface QuestionRecord {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdAt: string;
  deadline: string;
  status: QuestionStatus;
  tags: string[];
}

export interface SubmissionRecord {
  id: string;
  questionId: string;
  contributorId: string;
  contributorName: string;
  conclusion: string;
  premises: string[];
  confidence: number;
  changeMind: string;
  premiseCount: number;
  avgPremiseLength: number;
  engagementCount: number;
  persuasionScore: number;
  storachaCid: string;
  storageGatewayUrl: string | null;
  storageNetwork: StorageNetwork;
  reasoningTypes: string[];
  createdAt: string;
}

export interface VerificationRecord {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  nullifierHash: string;
  mode: 'demo' | 'world-id';
  verifiedAt: string;
  proof: string | null;
}

export interface SynthesisRecord {
  questionId: string;
  consensusPoints: string[];
  dissensusPoints: string[];
  dominantConclusion: string;
  minorityViews: string[];
  summary: string;
  provider: 'gemini' | 'local-fallback';
  providerDetail: string;
  filecoinCid: string;
  archiveGatewayUrl: string | null;
  createdAt: string;
}

export interface SubmissionInput {
  questionId: string;
  contributorId: string;
  contributorName: string;
  conclusion: string;
  premises: string[];
  confidence: number;
  changeMind?: string;
  reasoningTypes?: string[];
  engagementCount?: number;
}

export interface QuestionInput {
  title: string;
  description: string;
  creator: string;
  deadline: string;
  tags?: string[];
}

export interface VerificationInput {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  nullifierHash: string;
  mode: 'demo' | 'world-id';
  proof?: string | null;
}

export interface PredictionFeatures {
  premiseCount: number;
  avgPremiseLength: number;
  confidence: number;
  conclusionLength: number;
  hasChangeMind: boolean;
  engagementCount: number;
  timeInSession?: number;
  mindChanged?: number;
}

export interface ProviderStatus {
  ok: boolean;
  label: string;
  detail: string;
}

export interface SystemStatus {
  storacha: ProviderStatus;
  impulse: ProviderStatus;
  gemini: ProviderStatus;
  filecoin: ProviderStatus;
}

export interface BootstrapPayload {
  questions: QuestionRecord[];
  submissions: SubmissionRecord[];
  syntheses: SynthesisRecord[];
  verifications: VerificationRecord[];
  status: SystemStatus;
}
