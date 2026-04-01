import { ArrowLeft, LoaderCircle, PlusCircle, Rocket } from 'lucide-react';

export interface CreateQuestionFormState {
  text: string;
  description: string;
  creatorName: string;
  deadline: string;
  tags: string;
}

export function CreateQuestionPage({
  value,
  isCreating,
  onChange,
  onSubmit,
  onBack,
}: {
  value: CreateQuestionFormState;
  isCreating: boolean;
  onChange: (field: keyof CreateQuestionFormState, nextValue: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const canSubmit = value.text.trim() && value.description.trim();

  return (
    <div className="relative mx-auto w-full max-w-[1380px] overflow-hidden px-6 py-16 md:px-12">
      <div className="pointer-events-none absolute left-0 top-10 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-36 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(470px,0.85fr)]">
        <section className="space-y-8">
          <button
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-800 px-4 text-sm font-bold text-slate-300 transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to questions
          </button>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              <PlusCircle className="h-3.5 w-3.5" />
              New Session
            </div>
            <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-slate-50 md:text-6xl">
              Open a question worth thinking through
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-slate-400">
              Strong Noosphere sessions begin with a sharp prompt. Frame the question well, give
              people the right context, and the reasoning quality will be noticeably better.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Ask one thing', 'Keep the question focused enough that people can take a real position.'],
              ['Set the frame', 'Use the description to request tradeoffs, evidence, and reasoning style.'],
              ['Go live fast', 'Once created, the session is immediately ready for responses and aggregation.'],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.76))] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.2)]"
              >
                <p className="text-sm font-bold text-slate-100">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[30px] border border-slate-800 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.78))] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Example Prompt
                </p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                  The best prompts create room for real disagreement without becoming vague.
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                Strong Setup
              </span>
            </div>
            <div className="mt-5 rounded-[24px] border border-primary/15 bg-slate-950/55 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Should frontier AI safety standards be coordinated globally?
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Ask contributors to reason about international coordination, enforcement problems,
                and the tradeoff between speed and safety. That framing encourages thoughtful,
                structured disagreement instead of shallow reactions.
              </p>
            </div>
          </div>
        </section>

        <section className="relative rounded-[34px] border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.94),rgba(15,23,42,0.84))] p-7 shadow-[0_40px_120px_rgba(2,6,23,0.38)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Launch a Deliberation
            </p>
            <h2 className="text-3xl font-bold text-slate-100">Create a reasoning session</h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Keep the prompt tight, the context useful, and the deadline realistic.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Question
              </label>
              <input
                value={value.text}
                onChange={(event) => onChange('text', event.target.value)}
                placeholder="What question should people reason about?"
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/75 px-4 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Context
              </label>
              <textarea
                value={value.description}
                onChange={(event) => onChange('description', event.target.value)}
                placeholder="Give context. What tradeoffs, evidence, or kinds of reasoning do you want contributors to focus on?"
                className="min-h-36 w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Creator
                </label>
                <input
                  value={value.creatorName}
                  onChange={(event) => onChange('creatorName', event.target.value)}
                  placeholder="Your name (optional)"
                  className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/75 px-4 text-sm outline-none transition focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={value.deadline}
                  onChange={(event) => onChange('deadline', event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/75 px-4 text-sm outline-none transition focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Tags
              </label>
              <input
                value={value.tags}
                onChange={(event) => onChange('tags', event.target.value)}
                placeholder="Tags, comma separated (optional)"
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/75 px-4 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <button
              onClick={onSubmit}
              disabled={isCreating || !canSubmit}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-bold text-white shadow-[0_18px_48px_rgba(100,103,242,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isCreating ? 'Opening Session...' : 'Open Session'}
            </button>

            <div className="rounded-[24px] border border-slate-800 bg-slate-900/55 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                What happens next
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                After creation, contributors can verify, submit structured reasoning, and watch the
                graph start to form immediately.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
