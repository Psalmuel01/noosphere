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
    <div className="relative mx-auto w-full max-w-[1400px] px-6 py-16 md:px-12">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">

        {/* Left — supporting context, visually subordinate */}
        <aside className="space-y-6 pt-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              <PlusCircle className="h-3 w-3" />
              New Session
            </div>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-slate-100">
              Open a question worth thinking through
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              Strong sessions begin with a sharp prompt. Frame it well and reasoning quality will noticeably improve.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              ['Ask one thing', 'Keep the question focused so contributors can take a real position.'],
              ['Set the frame', 'Request tradeoffs, evidence, and reasoning style in the description.'],
              ['Go live fast', 'Sessions are ready for responses immediately after creation.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <div>
                  <p className="text-sm font-medium text-slate-300">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Example prompt
            </p>
            <p className="text-sm font-medium text-primary/80">
              Should frontier AI safety standards be coordinated globally?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Ask contributors to reason about international coordination, enforcement problems,
              and the tradeoff between speed and safety.
            </p>
          </div>
        </aside>

        {/* Right — the form, visually dominant */}
        <main className="relative rounded-[28px] border border-slate-800 bg-slate-950/80 p-7 shadow-[0_40px_120px_rgba(2,6,23,0.38)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-6 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Launch a Deliberation
            </p>
            <h2 className="text-3xl font-semibold text-slate-100">Create a reasoning session</h2>
            <p className="text-md text-slate-400">
              Keep the prompt tight, the context useful, and the deadline realistic.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                Question
              </label>
              <input
                value={value.text}
                onChange={(e) => onChange('text', e.target.value)}
                placeholder="What question should people reason about?"
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/75 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                Context
              </label>
              <textarea
                value={value.description}
                onChange={(e) => onChange('description', e.target.value)}
                placeholder="Give context. What tradeoffs, evidence, or kinds of reasoning do you want contributors to focus on?"
                className="min-h-32 w-full rounded-xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Creator
                </label>
                <input
                  value={value.creatorName}
                  onChange={(e) => onChange('creatorName', e.target.value)}
                  placeholder="Your name (optional)"
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/75 px-4 text-md text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={value.deadline}
                  onChange={(e) => onChange('deadline', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/75 px-4 text-md text-slate-100 outline-none transition focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                Tags
              </label>
              <input
                value={value.tags}
                onChange={(e) => onChange('tags', e.target.value)}
                placeholder="Tags, comma separated (optional)"
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/75 px-4 text-md text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-primary"
              />
            </div>

            <button
              onClick={onSubmit}
              disabled={isCreating || !canSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-md font-bold text-white shadow-[0_18px_48px_rgba(100,103,242,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isCreating ? 'Opening Session...' : 'Open Session'}
            </button>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                What happens next
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                After creation, contributors can verify, submit structured reasoning, and watch the
                graph start to form immediately.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}