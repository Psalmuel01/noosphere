import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  Network,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const sectionClass =
  'rounded-[30px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] p-8 shadow-[0_25px_70px_rgba(2,6,23,0.2)]';

export function DocsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative mx-auto w-full max-w-[1500px] overflow-hidden px-6 py-14 md:px-12">
      <div className="pointer-events-none absolute left-0 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-44 h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />

      <div className="relative mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Noosphere Guide
          </div>
          <h1 className="max-w-5xl text-4xl font-bold tracking-tight text-slate-50 md:text-5xl">
            Understand how Noosphere works before you use it
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-slate-400">
            Noosphere helps groups reason together. People contribute structured arguments, the
            system ranks the strongest reasoning, and AI turns the whole session into a readable
            synthesis of consensus, disagreement, and next steps.
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-800 px-4 text-sm font-bold text-slate-300 transition hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  How It Works
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-100">The basic flow</h2>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                Start Here
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Create a question',
                  body: 'Start a session with a clear prompt so everyone is reasoning about the same thing.',
                },
                {
                  title: 'Collect structured reasoning',
                  body: 'Participants add a conclusion, supporting premises, and a confidence level.',
                },
                {
                  title: 'Generate synthesis',
                  body: 'Noosphere ranks the reasoning, builds the graph, and produces a shared summary.',
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-slate-800 bg-slate-950/45 p-5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
                    Step 0{index + 1}
                  </p>
                  <p className="mt-3 text-sm font-bold text-slate-100">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={sectionClass}>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              What You See
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: Brain,
                  title: 'Reasoning graph',
                  body: 'Every submission becomes a node. Stronger reasoning appears larger and stands out more clearly.',
                },
                {
                  icon: Sparkles,
                  title: 'AI synthesis',
                  body: 'When enough responses exist, Noosphere summarizes major agreement, disagreement, and the dominant conclusion.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Verification options',
                  body: 'People can verify through World ID when available or continue in demo mode during testing.',
                },
                {
                  icon: Database,
                  title: 'Stored reasoning',
                  body: 'Submissions are stored as content-addressed records so the session has a durable reference.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-slate-800 bg-slate-950/45 p-5"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-bold text-slate-100">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="quality-score" className={sectionClass}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Quality Score
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-100">
                  How the quality score is determined
                </h2>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                Most Important
              </span>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
              The quality score estimates how strong and useful a submission is. It does not reward
              sounding complicated. It rewards clarity, structure, and complete reasoning.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                'A clear conclusion helps because the system can identify your position quickly.',
                'Multiple strong premises help because they show a real chain of reasoning rather than a one-line opinion.',
                'Longer, more specific premises usually score better than vague or generic ones.',
                'A thoughtful confidence score helps because it signals how strongly you hold the conclusion.',
                'Explaining what would change your mind helps because it shows nuance and intellectual honesty.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-slate-800 bg-slate-950/45 p-5 text-sm leading-relaxed text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[26px] border border-primary/20 bg-primary/6 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                How to get a higher score
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  'Write one clear conclusion sentence before anything else.',
                  'Add 2 to 4 strong premises instead of relying on a single point.',
                  'Use concrete evidence, examples, or logical steps inside each premise.',
                  'Set confidence honestly. High confidence with weak reasoning does not improve quality.',
                  'Fill in what would change your mind whenever possible.',
                  'Avoid short filler premises like “because it feels right.”',
                ].map((tip) => (
                  <div
                    key={tip}
                    className="rounded-[22px] border border-primary/10 bg-slate-950/45 p-4 text-sm leading-relaxed text-slate-200"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Why It Matters
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                'It surfaces the strongest arguments instead of the loudest voices.',
                'It makes disagreement easier to inspect instead of flattening everything into a vote.',
                'It turns a discussion into a reusable knowledge artifact.',
                'It gives teams, communities, and researchers a stronger basis for decisions.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-slate-800 bg-slate-950/45 p-5 text-sm leading-relaxed text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-[28px] border border-primary/20 bg-primary/6 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Quick Start
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p>Create a question.</p>
              <p>Invite people to add their reasoning.</p>
              <p>Review the graph and strongest submissions.</p>
              <p>Run aggregation and download the report.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Key Ideas
            </p>
            <div className="mt-5 space-y-3">
              {[
                ['Structured reasoning', 'People contribute conclusions plus supporting premises.'],
                ['Quality weighting', 'Stronger reasoning has more influence on the final synthesis.'],
                ['Collective intelligence', 'The goal is a better shared understanding, not just a vote.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[22px] border border-slate-800 bg-slate-950/45 p-4">
                  <p className="text-sm font-bold text-slate-100">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">FAQ</p>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-100">Do I need World ID?</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  No. It improves trust, but Noosphere can still run in demo mode for testing and
                  workshops.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">Why are some scores low?</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Usually because the submission is too short, too vague, missing supporting
                  premises, or lacks a thoughtful change-your-mind condition.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">How is reasoning stored?</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Noosphere stores submissions as content-addressed records so the session has a
                  durable reference beyond the interface.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Jump Back In
            </p>
            <div className="mt-4 space-y-3">
              <Link
                to="/questions"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                Browse Questions
              </Link>
              <Link
                to="/ask"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-800 px-4 text-sm font-bold text-slate-200 transition hover:border-primary hover:text-primary"
              >
                Create a Session
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
