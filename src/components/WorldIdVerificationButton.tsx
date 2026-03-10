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

function readRpContext() {
  const raw = import.meta.env.VITE_WORLD_ID_RP_CONTEXT_JSON;
  if (!raw) {
    return {
      context: null,
      reason: 'Missing VITE_WORLD_ID_RP_CONTEXT_JSON.',
    };
  }

  try {
    const context = JSON.parse(raw) as RpContext;

    if (context.expires_at * 1000 < Date.now()) {
      return {
        context: null,
        reason: `World ID rp_context expired at ${new Date(context.expires_at * 1000).toISOString()}.`,
      };
    }

    return {
      context,
      reason: null,
    };
  } catch {
    return {
      context: null,
      reason: 'VITE_WORLD_ID_RP_CONTEXT_JSON is not valid JSON.',
    };
  }
}

const { context: rpContext, reason: rpContextError } = readRpContext();

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
  const worldEnabled = Boolean(worldAppId && worldAction && rpContext);

  async function runDemoVerification() {
    setIsWorking(true);

    try {
      await onVerified('demo', null);
    } finally {
      setIsWorking(false);
    }
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
            'World ID is wired for client integration, but the official flow still requires a signed RP context. Add VITE_WORLD_ID_APP_ID, VITE_WORLD_ID_ACTION, and VITE_WORLD_ID_RP_CONTEXT_JSON to enable the live widget.'}{' '}
          Demo verification keeps the app functional locally.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        Verify with World ID
      </button>
      <IDKitRequestWidget
        open={open}
        onOpenChange={setOpen}
        app_id={worldAppId!}
        action={worldAction!}
        rp_context={rpContext!}
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
