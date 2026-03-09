import {
  ClusterBreakdown,
  Question,
  ReasoningSubmission,
  SynthesisOutput,
  VerificationRecord,
} from '../types';
import {
  clusterLabelFromKeywords,
  extractKeywords,
  keywordSimilarity,
} from './scoring';
import { StorageUploadResult } from './storage';

function getSubmissionWeight(submission: ReasoningSubmission) {
  return submission.qualityScore * (0.45 + submission.confidence / 10 * 0.55);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export async function synthesizeQuestion(
  question: Question,
  submissions: ReasoningSubmission[],
  verifications: VerificationRecord[],
  archiveSession: (payload: unknown) => Promise<StorageUploadResult>,
): Promise<SynthesisOutput> {
  if (submissions.length === 0) {
    throw new Error('Cannot synthesize a question with no reasoning submissions.');
  }

  const clusterMap = new Map<string, ReasoningSubmission[]>();
  submissions.forEach((submission) => {
    const current = clusterMap.get(submission.clusterId) ?? [];
    current.push(submission);
    clusterMap.set(submission.clusterId, current);
  });

  const clusterBreakdown: ClusterBreakdown[] = [...clusterMap.entries()]
    .map(([clusterId, clusterSubmissions]) => {
      const weight = clusterSubmissions.reduce(
        (sum, submission) => sum + getSubmissionWeight(submission),
        0,
      );

      return {
        id: clusterId,
        label: clusterLabelFromKeywords(
          extractKeywords(
            clusterSubmissions.flatMap((submission) => [
              ...submission.premises,
              submission.conclusion,
            ]),
            4,
          ),
        ),
        weight: Number(weight.toFixed(2)),
        stance: 'dissent' as const,
        submissionIds: clusterSubmissions.map((submission) => submission.id),
      };
    })
    .sort((a, b) => b.weight - a.weight);

  clusterBreakdown[0].stance = 'consensus';
  const dominantCluster = clusterBreakdown[0];
  const dominantSubmissions = clusterMap.get(dominantCluster.id) ?? [];
  const sortedDominant = [...dominantSubmissions].sort(
    (a, b) => getSubmissionWeight(b) - getSubmissionWeight(a),
  );
  const dominantConclusion =
    sortedDominant[0]?.conclusion ?? 'The deliberation did not yield a dominant conclusion.';

  const consensusPoints = unique(
    sortedDominant
      .flatMap((submission) => submission.premises)
      .filter((premise) => premise.trim().length > 20),
  ).slice(0, 3);

  const minorityViews = clusterBreakdown
    .slice(1, 3)
    .map((cluster) => {
      const representative = [...(clusterMap.get(cluster.id) ?? [])].sort(
        (a, b) => getSubmissionWeight(b) - getSubmissionWeight(a),
      )[0];

      return representative?.conclusion;
    })
    .filter(Boolean) as string[];

  const dissensusPoints = clusterBreakdown.slice(1, 4).map((cluster) => {
    const clusterSubmissions = clusterMap.get(cluster.id) ?? [];
    const representative = [...clusterSubmissions].sort(
      (a, b) => getSubmissionWeight(b) - getSubmissionWeight(a),
    )[0];

    if (!representative) {
      return `${cluster.label} surfaced a material disagreement.`;
    }

    const bridge = keywordSimilarity(
      extractKeywords(consensusPoints, 12),
      representative.keywords,
    );

    if (bridge > 0.2) {
      return `${cluster.label} agrees on parts of the frame but pushes a different conclusion: ${representative.conclusion}`;
    }

    return `${cluster.label} challenges the dominant frame with: ${representative.conclusion}`;
  });

  const verifiedHumanCount = new Set(
    submissions.map((submission) => submission.verificationNullifierHash),
  ).size;

  const topSignals = extractKeywords(
    submissions.flatMap((submission) => [...submission.premises, submission.conclusion]),
    6,
  );

  const qualityWeightedSummary = [
    `Noosphere aggregated ${submissions.length} structured reasoning chains from ${verifiedHumanCount} verified humans on "${question.text}".`,
    `The dominant cluster converged on: ${dominantConclusion}`,
    topSignals.length > 0
      ? `The highest-signal themes across the session were ${topSignals.slice(0, 4).join(', ')}.`
      : 'The session produced enough overlap to form a clear consensus cluster.',
    minorityViews[0]
      ? `A meaningful minority view remained active: ${minorityViews[0]}`
      : 'No minority view accumulated enough weight to seriously challenge the leading conclusion.',
  ].join(' ');

  const synthesisWithoutArchive = {
    id: `syn-${crypto.randomUUID()}`,
    questionId: question.id,
    generatedAt: new Date().toISOString(),
    contributorCount: submissions.length,
    verifiedHumanCount:
      verifications.filter((verification) => verification.questionId === question.id).length ||
      verifiedHumanCount,
    dominantConclusion,
    consensusPoints,
    dissensusPoints,
    minorityViews,
    qualityWeightedSummary,
    clusterBreakdown,
  };

  const archiveUpload = await archiveSession({
    question,
    submissions,
    synthesis: synthesisWithoutArchive,
  });

  return {
    ...synthesisWithoutArchive,
    archiveCid: archiveUpload.cid,
    storageNetwork: archiveUpload.network,
    archiveGatewayUrl: archiveUpload.gatewayUrl,
  };
}
