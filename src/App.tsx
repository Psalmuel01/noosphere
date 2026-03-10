import {
  Suspense,
  lazy,
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Cloud,
  Compass,
  Database,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Focus,
  Minus,
  Plus,
  PlusCircle,
  Rocket,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { HeroCanvas } from './components/HeroCanvas';
import { useNoosphere } from './hooks/useNoosphere';
import {
  Question,
  QuestionStatus,
  ReasoningType,
  ReasoningSubmission,
  Screen,
  SubmissionDraft,
  SynthesisOutput,
  VerificationRecord,
} from './types';

type FilterStatus = 'all' | QuestionStatus;

type SubmissionFormState = Omit<SubmissionDraft, 'questionId'>;

const ReasoningGraph = lazy(() =>
  import('./components/ReasoningGraph').then((module) => ({
    default: module.ReasoningGraph,
  })),
);

const WorldIdVerificationButton = lazy(() =>
  import('./components/WorldIdVerificationButton').then((module) => ({
    default: module.WorldIdVerificationButton,
  })),
);

const REASONING_TYPE_OPTIONS: ReasoningType[] = [
  'empirical evidence',
  'historical precedent',
  'logical inference',
  'personal expertise',
  'analogy',
];

const emptySubmissionForm: SubmissionFormState = {
  contributorName: '',
  walletAddress: '',
  premises: ['', '', '', '', ''],
  conclusion: '',
  reasoningTypes: [],
  changeMind: '',
  confidence: 7,
};

const shellWidthClass = 'mx-auto w-full max-w-[1680px]';

function formatRelativeDeadline(deadline: string) {
  const delta = new Date(deadline).getTime() - Date.now();
  const hours = Math.round(Math.abs(delta) / (1000 * 60 * 60));

  if (delta >= 0) {
    return hours < 24 ? `${hours}h remaining` : `${Math.round(hours / 24)}d remaining`;
  }

  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function formatStatus(status: QuestionStatus) {
  if (status === 'complete') {
    return 'Complete';
  }

  if (status === 'synthesizing') {
    return 'Synthesizing';
  }

  return 'Open';
}

function deriveQuestionMetrics(
  question: Question,
  submissions: ReasoningSubmission[],
  syntheses: SynthesisOutput[],
  verifications: VerificationRecord[],
) {
  const questionSubmissions = submissions.filter((submission) => submission.questionId === question.id);
  const synthesis = syntheses.find((item) => item.questionId === question.id);
  const verifiedHumans = new Set(
    verifications
      .filter((verification) => verification.questionId === question.id)
      .map((verification) => verification.nullifierHash),
  ).size;

  return {
    submissions: questionSubmissions,
    synthesis,
    verifiedHumans,
    avgQuality:
      questionSubmissions.reduce((sum, submission) => sum + submission.qualityScore, 0) /
      Math.max(questionSubmissions.length, 1),
  };
}

function statusChip(status: QuestionStatus) {
  if (status === 'complete') {
    return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
  }

  if (status === 'synthesizing') {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  return 'bg-primary/15 text-primary border-primary/30';
}

function QuestionCard({
  key,
  question,
  submissionCount,
  verifiedHumans,
  avgQuality,
  onOpen,
}: {
  key?: string;
  question: Question;
  submissionCount: number;
  verifiedHumans: number;
  avgQuality: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -6 }}
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-slate-700/60 bg-atmosphere p-6 text-left transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusChip(question.status)}`}>
            {formatStatus(question.status)}
          </div>
          <h3 className="text-xl font-bold leading-tight text-slate-100 transition-colors group-hover:text-primary">
            {question.text}
          </h3>
        </div>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-slate-400">{question.description}</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {question.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto space-y-4">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-1 uppercase tracking-[0.2em] text-slate-500">Humans</p>
            <p className="text-lg font-bold text-slate-100">{verifiedHumans}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-1 uppercase tracking-[0.2em] text-slate-500">Chains</p>
            <p className="text-lg font-bold text-slate-100">{submissionCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-1 uppercase tracking-[0.2em] text-slate-500">Quality score</p>
            <p className="text-lg font-bold text-slate-100">{Math.round(avgQuality * 100)}%</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>{question.creatorName}</span>
          <span>{formatRelativeDeadline(question.deadline)}</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function App() {
  const {
    state,
    backendStatus,
    storageStatus,
    isSynthesizing,
    createQuestion,
    verifyParticipant,
    submitReasoning,
    runSynthesis,
    resetDemoData,
  } = useNoosphere();
  const navigate = useNavigate();
  const matchQuestion = useMatch('/questions/:id');
  const matchSynthesis = useMatch('/questions/:id/synthesis');
  const routeQuestionId = matchSynthesis?.params.id ?? matchQuestion?.params.id ?? null;
  const screen: Screen = matchSynthesis ? 'synthesis' : matchQuestion ? 'question' : 'landing';
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    routeQuestionId ?? state.questions[0]?.id ?? null,
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [questionDraft, setQuestionDraft] = useState({
    text: '',
    description: '',
    creatorName: '',
    deadline: '',
    tags: '',
  });
  const [submissionForm, setSubmissionForm] = useState<SubmissionFormState>(emptySubmissionForm);
  const deferredSearch = useDeferredValue(searchTerm);

  useEffect(() => {
    if (routeQuestionId && routeQuestionId !== selectedQuestionId) {
      setSelectedQuestionId(routeQuestionId);
      return;
    }

    if (!routeQuestionId && !selectedQuestionId && state.questions[0]) {
      setSelectedQuestionId(state.questions[0].id);
    }
  }, [routeQuestionId, selectedQuestionId, state.questions]);

  const visibleQuestions = state.questions.filter((question) => {
    const statusMatch = filterStatus === 'all' || question.status === filterStatus;
    const search = deferredSearch.trim().toLowerCase();
    const haystack = `${question.text} ${question.description} ${question.tags.join(' ')}`.toLowerCase();
    const searchMatch = !search || haystack.includes(search);

    return statusMatch && searchMatch;
  });

  const activeQuestion = state.questions.find((question) => question.id === selectedQuestionId) ?? null;
  const activeMetrics = activeQuestion
    ? deriveQuestionMetrics(activeQuestion, state.submissions, state.syntheses, state.verifications)
    : null;
  const showMissingQuestion = screen !== 'landing' && !activeQuestion && state.questions.length > 0;
  const activeSubmission =
    activeMetrics?.submissions.find((submission) => submission.id === selectedSubmissionId) ??
    activeMetrics?.submissions[0] ??
    null;
  const activeVerification =
    activeQuestion &&
    submissionForm.walletAddress &&
    state.verifications.find(
      (verification) =>
        verification.questionId === activeQuestion.id &&
        verification.walletAddress.toLowerCase() === submissionForm.walletAddress.trim().toLowerCase(),
    );

  useEffect(() => {
    if (activeMetrics?.submissions[0] && !selectedSubmissionId) {
      setSelectedSubmissionId(activeMetrics.submissions[0].id);
    }
  }, [activeMetrics, selectedSubmissionId]);

  async function handleCreateQuestion() {
    if (!questionDraft.text.trim() || !questionDraft.description.trim()) {
      return;
    }

    const question = await createQuestion({
      text: questionDraft.text,
      description: questionDraft.description,
      creatorName: questionDraft.creatorName,
      deadline: questionDraft.deadline,
      tags: questionDraft.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5),
    });

    setQuestionDraft({
      text: '',
      description: '',
      creatorName: '',
      deadline: '',
      tags: '',
    });

    startTransition(() => {
      setSelectedQuestionId(question.id);
      navigate(`/questions/${question.id}`);
    });
  }

  async function handleVerify(mode: 'demo' | 'world-id', proof?: string | null) {
    if (!activeQuestion || !submissionForm.contributorName.trim() || !submissionForm.walletAddress.trim()) {
      return;
    }

    await verifyParticipant({
      questionId: activeQuestion.id,
      contributorName: submissionForm.contributorName,
      walletAddress: submissionForm.walletAddress,
      mode,
      proof,
    });
  }

  async function handleSubmitReasoning() {
    if (!activeQuestion) {
      return;
    }

    const draft: SubmissionDraft = {
      questionId: activeQuestion.id,
      contributorName: submissionForm.contributorName,
      walletAddress: submissionForm.walletAddress,
      premises: submissionForm.premises.filter((premise) => premise.trim()),
      conclusion: submissionForm.conclusion,
      reasoningTypes: submissionForm.reasoningTypes,
      changeMind: submissionForm.changeMind,
      confidence: submissionForm.confidence,
    };

    const submission = await submitReasoning(draft);
    setSelectedSubmissionId(submission.id);
    setSubmissionForm((current) => ({
      ...current,
      premises: ['', '', '', '', ''],
      conclusion: '',
      reasoningTypes: [],
      changeMind: '',
      confidence: 7,
    }));
  }

  async function handleRunSynthesis() {
    if (!activeQuestion) {
      return;
    }

    await runSynthesis(activeQuestion.id);
    startTransition(() => {
      navigate(`/questions/${activeQuestion.id}/synthesis`);
    });
  }

  function handleDownloadSynthesis(synthesis: SynthesisOutput, question: Question) {
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (height = 24) => {
      if (y + height <= pageHeight - margin) {
        return;
      }

      doc.addPage();
      y = margin;
    };

    const addWrappedText = (
      text: string,
      options: { size?: number; color?: [number, number, number]; weight?: 'normal' | 'bold'; gap?: number } = {},
    ) => {
      const size = options.size ?? 11;
      const gap = options.gap ?? 16;

      doc.setFont('helvetica', options.weight === 'bold' ? 'bold' : 'normal');
      doc.setFontSize(size);
      if (options.color) {
        doc.setTextColor(...options.color);
      } else {
        doc.setTextColor(24, 24, 27);
      }

      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = size * 1.45;
      ensureSpace(lines.length * lineHeight + gap);
      doc.text(lines, margin, y);
      y += lines.length * lineHeight + gap;
    };

    const addSection = (title: string, items: string[] | string) => {
      addWrappedText(title, {
        size: 10,
        color: [79, 70, 229],
        weight: 'bold',
        gap: 10,
      });

      if (Array.isArray(items)) {
        if (items.length === 0) {
          addWrappedText('None recorded.', { size: 11, color: [82, 82, 91] });
          return;
        }

        items.forEach((item) => {
          addWrappedText(`• ${item}`, { size: 11, color: [39, 39, 42], gap: 10 });
        });
        y += 6;
        return;
      }

      addWrappedText(items, { size: 11, color: [39, 39, 42] });
    };

    addWrappedText('NOOSPHERE SYNTHESIS REPORT', {
      size: 12,
      color: [79, 70, 229],
      weight: 'bold',
      gap: 12,
    });
    addWrappedText(question.text, {
      size: 22,
      color: [15, 23, 42],
      weight: 'bold',
      gap: 14,
    });
    addWrappedText(question.description, {
      size: 12,
      color: [71, 85, 105],
      gap: 18,
    });
    addWrappedText(
      `Generated ${new Date(synthesis.generatedAt).toLocaleString()} • ${
        synthesis.provider === 'gemini' ? 'Gemini synthesis' : 'Local fallback synthesis'
      }`,
      {
        size: 10,
        color: [100, 116, 139],
        gap: 20,
      },
    );
    addSection('Dominant Conclusion', synthesis.dominantConclusion);
    addSection('Consensus', synthesis.consensusPoints);
    addSection('Disagreements', synthesis.dissensusPoints);
    addSection('Minority Views', synthesis.minorityViews);
    addSection('Summary', synthesis.qualityWeightedSummary);
    addSection('Generation Notes', synthesis.providerDetail);
    addSection('Archive CID', synthesis.archiveCid);

    doc.save(`${question.id}-synthesis-report.pdf`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-dark font-display text-slate-100">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/85 px-6 py-4 backdrop-blur-md md:px-12">
        <div className={`${shellWidthClass} flex items-center justify-between gap-6`}>
          <button
            onClick={() => startTransition(() => navigate('/'))}
            className="flex items-center gap-3 text-primary"
          >
            <Box className="h-8 w-8" />
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight text-slate-100">Noosphere</p>
              {/* <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Swarm Intelligence Reasoning Engine
              </p> */}
            </div>
          </button>
          <div className="hidden items-center gap-4 lg:flex">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search questions..."
                className="w-72 rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-primary"
              />
            </div>
            <button
              onClick={resetDemoData}
              className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-primary hover:text-primary"
            >
              Reset Demo Data
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {showMissingQuestion && (
            <motion.div key="missing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className={`${shellWidthClass} px-6 py-16 md:px-12`}>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                    Question Not Found
                  </p>
                  <h2 className="mt-4 text-3xl font-bold text-slate-100">
                    That session does not exist anymore.
                  </h2>
                  <p className="mt-3 text-sm text-slate-400">
                    Choose another question from the feed.
                  </p>
                  <button
                    onClick={() => startTransition(() => navigate('/'))}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
                  >
                    Back to questions
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </section>
            </motion.div>
          )}
          {screen === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-12">
                <HeroCanvas />
                <div className="absolute inset-0 stars-bg opacity-30" />
                <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 nebula-gradient" />
                <div className={`relative ${shellWidthClass} grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]`}>
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font- uppercase tracking-[0.25em] text-primary">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      Decentralized reasoning engine.
                    </div>
                    <div className="space-y-4">
                      <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
                        THE SPHERE OF THOUGHT
                      </h1>
                      <p className="max-w-2xl text-lg leading-relaxed text-slate-400">
                        Democracy aggregates votes. Noosphere aggregates reasoning.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() =>
                          startTransition(() => {
                            const target = routeQuestionId ?? selectedQuestionId ?? state.questions[0]?.id;
                            if (target) {
                              navigate(`/questions/${target}`);
                            }
                          })
                        }
                        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-white shadow-xl shadow-primary/20 transition hover:scale-[1.02]"
                      >
                        Explore Live Graph
                        <Compass className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => document.getElementById('create-question')?.scrollIntoView({ behavior: 'smooth' })}
                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-atmosphere px-6 py-4 font-bold text-slate-100 transition hover:border-primary"
                      >
                        Ask a Question
                        <PlusCircle className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        ['Verified humans', `${state.verifications.length}`],
                        ['Reasoning chains', `${state.submissions.length}`],
                        ['Completed syntheses', `${state.syntheses.length}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
                          <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Storage layer
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${storageStatus.network === 'storacha'
                            ? 'bg-teal-500/10 text-teal-400'
                            : 'bg-amber-500/10 text-amber-400'
                            }`}
                        >
                          {storageStatus.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-400">
                        {storageStatus.detail}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[backendStatus.impulse, backendStatus.gemini, backendStatus.filecoin].map(
                        (status) => (
                          <div
                            key={status.label}
                            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                          >
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${
                                status.ok
                                  ? 'bg-teal-500/10 text-teal-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {status.label}
                            </span>
                            <p className="mt-3 text-sm leading-relaxed text-slate-400">
                              {status.detail}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div
                    id="create-question"
                    className="rounded-3xl border border-slate-800 bg-slate-950/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-md"
                  >
                    <div className="mb-6 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                        Launch a Deliberation
                      </p>
                      <h2 className="text-2xl font-bold">Open a new reasoning session</h2>
                      <p className="text-sm leading-relaxed text-slate-400">
                        Create a question and start collecting structured reasoning immediately.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <input
                        value={questionDraft.text}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({ ...current, text: event.target.value }))
                        }
                        placeholder="Question"
                        className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-sm outline-none transition focus:border-primary"
                      />
                      <textarea
                        value={questionDraft.description}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="What kind of reasoning should contributors bring?"
                        className="min-h-28 w-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm outline-none transition focus:border-primary"
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          value={questionDraft.creatorName}
                          onChange={(event) =>
                            setQuestionDraft((current) => ({
                              ...current,
                              creatorName: event.target.value,
                            }))
                          }
                          placeholder="Creator name (optional)"
                          className="h-12 rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-sm outline-none transition focus:border-primary"
                        />
                        <input
                          value={questionDraft.deadline}
                          onChange={(event) =>
                            setQuestionDraft((current) => ({
                              ...current,
                              deadline: event.target.value,
                            }))
                          }
                          type="datetime-local"
                          className="h-12 rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-sm outline-none transition focus:border-primary"
                        />
                      </div>
                      <input
                        value={questionDraft.tags}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({ ...current, tags: event.target.value }))
                        }
                        placeholder="Tags, comma separated (optional)"
                        className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-sm outline-none transition focus:border-primary"
                      />
                      <button
                        onClick={() => void handleCreateQuestion()}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
                      >
                        <Rocket className="h-4 w-4" />
                        Open Session
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className={`${shellWidthClass} px-6 pb-20 md:px-12`}>
                <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                      Questions Feed
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight">Active collective intelligence sessions</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['all', 'All'],
                      ['open', 'Open'],
                      ['synthesizing', 'Synthesizing'],
                      ['complete', 'Complete'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setFilterStatus(value as FilterStatus)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] transition ${filterStatus === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-800 text-slate-400 hover:border-primary/40'
                          }`}
                      >
                        <Filter className="mr-2 inline h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleQuestions.map((question) => {
                    const metrics = deriveQuestionMetrics(
                      question,
                      state.submissions,
                      state.syntheses,
                      state.verifications,
                    );

                    return (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        submissionCount={metrics.submissions.length}
                        verifiedHumans={metrics.verifiedHumans}
                        avgQuality={metrics.avgQuality}
                        onOpen={() => {
                          setSelectedQuestionId(question.id);
                          setSelectedSubmissionId(metrics.submissions[0]?.id ?? null);
                          startTransition(() => {
                            const target =
                              question.status === 'complete'
                                ? `/questions/${question.id}/synthesis`
                                : `/questions/${question.id}`;
                            navigate(target);
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {screen === 'question' && activeQuestion && activeMetrics && (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="border-b border-slate-800 bg-background-dark/80 px-6 py-4 md:px-10">
                <div className={`${shellWidthClass} flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between`}>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => startTransition(() => navigate('/'))}
                      className="rounded-xl border border-slate-800 p-3 text-slate-400 transition hover:border-primary hover:text-primary"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${statusChip(activeQuestion.status)}`}>
                          {formatStatus(activeQuestion.status)}
                        </span>
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          {formatRelativeDeadline(activeQuestion.deadline)}
                        </span>
                      </div>
                      <h1 className="max-w-4xl text-2xl font-bold leading-tight md:text-3xl">
                        {activeQuestion.text}
                      </h1>
                      <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                        {activeQuestion.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Verified humans</p>
                      <p className="mt-1 text-xl font-bold">{activeMetrics.verifiedHumans}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Reasoning chains</p>
                      <p className="mt-1 text-xl font-bold">{activeMetrics.submissions.length}</p>
                    </div>
                    <button
                      onClick={() => void handleRunSynthesis()}
                      disabled={activeMetrics.submissions.length < 2 || isSynthesizing === activeQuestion.id}
                      className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Rocket className="h-4 w-4" />
                      {isSynthesizing === activeQuestion.id ? 'Aggregating...' : 'Aggregate Reasoning'}
                    </button>
                    {activeMetrics.synthesis && (
                      <button
                        onClick={() =>
                          startTransition(() => navigate(`/questions/${activeQuestion.id}/synthesis`))
                        }
                        className="flex h-12 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-bold text-slate-100 transition hover:border-primary"
                      >
                        <Eye className="h-4 w-4" />
                        View Synthesis
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-10 pb-8 md:px-20">
                <div className={`${shellWidthClass} grid min-h-0 flex-1 gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`}>
                  <aside className="rounded-3xl border border-slate-800 bg-background-dark/60 p-6 xl:p-8">
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                      Submit Your Reasoning
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      Submit a conclusion with one or more supporting premises. Verification is optional for this MVP.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      value={submissionForm.contributorName}
                      onChange={(event) =>
                        setSubmissionForm((current) => ({
                          ...current,
                          contributorName: event.target.value,
                        }))
                      }
                      placeholder="Contributor name"
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 text-sm outline-none transition focus:border-primary"
                    />
                    <input
                      value={submissionForm.walletAddress}
                      onChange={(event) =>
                        setSubmissionForm((current) => ({
                          ...current,
                          walletAddress: event.target.value,
                        }))
                      }
                      placeholder="Wallet address"
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 text-sm outline-none transition focus:border-primary"
                    />
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                            Verification Status
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {activeVerification
                              ? `Verified via ${activeVerification.mode === 'demo' ? 'demo mode' : 'World ID'}`
                              : 'Optional step for demo identity checks'}
                          </p>
                        </div>
                        {activeVerification && (
                          <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </div>
                        )}
                      </div>
                      <Suspense fallback={<VerificationFallback />}>
                        <WorldIdVerificationButton
                          questionId={activeQuestion.id}
                          contributorName={submissionForm.contributorName}
                          walletAddress={submissionForm.walletAddress}
                          disabled={
                            !submissionForm.contributorName.trim() || !submissionForm.walletAddress.trim()
                          }
                          onVerified={handleVerify}
                        />
                      </Suspense>
                    </div>

                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                        Step 1 · Your Answer
                      </label>
                      <p className="mt-2 text-sm text-slate-400">
                        What is your answer to this question?
                      </p>
                      <textarea
                        value={submissionForm.conclusion}
                        onChange={(event) =>
                          setSubmissionForm((current) => ({
                            ...current,
                            conclusion: event.target.value,
                          }))
                        }
                        placeholder="State your answer or conclusion clearly."
                        className="mt-3 min-h-28 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm outline-none transition focus:border-primary"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                        Step 2 · Why?
                      </label>
                      <p className="mt-2 text-sm text-slate-400">
                        Add one or more reasoning blocks. Claim first, then evidence.
                      </p>
                    </div>

                    {submissionForm.premises.map((premise, index) => (
                      <textarea
                        key={index}
                        value={premise}
                        onChange={(event) =>
                          setSubmissionForm((current) => ({
                            ...current,
                            premises: current.premises.map((value, premiseIndex) =>
                              premiseIndex === index ? event.target.value : value,
                            ),
                          }))
                        }
                        placeholder={[
                          'Because...',
                          'Given that...',
                          'Evidence shows...',
                          'Furthermore...',
                          'Considering...',
                        ][index]}
                        className="min-h-20 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm outline-none transition focus:border-primary"
                      />
                    ))}

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                        Step 3 · Reasoning Type
                      </label>
                      <p className="mt-2 text-sm text-slate-400">
                        Tag the type of argument you are making so synthesis can group it correctly.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {REASONING_TYPE_OPTIONS.map((option) => {
                          const selected = submissionForm.reasoningTypes.includes(option);

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setSubmissionForm((current) => ({
                                  ...current,
                                  reasoningTypes: selected
                                    ? current.reasoningTypes.filter((item) => item !== option)
                                    : [...current.reasoningTypes, option],
                                }))
                              }
                              className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-slate-700 text-slate-400 hover:border-primary/40'
                                }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                        Step 4 · What Would Change Your Mind?
                      </label>
                      <p className="mt-2 text-sm text-slate-400">
                        State the evidence or condition that would make you reconsider.
                      </p>
                      <textarea
                        value={submissionForm.changeMind}
                        onChange={(event) =>
                          setSubmissionForm((current) => ({
                            ...current,
                            changeMind: event.target.value,
                          }))
                        }
                        placeholder="What evidence would change your conclusion?"
                        className="mt-3 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm outline-none transition focus:border-primary"
                      />
                    </div>

                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                          Step 5 · Confidence
                        </label>
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          {submissionForm.confidence}/10
                        </span>
                      </div>
                      <input
                        value={submissionForm.confidence}
                        onChange={(event) =>
                          setSubmissionForm((current) => ({
                            ...current,
                            confidence: Number(event.target.value),
                          }))
                        }
                        type="range"
                        min="1"
                        max="10"
                        className="h-2 w-full cursor-pointer accent-primary"
                      />
                    </div>

                    <button
                      onClick={() => void handleSubmitReasoning()}
                      disabled={
                        !submissionForm.conclusion.trim() ||
                        submissionForm.premises.filter((premise) => premise.trim()).length === 0
                      }
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Rocket className="h-4 w-4" />
                      Submit to Noosphere
                    </button>
                    <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                      <Cloud className="mt-0.5 h-4 w-4 text-primary" />
                      Active reasoning is uploaded to{' '}
                      {storageStatus.network === 'storacha'
                        ? 'Storacha'
                        : 'a local fallback CID layer'}{' '}
                      immediately.
                      {storageStatus.network === 'storacha'
                        ? ' Each submission returns a live CID for the graph and synthesis pipeline.'
                        : ' Add a Storacha delegation to move hot storage off the browser.'}
                    </div>
                  </div>
                </aside>
                  <aside className="rounded-3xl border border-slate-800 bg-background-dark/60 p-6 xl:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                        Selected Reasoning
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Inspect the full chain, score, and provenance for the highlighted node.
                      </p>
                    </div>
                  </div>

                  {activeSubmission ? (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-slate-100">
                              {activeSubmission.contributorName}
                            </p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {activeSubmission.walletAddress.slice(0, 12)}...
                            </p>
                          </div>
                          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {Math.round(activeSubmission.qualityScore * 100)}% quality score
                          </div>
                        </div>
                        {activeSubmission.reasoningTypes.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {activeSubmission.reasoningTypes.map((type) => (
                              <span
                                key={type}
                                className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="border-l-2 border-primary pl-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                              Conclusion
                            </p>
                            <p className="text-sm font-medium leading-relaxed text-slate-100">
                              {activeSubmission.conclusion}
                            </p>
                          </div>
                          {activeSubmission.premises.map((premise, index) => (
                            <div key={index} className="border-l-2 border-slate-800 pl-4">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                                Premise {index + 1}
                              </p>
                              <p className="text-sm leading-relaxed text-slate-300">{premise}</p>
                            </div>
                          ))}
                          {activeSubmission.changeMind && (
                            <div className="border-l-2 border-amber-400 pl-4">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                                Would Change Mind If
                              </p>
                              <p className="text-sm leading-relaxed text-slate-300">
                                {activeSubmission.changeMind}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            Confidence
                          </p>
                          <p className="mt-2 text-2xl font-bold">{activeSubmission.confidence}/10</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            Cluster
                          </p>
                          <p className="mt-2 text-sm font-bold text-slate-100">
                            {activeSubmission.clusterId.replace('cluster-', '')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                          Provenance
                        </p>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <Cloud className="mt-0.5 h-4 w-4 text-primary" />
                            <div>
                              <p className="font-bold text-slate-100">Reasoning object CID</p>
                              <p className="break-all font-mono text-xs text-slate-500">
                                {activeSubmission.storageCid}
                              </p>
                              {activeSubmission.storageGatewayUrl && (
                                <a
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                                  href={activeSubmission.storageGatewayUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Open object
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Database className="mt-0.5 h-4 w-4 text-primary" />
                            <div>
                              <p className="font-bold text-slate-100">Hot storage layer</p>
                              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                                {activeSubmission.storageNetwork === 'storacha'
                                  ? 'Storacha'
                                  : 'Local fallback'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                            <div>
                              <p className="font-bold text-slate-100">Verification mode</p>
                              <p className="text-xs text-slate-500">
                                {
                                  state.verifications.find(
                                    (verification) =>
                                      verification.nullifierHash ===
                                      activeSubmission.verificationNullifierHash,
                                  )?.mode
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {activeMetrics.synthesis && (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                            Latest Synthesis
                          </p>
                          <p className="text-sm leading-relaxed text-slate-300">
                            {activeMetrics.synthesis.qualityWeightedSummary}
                          </p>
                          <button
                            onClick={() =>
                              startTransition(() => navigate(`/questions/${activeQuestion.id}/synthesis`))
                            }
                            className="mt-4 flex items-center gap-2 text-sm font-bold text-primary"
                          >
                            Open full synthesis
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-relaxed text-slate-400">
                      No reasoning node selected yet.
                    </div>
                  )}
                  </aside>
                </div>

                <section className={`${shellWidthClass} relative mt-6 h-[560px] overflow-hidden rounded-3xl border border-slate-800 bg-background-dark px-4 py-4 md:h-[640px] md:px-6 md:py-6`}>
                  <Suspense fallback={<GraphFallback />}>
                    <ReasoningGraph
                      submissions={activeMetrics.submissions}
                      selectedSubmissionId={activeSubmission?.id ?? null}
                      onSelectSubmission={setSelectedSubmissionId}
                    />
                  </Suspense>
                  <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-6 rounded-full border border-slate-800 bg-slate-950/85 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 shadow-xl xl:flex">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-primary" />
                      Consensus cluster
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-teal-400" />
                      Adjacent reasoning
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      Dissent cluster
                    </span>
                  </div>
                </section>

                <section className={`${shellWidthClass} mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]`}>
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 xl:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                          Reasoning Submissions
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          Every conclusion and premise submitted for this question.
                          <span className="mt-2 block text-xs text-slate-500">
                            Predicted quality scores weight the synthesis ranking and scale node size in the graph.
                          </span>
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                        {activeMetrics.submissions.length} submissions
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeMetrics.submissions.map((submission) => (
                        <button
                          key={submission.id}
                          type="button"
                          onClick={() => setSelectedSubmissionId(submission.id)}
                          className={`w-full rounded-2xl border p-5 text-left transition ${
                            submission.id === activeSubmission?.id
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-800 bg-slate-900/60 hover:border-primary/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-100">
                                {submission.contributorName}
                              </p>
                              <p className="mt-1 text-lg font-semibold leading-snug text-slate-100">
                                {submission.conclusion}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                Confidence {submission.confidence}/10
                              </div>
                              <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                                Quality {Math.round(submission.qualityScore * 100)}%
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            {submission.premises.map((premise, index) => (
                              <p key={`${submission.id}-${index}`} className="text-sm leading-relaxed text-slate-300">
                                <span className="mr-2 text-slate-500">{index + 1}.</span>
                                {premise}
                              </p>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 xl:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                          AI Aggregation
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          Aggregate the submissions into a single synthesis of consensus and disagreement.
                        </p>
                      </div>
                      <button
                        onClick={() => void handleRunSynthesis()}
                        disabled={activeMetrics.submissions.length < 2 || isSynthesizing === activeQuestion.id}
                        className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Rocket className="h-4 w-4" />
                        {isSynthesizing === activeQuestion.id ? 'Aggregating...' : 'Aggregate'}
                      </button>
                    </div>

                    {activeMetrics.synthesis ? (
                      <div className="space-y-5">
                        <div
                          className={`rounded-2xl border p-4 ${
                            activeMetrics.synthesis.provider === 'gemini'
                              ? 'border-teal-500/30 bg-teal-500/10'
                              : 'border-amber-500/30 bg-amber-500/10'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-200">
                              Aggregation Source
                            </p>
                            <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-200">
                              {activeMetrics.synthesis.provider === 'gemini'
                                ? 'Gemini'
                                : 'Local fallback'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-300">
                            {activeMetrics.synthesis.providerDetail}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                            Dominant Conclusion
                          </p>
                          <p className="mt-3 text-lg font-semibold leading-relaxed text-slate-100">
                            {activeMetrics.synthesis.dominantConclusion}
                          </p>
                        </div>

                        {[
                          ['Consensus', activeMetrics.synthesis.consensusPoints],
                          ['Disagreements', activeMetrics.synthesis.dissensusPoints],
                          ['Minority Views', activeMetrics.synthesis.minorityViews],
                        ].map(([label, items]) => (
                          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                              {label}
                            </p>
                            <div className="mt-3 space-y-2">
                              {(items as string[]).length > 0 ? (
                                (items as string[]).map((item) => (
                                  <p key={item} className="text-sm leading-relaxed text-slate-300">
                                    {item}
                                  </p>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No items yet.</p>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                            Summary
                          </p>
                          <p className="mt-3 text-sm leading-relaxed text-slate-300">
                            {activeMetrics.synthesis.qualityWeightedSummary}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm leading-relaxed text-slate-400">
                        No aggregation yet. Add at least two reasoning submissions, then click Aggregate.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {screen === 'synthesis' && activeQuestion && activeMetrics?.synthesis && (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${shellWidthClass} px-6 py-10 md:px-12`}
            >
              <div className="mb-10 flex flex-col gap-4 border-b border-slate-800 pb-8 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-teal-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-[0.3em]">
                      Synthesis Complete
                    </span>
                  </div>
                  <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                    {activeQuestion.text}
                  </h1>
                  {/* <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                    {activeMetrics.synthesis.qualityWeightedSummary}
                  </p> */}
                  <div
                    className={`inline-flex max-w-3xl rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                      activeMetrics.synthesis.provider === 'gemini'
                        ? 'border-teal-500/30 bg-teal-500/10 text-teal-100'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    }`}
                  >
                    {activeMetrics.synthesis.providerDetail}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      startTransition(() => navigate(`/questions/${activeQuestion.id}`))
                    }
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-800 px-4 text-sm font-bold text-slate-300 transition hover:border-primary hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to graph
                  </button>
                  <button
                    onClick={() => handleDownloadSynthesis(activeMetrics.synthesis!, activeQuestion)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
                  >
                    <Download className="h-4 w-4" />
                    Download Report
                  </button>
                </div>
              </div>

              <section className="mb-8 grid gap-4 md:grid-cols-4">
                {[
                  ['Verified humans', `${activeMetrics.synthesis.verifiedHumanCount}`],
                  ['Reasoning chains', `${activeMetrics.synthesis.contributorCount}`],
                  ['Consensus clusters', `${activeMetrics.synthesis.clusterBreakdown.length}`],
                  ['Archive CID', activeMetrics.synthesis.archiveCid.slice(0, 12) + '...'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</p>
                    <p className="mt-2 text-xl font-bold text-slate-100">{value}</p>
                  </div>
                ))}
              </section>

              <section className="mb-10 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80">
                <div className="grid gap-0 md:grid-cols-[0.36fr_0.64fr]">
                  <div className="border-b border-slate-800 bg-slate-900/80 p-8 md:border-b-0 md:border-r">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                      Dominant Conclusion
                    </p>
                    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
                      <p className="text-3xl font-bold leading-tight text-slate-100">
                        {activeMetrics.synthesis.dominantConclusion}
                      </p>
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                      Quality-weighted summary
                    </p>
                    <p className="text-lg leading-relaxed text-slate-300">
                      {activeMetrics.synthesis.qualityWeightedSummary}
                    </p>
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {activeMetrics.synthesis.clusterBreakdown.map((cluster) => (
                        <div key={cluster.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="font-bold text-slate-100">{cluster.label}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${cluster.stance === 'consensus'
                                ? 'bg-teal-500/10 text-teal-400'
                                : 'bg-amber-500/10 text-amber-400'
                                }`}
                            >
                              {cluster.stance}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            Weighted influence: {cluster.weight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-8 lg:grid-cols-[0.55fr_0.45fr]">
                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                      Points of Consensus
                    </p>
                    <div className="mt-4 space-y-3">
                      {activeMetrics.synthesis.consensusPoints.map((point) => (
                        <div
                          key={point}
                          className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-400" />
                          <p className="text-sm leading-relaxed text-slate-300">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
                      Dissent and Minority Views
                    </p>
                    <div className="mt-4 space-y-3">
                      {activeMetrics.synthesis.dissensusPoints.map((point) => (
                        <div
                          key={point}
                          className="flex items-start gap-4 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-5"
                        >
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
                          <p className="text-sm leading-relaxed text-slate-300">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                      Provenance and Archive
                    </p>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-start gap-3">
                        <Database className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold text-slate-100">Session archive CID</p>
                          <p className="break-all font-mono text-xs text-slate-500">
                            {activeMetrics.synthesis.archiveCid}
                          </p>
                          {activeMetrics.synthesis.archiveGatewayUrl && (
                            <a
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                              href={activeMetrics.synthesis.archiveGatewayUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open archive
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Cloud className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold text-slate-100">Storage network</p>
                          <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                            {activeMetrics.synthesis.storageNetwork === 'storacha'
                              ? 'Storacha archive'
                              : 'Local fallback'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <ExternalLink className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold text-slate-100">Retrievability note</p>
                          <p className="text-xs leading-relaxed text-slate-500">
                            {activeMetrics.synthesis.storageNetwork === 'storacha'
                              ? 'Active submissions were uploaded as hot objects and the closed-session archive was published as a content-addressed JSON artifact.'
                              : 'This session used the browser fallback path. Configure Storacha to turn active submissions into remotely retrievable objects.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                      Session metrics
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Average quality score', `${Math.round(activeMetrics.avgQuality * 100)}%`],
                        ['Submission count', `${activeMetrics.submissions.length}`],
                        ['Verified humans', `${activeMetrics.verifiedHumans}`],
                        ['Generated', new Date(activeMetrics.synthesis.generatedAt).toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            {label}
                          </p>
                          <p className="mt-2 text-sm font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                      Active reasoning graph
                    </p>
                    <div className="h-[320px] overflow-hidden rounded-2xl border border-slate-800 bg-background-dark/70">
                      <Suspense fallback={<GraphFallback compact />}>
                        <ReasoningGraph
                          submissions={activeMetrics.submissions}
                          selectedSubmissionId={activeSubmission?.id ?? null}
                          onSelectSubmission={setSelectedSubmissionId}
                        />
                      </Suspense>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-slate-800 bg-background-dark px-6 py-12">
        <div className={`${shellWidthClass} flex flex-col items-center justify-between gap-8 md:flex-row`}>
          <div className="flex items-center gap-3 text-primary opacity-70 grayscale transition-all hover:grayscale-0">
            <Box className="h-8 w-8" />
            <h2 className="text-lg font-bold text-slate-100">Noosphere</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500">
            <a className="hover:text-primary" href="#">Docs</a>
            <a className="hover:text-primary" href="#">Github</a>
            <a className="hover:text-primary" href="#">Twitter</a>
            <a className="hover:text-primary" href="#">Discord</a>
          </div>
          <p className="text-xs text-slate-600">
            © 2026 Noosphere Collective Intelligence. Built for the future of thought.
          </p>
        </div>
      </footer>
    </div>
  );
}

function VerificationFallback() {
  return <div className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70" />;
}

function GraphFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/40 ${compact ? 'min-h-[240px]' : 'min-h-[420px]'
        }`}
    >
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Loading graph</p>
        <p className="mt-2 text-sm text-slate-500">Preparing the reasoning network...</p>
      </div>
    </div>
  );
}
