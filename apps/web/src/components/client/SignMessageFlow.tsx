"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, Hash, Info, Lock, LoaderCircle, MessageSquareText, ShieldAlert, Snowflake, TriangleAlert, Undo2, Wallet } from "lucide-react";
import { toHex } from "@satchel/core/bytes";
import { evmMessageSignRequest, solMessageSignRequest } from "@satchel/core/near";
import { classifyEvmMessage, classifySolMessage } from "@satchel/core/policy";
import { ConnectButton } from "@/components/client/ConnectButton";
import { CopyButton } from "@/components/client/CopyButton";
import { FlowShell } from "@/components/client/FlowShell";
import { useViewer } from "@/components/client/SatchelPage";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Banner, Button, Icon, Morph, Segmented, cx } from "@/components/ui";
import { CHAIN_NAME, copy } from "@/lib/copy";
import { SATCHEL_CONTRACT, SOL_UI_ENABLED } from "@/lib/config";
import { satchelAddresses } from "@/lib/derive";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { evmSignatureHex, looksLikeDigest, MAX_MESSAGE_BYTES, safeMessage, solSignatureBase58, validateMessage } from "@/lib/message";
import { calls, contractViews } from "@/lib/near/contract";
import type { SignRequest } from "@/lib/near/types";
import { useWallet } from "@/lib/near/wallet";
import { startRunner, useIntent } from "@/lib/signing/client";
import { callWallet } from "@/lib/signing/runner";
import { intentStore, newIntentId } from "@/lib/signing/store";
import type { PendingIntent } from "@/lib/signing/types";

/**
 * C7: Sign a message (docs/specs/C1-C2-C3-C7.md §3.3). Owner only: delegates never see it (the contract refuses message
 * signing for a delegate, C5), and it is paused while the Satchel is for sale. Write → Review (the exact text, escaped
 * where hidden characters could mislead, the bytes in hex, the warning and an acknowledgement) → signing (the existing
 * runner: the intent is persisted, the wallet is called in the click handler, the record is watched on NEAR) → the
 * signature with Copy and how anyone can verify it. A message is never broadcast and never uses a nonce.
 */

type Key = "evm" | "sol";
type Step = "form" | "review" | "progress";

const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
const wallClock = () => Date.now();

const TEXTAREA =
  "min-h-36 w-full resize-y rounded-sm border-2 border-line-strong bg-surface-sunken px-3.5 py-3 font-mono text-[0.9375rem]/6 text-ink placeholder:font-sans placeholder:text-ink-muted hover:border-ink-muted aria-invalid:border-danger";

export function SignMessageFlow({ snap, intentId }: { snap: SatchelSnapshot; intentId: string | null }) {
  const { live, isOwner, accountId } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const hydrated = useHydrated();
  const [key, setKey] = useState<Key>("evm");
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>(intentId ? "progress" : "form");
  const [ack, setAck] = useState(false);
  const [base, setBase] = useState<{ s0: number; h0: number } | null>(null);
  const [baseError, setBaseError] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(intentId);
  const [cancelled, setCancelled] = useState(false);
  const intent = useIntent(currentId);
  const v = validateMessage(text);
  const touched = text.length > 0;
  const closeHref = `/s/${snap.token_id}`;
  const address = key === "evm" ? snap.addresses.evm : snap.addresses.sol;

  // s0 and h0 are read while Review is shown, so the click handler can call the wallet synchronously (popup blockers)
  useEffect(() => {
    if (step !== "review") return;
    let alive = true;
    const src = dataSource();
    Promise.all([contractViews(src.view).satchel(snap.token_id), src.blockHeight()])
      .then(([s, h]) => alive && setBase({ s0: s?.sig_count ?? live.sig_count, h0: h }))
      .catch(() => alive && setBaseError(true));
    return () => {
      alive = false;
    };
  }, [step, snap.token_id, live.sig_count]);

  // a rejected wallet with no record → back on Review with a neutral note; react to the stage during render
  const stageKey = intent ? `${intent.id}:${intent.stage}` : null;
  const [seen, setSeen] = useState<string | null>(null);
  if (stageKey !== seen) {
    setSeen(stageKey);
    if (intent?.stage === "cancelled") {
      setStep("review");
      setCancelled(true);
    }
  }

  const onSign = () => {
    if (!v.ok || !ack || !base || !wallet || !accountId) return;
    const request = (key === "evm" ? evmMessageSignRequest(text) : solMessageSignRequest(text)) as SignRequest;
    const store = intentStore();
    const now = wallClock();
    const id = newIntentId();
    store.upsert({
      id,
      tokenId: snap.token_id,
      chain: key,
      createdAt: now,
      contract: SATCHEL_CONTRACT,
      sigCountBefore: base.s0,
      heightBefore: base.h0,
      unsigned: {},
      payloadHashes: [payloadFor(key, v.bytes)],
      stage: "preparing",
      signerId: accountId,
      message: { kind: key === "evm" ? "evm_message" : "sol_message", text },
    });
    store.dispatch(id, { type: "PERSISTED", now });
    setCurrentId(id);
    setCancelled(false);
    setStep("progress");
    callWallet(id, wallet, { ...calls.signFor(snap.token_id, request), signerId: accountId } as never, { store });
    startRunner(id);
    const url = new URL(window.location.href);
    url.searchParams.set("intent", id);
    window.history.replaceState(null, "", url.toString());
  };

  // ── guards: not connected, not the owner, for sale ──
  let guard: ReactNode = null;
  const tracking = step === "progress" && !!intent;
  if (ready && !accountId) {
    guard = (
      <Guard icon={Wallet} title={copy.send.guard.connectTitle} body={copy.msg.guard.connectBody(snap.token_id)}>
        <ConnectButton size="lg" />
      </Guard>
    );
  } else if (ready && accountId && !isOwner && !tracking) {
    guard = (
      <Guard icon={Lock} title={copy.send.guard.notOwnerTitle(snap.token_id)} body={copy.msg.guard.notOwnerBody(accountId, live.owner)}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (live.listing && !tracking) {
    guard = (
      <Guard icon={Snowflake} tone="frozen" title={copy.send.guard.listedTitle} body={copy.msg.paused}>
        <Button size="lg" href={`/s/${snap.token_id}/sale`}>
          {copy.send.guard.goToSell}
        </Button>
      </Guard>
    );
  }

  let body: ReactNode;
  let action: ReactNode = null;
  let stepNo: { index: number; count: number } | undefined;
  if (step === "progress" && !hydrated) {
    body = <p className="font-sans text-body text-ink-muted">{copy.msg.progress.signing}</p>;
  } else if (tracking && intent) {
    body = <Progress intent={intent} />;
    action = <ProgressActions intent={intent} closeHref={closeHref} onRetry={() => setStep("review")} />;
  } else if (guard) {
    body = guard;
  } else if (step === "form" || (step === "progress" && !intent)) {
    stepNo = { index: 1, count: 2 };
    const error = touched && !v.ok ? (v.error === "too_long" ? copy.msg.tooLong(MAX_MESSAGE_BYTES) : v.error === "encoding" ? copy.msg.encoding : copy.msg.empty) : null;
    body = (
      <>
        {SOL_UI_ENABLED ? (
          <div className="flex flex-col gap-1.5">
            <span id="msg-key-label" className="font-sans text-label text-ink">
              {copy.msg.key}
            </span>
            <Segmented
              labelledBy="msg-key-label"
              options={[
                { value: "evm", label: copy.msg.keyEvm },
                { value: "sol", label: copy.msg.keySol },
              ]}
              value={key}
              onChange={(k) => setKey(k as Key)}
              block
              optionAttr="msg-key"
            />
          </div>
        ) : null}
        <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.msg.format[key]}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg-text" className="font-sans text-label text-ink">
            {copy.msg.label}
          </label>
          <textarea
            id="msg-text"
            data-testid="msg-text"
            className={TEXTAREA}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.msg.placeholder}
            spellCheck={false}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "msg-count msg-error" : "msg-count"}
          />
          <p id="msg-count" className={cx("m-0 font-sans text-caption t-num", v.ok || !touched ? "text-ink-muted" : "text-danger")}>
            {copy.msg.count(v.length, MAX_MESSAGE_BYTES)}
          </p>
          {error ? (
            <p id="msg-error" role="alert" className="m-0 flex items-start gap-1.5 font-sans text-body-sm text-danger">
              <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
              {error}
            </p>
          ) : null}
        </div>
      </>
    );
    action = (
      <>
        <Button variant="primary" size="lg" block disabled={!v.ok} aria-describedby={v.ok ? undefined : "msg-review-why"} data-testid="msg-review" onClick={() => v.ok && setStep("review")}>
          {copy.msg.review}
        </Button>
        {!v.ok ? <FootNote id="msg-review-why">{copy.msg.reviewWhy}</FootNote> : null}
      </>
    );
  } else {
    stepNo = { index: 2, count: 2 };
    const safe = safeMessage(text);
    const digest = looksLikeDigest(text);
    const ready2 = v.ok && ack && !!base;
    body = (
      <>
        <section aria-labelledby="msg-exact-title" className="flex flex-col gap-2">
          <h3 id="msg-exact-title" className="m-0 font-sans text-label text-ink">
            {copy.msg.exact}
          </h3>
          <p data-testid="msg-exact" className="m-0 max-h-60 overflow-auto rounded-sm border border-line bg-surface-sunken px-3.5 py-3 font-mono text-[0.9375rem]/6 wrap-anywhere whitespace-pre-wrap text-ink">
            {safe.text}
          </p>
          {safe.escaped ? (
            <p className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink" data-testid="msg-escaped">
              <Icon icon={ShieldAlert} size={16} className="mt-0.5 text-danger" />
              {copy.msg.escaped}
            </p>
          ) : null}
          {digest ? (
            <p className="m-0 flex items-start gap-2 font-sans text-body-sm text-ink" data-testid="msg-digest">
              <Icon icon={Hash} size={16} className="mt-0.5 text-danger" />
              {copy.msg.digest}
            </p>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="font-sans text-caption text-ink-muted">{copy.msg.hex}</span>
            <code data-testid="msg-hex" className="block max-h-24 overflow-auto rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[0.8125rem]/5 break-all text-ink-muted">
              {safe.hex}
            </code>
          </div>
          <p className="m-0 font-sans text-body-sm text-ink-muted">
            {copy.msg.format[key]} {CHAIN_NAME[key]} · <span className="font-mono">{address}</span>
          </p>
        </section>
        <section aria-labelledby="msg-warn-title" className="flex flex-col gap-2 rounded-md border-2 border-danger bg-surface p-4" data-testid="msg-warning">
          <h3 id="msg-warn-title" className="m-0 flex items-center gap-2 font-sans text-label text-danger">
            <Icon icon={TriangleAlert} size={20} />
            {copy.msg.warnTitle}
          </h3>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 font-sans text-body-sm text-ink">
            {copy.msg.warn.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 font-sans text-label text-ink">
            <input type="checkbox" data-testid="msg-ack" checked={ack} onChange={(e) => setAck(e.target.checked)} className="size-5.5 flex-none accent-(--ink)" />
            {copy.msg.ack}
          </label>
        </section>
        {baseError ? (
          <Banner icon={TriangleAlert} tone="danger" title={copy.send.form.feeError} role="alert" />
        ) : null}
      </>
    );
    action = (
      <>
        <Button variant="primary" size="lg" block disabled={!ready2} data-testid="msg-sign" aria-describedby="msg-sign-why" onClick={onSign}>
          <Morph value={base ? "idle" : "loading"} labels={{ idle: copy.msg.cta, loading: { label: copy.sign.prepare, icon: LoaderCircle, spin: true } }} />
        </Button>
        {cancelled ? (
          <FootNote id="msg-sign-why" tone="neutral" icon={Undo2} role="status">
            {copy.msg.cancelled}
          </FootNote>
        ) : !ack ? (
          <FootNote id="msg-sign-why">{copy.msg.ackFirst}</FootNote>
        ) : (
          <p id="msg-sign-why" className="sr-only" />
        )}
        <Button size="md" block variant="link" className="mt-1 justify-center" onClick={() => setStep("form")}>
          {copy.msg.edit}
        </Button>
      </>
    );
  }

  return (
    <FlowShell title={copy.msg.title} meta={copy.msg.meta(snap.token_id)} thumb step={stepNo} fill={!guard || tracking} closeHref={closeHref} action={action} testId="sign-flow">
      <div className="flex flex-col gap-4" data-step={tracking ? "progress" : guard ? "guard" : step}>
        {body}
      </div>
    </FlowShell>
  );
}

/**
 * The record payload the contract writes for this message, from core's policy mirror: keccak256(EIP-191 bytes) or
 * sha256(off-chain v0 bytes). The watcher finds the record by it.
 */
function payloadFor(key: Key, bytes: Uint8Array): string {
  const r = key === "evm" ? classifyEvmMessage(toHex(bytes)) : classifySolMessage(toHex(bytes));
  return r.ok ? toHex(r.recordPayloads[0]) : "";
}

function Guard({ icon, tone = "ink", title, body, children }: { icon: typeof Info; tone?: "ink" | "frozen"; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center" data-testid="sign-guard">
      <span className={cx("mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken", tone === "frozen" ? "text-frozen" : "text-ink")}>
        <Icon icon={icon} size={28} />
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function FootNote({ id, children, tone = "muted", icon = Info, role }: { id?: string; children: ReactNode; tone?: "muted" | "neutral"; icon?: typeof Info; role?: string }) {
  return (
    <p id={id} role={role} className={cx("mt-2.5 flex items-start gap-2 font-sans text-body-sm", tone === "neutral" ? "text-ink" : "text-ink-muted")}>
      <Icon icon={icon} size={16} className="mt-0.5 text-ink-muted" />
      <span>{children}</span>
    </p>
  );
}

const IN_FLIGHT = new Set(["preparing", "awaiting_wallet", "signing", "signed", "broadcasting", "sent", "unknown"]);

function Progress({ intent }: { intent: PendingIntent }) {
  const key: Key = intent.message?.kind === "sol_message" ? "sol" : "evm";
  if (intent.stage === "confirmed") {
    const sig = intent.signatures?.[0] ?? null;
    const sigText = !sig ? "" : "ed25519" in sig ? solSignatureBase58(sig.ed25519) : evmSignatureHex(sig);
    return <Signed intent={intent} sigText={sigText} k={key} />;
  }
  if (intent.stage === "failed" && intent.error === "E22") {
    return (
      <Banner icon={ShieldAlert} tone="danger" title={copy.sign.failedTitle} role="alert">
        {copy.msg.badSig}
      </Banner>
    );
  }
  if (!IN_FLIGHT.has(intent.stage)) {
    return (
      <Banner icon={TriangleAlert} tone="danger" title={copy.sign.failedTitle} role="alert">
        {copy.msg.failed}
      </Banner>
    );
  }
  const line = intent.stage === "awaiting_wallet" || intent.stage === "preparing" ? copy.msg.progress.wallet : intent.stage === "signing" || intent.stage === "unknown" ? copy.msg.progress.signing : copy.msg.progress.checking;
  return (
    <div className="flex flex-col gap-3" data-testid="msg-progress" data-stage={intent.stage}>
      <p role="status" className="m-0 flex items-center gap-2 font-sans text-body text-ink">
        <Icon icon={LoaderCircle} size={20} spin className="text-frozen" />
        {line}
      </p>
      {intent.message ? (
        <p className="m-0 rounded-sm bg-surface-sunken px-3.5 py-3 font-mono text-[0.9375rem]/6 wrap-anywhere whitespace-pre-wrap text-ink-muted">{safeMessage(intent.message.text).text}</p>
      ) : null}
    </div>
  );
}

function Signed({ intent, sigText, k }: { intent: PendingIntent; sigText: string; k: Key }) {
  // the signer: the Satchel's own derived address on that key (the adapter checked the signature against it live)
  const a = satchelAddresses(intent.tokenId, intent.contract);
  const signer = k === "evm" ? a.evm : a.sol;
  return (
    <div className="flex flex-col gap-4" data-testid="msg-done">
      <div className="flex flex-col gap-1">
        <p className="m-0 flex items-center gap-2 font-display text-heading text-ink">
          <Icon icon={Check} size={24} className="text-success" />
          {copy.msg.done}
        </p>
<p className="m-0 font-sans text-body-sm text-ink-muted">{copy.msg.doneBody(CHAIN_NAME[k])}</p>
      </div>
      <section aria-labelledby="msg-sig-title" className="flex flex-col gap-2">
        <h3 id="msg-sig-title" className="m-0 font-sans text-label text-ink">
          {copy.msg.signature}
        </h3>
        <code data-testid="msg-signature" className="block rounded-sm bg-surface-sunken px-3 py-2.5 font-mono text-[0.8125rem]/5 break-all text-ink">
          {sigText}
        </code>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={sigText} label={copy.msg.copySig} text={copy.msg.copySig} toastText={copy.msg.copied} />
          {intent.message ? <CopyButton value={intent.message.text} label={copy.msg.copyMessage} text={copy.msg.copyMessage} toastText={copy.msg.copied} /> : null}
        </div>
      </section>
      <div className="flex flex-col gap-1">
        <span className="font-sans text-label text-ink">{copy.msg.signer}</span>
        <AddressDisplay address={signer} />
      </div>
      <section aria-labelledby="msg-verify-title" className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
        <h3 id="msg-verify-title" className="m-0 flex items-center gap-2 font-sans text-label text-ink">
          <Icon icon={MessageSquareText} size={18} className="text-ink-muted" />
          {copy.msg.verifyTitle}
        </h3>
        <p className="m-0 font-sans text-body-sm text-ink">{k === "evm" ? copy.msg.verifyEvm : copy.msg.verifySol}</p>
        <code className="block rounded-sm bg-surface-sunken px-3 py-2 font-mono text-[0.8125rem]/5 break-all text-ink" data-testid="msg-verify-code">
          {k === "evm" ? copy.msg.verifyEvmCode(signer) : copy.msg.verifySolCode(signer)}
        </code>
      </section>
    </div>
  );
}

function ProgressActions({ intent, closeHref, onRetry }: { intent: PendingIntent; closeHref: string; onRetry: () => void }) {
  if (intent.stage === "confirmed") {
    return (
      <div className="flex flex-col gap-2.5">
        <Button variant="primary" size="lg" block href={closeHref} replace>
          {copy.msg.doneBtn}
        </Button>
        <Button size="lg" block href={`${closeHref}/activity`}>
          {copy.msg.viewHistory}
        </Button>
      </div>
    );
  }
  if (!IN_FLIGHT.has(intent.stage)) {
    return (
      <Button variant="primary" size="lg" block onClick={onRetry}>
        {copy.msg.retry}
      </Button>
    );
  }
  return null;
}
