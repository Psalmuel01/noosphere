import { useState } from 'react';
import {
  IDKitRequestWidget,
  IDKitResult,
  RpContext,
  orbLegacy,
} from '@worldcoin/idkit';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { VerificationMode } from '../types';

const worldAppId = import.meta.env.VITE_WORLD_ID_APP_ID as `app_${string}` | undefined;
const worldAction = import.meta.env.VITE_WORLD_ID_ACTION as string | undefined;

function isExpired(context: RpContext | null, skewSeconds = 30) {
  if (!context) {
    return true;
  }

  return context.expires_at * 1000 < Date.now() + skewSeconds * 1000;
}

export function WorldIdVerificationButton({
  questionId,
  contributorName,
  walletAddress,
  disabled,
  onVerified,
}: {
  questionId: string;
  contributorName: string;
  walletAddress: string;
  disabled?: boolean;
  onVerified: (mode: VerificationMode, proof?: string | null) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [rpContextError, setRpContextError] = useState<string | null>(null);
  const worldEnabled = Boolean(worldAppId && worldAction);

  async function runDemoVerification() {
    setIsWorking(true);

    try {
      await onVerified('demo', null);
    } finally {
      setIsWorking(false);
    }
  }

  async function ensureRpContext() {
    if (!isExpired(rpContext)) {
      return rpContext;
    }

    const response = await fetch('/api/world/rp-context', { method: 'POST' });
    if (!response.ok) {
      const payload = await response.text();
      throw new Error(payload || 'Failed to fetch RP context.');
    }
    const context = (await response.json()) as RpContext;
    setRpContext(context);
    setRpContextError(null);
    return context;
  }

  async function handleWorldSuccess(result: IDKitResult) {
    await onVerified('world-id', JSON.stringify(result));
  }

  if (!worldEnabled) {
    return (
      <div className="space-y-3">
        <button
          disabled={disabled || isWorking}
          onClick={() => void runDemoVerification()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" />
          {isWorking ? 'Verifying...' : 'Verify Human (Demo)'}
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          {rpContextError ??
            'World ID is wired for client integration, but it needs VITE_WORLD_ID_APP_ID and VITE_WORLD_ID_ACTION set. Demo verification keeps the app functional locally.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        disabled={disabled}
        onClick={async () => {
          setIsWorking(true);
          try {
            await ensureRpContext();
            setOpen(true);
          } catch (error) {
            setRpContextError(error instanceof Error ? error.message : 'Failed to refresh rp_context.');
          } finally {
            setIsWorking(false);
          }
        }}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {isWorking ? 'Preparing...' : 'Verify with World ID'}
      </button>
      {rpContextError && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-400">
          {rpContextError}
        </p>
      )}
      <IDKitRequestWidget
        open={open}
        onOpenChange={setOpen}
        app_id={worldAppId!}
        action={worldAction!}
        rp_context={rpContext ?? undefined}
        allow_legacy_proofs={false}
        preset={orbLegacy({ signal: `${questionId}:${walletAddress || contributorName}` })}
        onSuccess={(result) => void handleWorldSuccess(result)}
        onError={(errorCode) => {
          console.error('World ID verification failed', errorCode);
        }}
      />
    </>
  );
}
