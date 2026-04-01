import { useEffect, useRef, useState } from 'react';
import { IDKit, IDKitResult, RpContext } from '@worldcoin/idkit-core';
import QRCode from 'qrcode';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { VerificationMode } from '../types';

const worldAppId = import.meta.env.VITE_WORLD_ID_APP_ID as `app_${string}` | undefined;
const worldAction = import.meta.env.VITE_WORLD_ID_ACTION as string | undefined;
const worldEnvironment =
  (import.meta.env.VITE_WORLD_ID_ENVIRONMENT as 'production' | 'staging' | undefined) ??
  'production';

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
  const [connectorUri, setConnectorUri] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Preparing World ID request...');
  const abortRef = useRef<AbortController | null>(null);
  const worldEnabled = Boolean(worldAppId && worldAction);
  const signal = `${questionId}:${walletAddress || contributorName}`;

  useEffect(() => {
    if (!connectorUri) {
      setQrCodeUrl(null);
      return;
    }

    let cancelled = false;

    void QRCode.toDataURL(connectorUri, {
      margin: 1,
      width: 280,
      color: {
        dark: '#f8fafc',
        light: '#0f172a',
      },
    }).then((url) => {
      if (!cancelled) {
        setQrCodeUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [connectorUri]);

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

  async function verifyWithBackend(result: IDKitResult) {
    const response = await fetch('/api/world/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idkitResponse: result,
        signal,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(payload || 'World ID proof verification failed.');
    }
  }

  async function startWorldVerification() {
    setIsWorking(true);
    setRpContextError(null);
    setStatusMessage('Preparing World ID request...');

    try {
      const context = await ensureRpContext();
      const request = await IDKit.request({
        app_id: worldAppId!,
        action: worldAction!,
        rp_context: context,
        allow_legacy_proofs: false,
        environment: worldEnvironment,
      }).constraints({
        enumerate: [
          {
            type: 'orb',
            signal,
          },
        ],
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setConnectorUri(request.connectorURI);
      setOpen(true);
      setStatusMessage('Scan the QR code with World App and complete verification.');

      const completion = await request.pollUntilCompletion({
        signal: controller.signal,
        pollInterval: 1000,
        timeout: 1000 * 60 * 5,
      });

      if (!completion.success) {
        throw new Error(`World ID error: ${'error' in completion ? completion.error : 'generic_error'}`);
      }

      setStatusMessage('Verifying proof with Noosphere...');
      await verifyWithBackend(completion.result);
      await onVerified('world-id', JSON.stringify(completion.result));

      setOpen(false);
      setConnectorUri(null);
      setStatusMessage('Verification complete.');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatusMessage('Verification cancelled.');
        return;
      }

      setRpContextError(error instanceof Error ? error.message : 'World ID verification failed.');
    } finally {
      abortRef.current = null;
      setIsWorking(false);
    }
  }

  function closeModal() {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setConnectorUri(null);
    setQrCodeUrl(null);
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
          World ID keys are missing, so demo verification is active.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        disabled={disabled || isWorking}
        onClick={() => void startWorldVerification()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {isWorking ? 'Preparing...' : 'Verify with World ID'}
      </button>
      {rpContextError && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-400">{rpContextError}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-background-dark p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                  World ID Verification
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-100">
                  Connect your World ID
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:border-primary hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-slate-400">{statusMessage}</p>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="World ID QR code"
                    className="h-[280px] w-[280px] rounded-xl"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Generating QR code...</p>
                )}
              </div>
            </div>

            {connectorUri && (
              <a
                href={connectorUri}
                className="mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-slate-700 text-sm font-bold text-slate-200 transition hover:border-primary hover:text-primary"
              >
                Open in World App
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
