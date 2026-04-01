import { useEffect, useRef, useState } from 'react';
import { IDKit, IDKitErrorCode, IDKitResult, RpContext } from '@worldcoin/idkit-core';
import QRCode from 'qrcode';
import { AlertTriangle, ShieldCheck, Sparkles, X } from 'lucide-react';
import { VerificationMode } from '../types';

const worldAppId = import.meta.env.VITE_WORLD_ID_APP_ID as `app_${string}` | undefined;
const worldAction = import.meta.env.VITE_WORLD_ID_ACTION as string | undefined;
const worldEnvironment =
  (import.meta.env.VITE_WORLD_ID_ENVIRONMENT as 'production' | 'staging' | undefined) ??
  'production';

const demoFallbackEligibleErrors = new Set<IDKitErrorCode>([
  'credential_unavailable',
  'verification_rejected',
  'generic_error',
  'max_verifications_reached',
  'connection_failed',
]);

function isExpired(context: RpContext | null, skewSeconds = 30) {
  if (!context) {
    return true;
  }

  return context.expires_at * 1000 < Date.now() + skewSeconds * 1000;
}

function extractWorldErrorCode(error: unknown): IDKitErrorCode | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(
    /(user_rejected|verification_rejected|credential_unavailable|malformed_request|invalid_network|inclusion_proof_pending|inclusion_proof_failed|unexpected_response|connection_failed|max_verifications_reached|failed_by_host_app|generic_error)/,
  );

  return (match?.[1] as IDKitErrorCode | undefined) ?? null;
}

function describeWorldError(code: IDKitErrorCode | null, fallbackEnabled = false) {
  const suffix = fallbackEnabled
    ? ' Demo verification can still unlock the rest of the experience.'
    : '';

  switch (code) {
    case 'credential_unavailable':
      return `World ID is not available for this account, region, or verification method yet.${suffix}`;
    case 'verification_rejected':
      return `World ID rejected this live verification attempt.${suffix}`;
    case 'max_verifications_reached':
      return `This World ID credential has already reached the verification limit for this action.${suffix}`;
    case 'connection_failed':
      return `Noosphere could not complete the live handshake with World App.${suffix}`;
    case 'generic_error':
      return `World App could not complete the live proof flow on this device.${suffix}`;
    case 'user_rejected':
      return 'Verification was cancelled in World App.';
    default:
      return fallbackEnabled
        ? `World ID verification failed. Demo verification can still unlock the rest of the experience.`
        : 'World ID verification failed.';
  }
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
  const worldEnabled = Boolean(worldAppId && worldAction);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [rpContextError, setRpContextError] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [showDemoOption, setShowDemoOption] = useState(!worldEnabled);
  const [connectorUri, setConnectorUri] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Preparing World ID request...');
  const abortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (!fallbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFallbackMessage(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fallbackMessage]);

  async function runDemoVerification(message?: string | null) {
    setIsWorking(true);
    setRpContextError(null);
    setFallbackMessage(message ?? null);
    setShowDemoOption(true);
    setStatusMessage('Completing demo verification...');
    closeModal();

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
    setFallbackMessage(null);
    setShowDemoOption(false);
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
        setShowDemoOption(true);
        setRpContextError('World ID verification was cancelled. You can continue with Noosphere demo verification.');
        return;
      }

      const errorCode = extractWorldErrorCode(error);
      const fallbackAllowed = errorCode ? demoFallbackEligibleErrors.has(errorCode) : false;
      const message =
        error instanceof Error
          ? describeWorldError(errorCode, fallbackAllowed)
          : describeWorldError(null, false);

      if (fallbackAllowed) {
        try {
          await runDemoVerification(message);
          setFallbackMessage(message);
          return;
        } catch (fallbackError) {
          setRpContextError(
            fallbackError instanceof Error
              ? fallbackError.message
              : 'World ID verification failed.',
          );
          return;
        }
      }

      setRpContextError(message);
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
      <div className="space-y-3">
        <button
          disabled={disabled || isWorking}
          onClick={() => void startWorldVerification()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {isWorking ? 'Preparing...' : 'Verify with World ID'}
        </button>
        <button
          type="button"
          disabled={disabled || isWorking}
          onClick={() => void runDemoVerification('Noosphere demo verification was used instead of live World ID.')}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            showDemoOption
              ? 'border-slate-600 bg-slate-900/80 text-slate-100 hover:border-primary hover:text-primary'
              : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Continue with Noosphere Demo
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Live verification runs through World ID when the credential is available. If World App
        cannot complete it for this account or region, Noosphere will fall back to demo.
      </p>
      {rpContextError && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-400">{rpContextError}</p>
      )}
      {fallbackMessage && (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3 text-left">
          <div className="flex items-start gap-2 text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-">
              <p className="text-xs font-semibold leading-relaxed">{fallbackMessage}</p>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                We automatically switched to demo verification so you can continue testing the
                reasoning flow without losing progress.
              </p>
            </div>
          </div>
        </div>
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
