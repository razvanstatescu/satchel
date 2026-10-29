"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleX, Info, LoaderCircle, Lock, PackageOpen, Snowflake, TriangleAlert, Wallet } from "lucide-react";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { ConnectButton } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { SigningActions, SigningProgress } from "@/components/client/SigningProgress";
import { useViewer } from "@/components/client/SatchelPage";
import { Button, Icon, TextInput } from "@/components/ui";
import { copy, NETWORK_LABEL, TICKER } from "@/lib/copy";
import { SATCHEL_CONTRACT } from "@/lib/config";
import { formatAmount, type Ticker } from "@/lib/format";
import { calls } from "@/lib/near/contract";
import type { SatchelSnapshot } from "@/lib/data/types";
import type { SigRecordView } from "@/lib/near/types";
import { callWallet } from "@/lib/signing/runner";
import { startRunner, useIntent } from "@/lib/signing/client";
import { intentStore, newIntentId } from "@/lib/signing/store";
import { useWallet } from "@/lib/near/wallet";
import { validateBtc, validateEvm, validateSol, type Validation } from "@/lib/validate";
import { balanceBase, chainName, UI_CHAINS, type UiChain } from "@/lib/view";
import type { PreparedSend } from "@/lib/chains/send";

/**
 * Empty the Satchel (A3, plan/feature-ideas.md A3; kb/90 §5.11, §8.9): one chain at a time, reusing the Send
 * building blocks (`prepareSend`, `callWallet`, `SigningProgress`). Addresses → Review → run: each chain gets its
 * own pending intent (the same store Send and the Wallet tab read), so a failure on one never loses another's
 * state, and the Satchel's Activity still shows every send this flow made.
 */

type Step = "form" | "review" | "running" | "done";

interface JobResult {
  chain: UiChain;
  batch: number;
  ok: boolean;
  amount?: string;
  intentId: string;
}

const ORDER: UiChain[] = ["btc", "evm", "sol"];

export function EmptyFlow({ snap, records }: { snap: SatchelSnapshot; records: SigRecordView[] }) {
  const { live, isOwner, accountId } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const closeHref = `/s/${snap.token_id}`;
  const chains = ORDER.filter((c) => UI_CHAINS.includes(c) && (balanceBase(live, c) ?? 0n) > 0n);

  const [step, setStep] = useState<Step>("form");
  const [addr, setAddr] = useState<Partial<Record<UiChain, string>>>({});
  const [val, setVal] = useState<Partial<Record<UiChain, Validation>>>({});
  const [chainIdx, setChainIdx] = useState(0);
  const [attempts, setAttempts] = useState(0); // successful batches sent so far for the CURRENT chain
  const [results, setResults] = useState<JobResult[]>([]);
  const [prepared, setPrepared] = useState<PreparedSend | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const intent = useIntent(currentId);
  const runToken = useRef(0);

  const chain = chains[chainIdx];
  const addresses = live.addresses;

  // debounced validation per chain text input
  useEffect(() => {
    const timers = chains.map((c) => {
      const text = (addr[c] ?? "").trim();
      if (!text) return null;
      return setTimeout(async () => {
        const v = c === "evm" ? validateEvm(text, addresses.evm) : c === "sol" ? await validateSol(text, addresses.sol) : await validateBtc(text, addresses.btc);
        setVal((p) => ({ ...p, [c]: v }));
      }, 200);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-validate only when the relevant text changes
  }, [chains.map((c) => addr[c]).join("|")]);

  const formOk = chains.length > 0 && chains.every((c) => val[c]?.tier !== "error" && !!val[c] && (addr[c] ?? "").trim());

  const prepareCurrent = async (my: number) => {
    if (!chain) return;
    setPreparing(true);
    setPrepError(null);
    try {
      const to = val[chain]?.tier !== "error" ? (val[chain] as Exclude<Validation, { tier: "error" }>).normalized : (addr[chain] ?? "").trim();
      const mod = await import("@/lib/chains/send");
      const p = await mod.prepareSend({ tokenId: snap.token_id, chain, to, amount: "max", records });
      if (runToken.current !== my) return;
      setPrepared(p);
    } catch (e) {
      if (runToken.current !== my) return;
      if (attempts > 0) {
        // already sent at least one batch on this chain this run: no more to sweep, move on quietly.
        advanceChain();
        return;
      }
      setPrepError(e instanceof Error ? e.message : String(e));
    } finally {
      if (runToken.current === my) setPreparing(false);
    }
  };

  const advanceChain = () => {
    setPrepared(null);
    setPrepError(null);
    setCurrentId(null);
    setAttempts(0);
    setChainIdx((i) => {
      const next = i + 1;
      if (next >= chains.length) setStep("done");
      return next;
    });
  };

  // enter "running": prepare the first chain; also re-prepare whenever we move to a new chain
  useEffect(() => {
    if (step !== "running" || !chain) return;
    const my = ++runToken.current;
    void prepareCurrent(my);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on step/chainIdx change
  }, [step, chainIdx]);

  // react to the active intent reaching a terminal stage (an effect, not render: this does real work)
  const seenStage = useRef<string | null>(null);
  useEffect(() => {
    if (!intent) return;
    const key = `${intent.id}:${intent.stage}`;
    if (key === seenStage.current) return;
    seenStage.current = key;
    if (intent.stage !== "sent" && intent.stage !== "confirmed") return;
    // deferred (not synchronous in the effect body, react-hooks/set-state-in-effect): a batch just landed.
    const t = setTimeout(() => {
      setResults((r) => [...r, { chain: intent.chain, batch: attempts + 1, ok: true, amount: intent.display?.amount, intentId: intent.id }]);
      setAttempts((n) => n + 1);
      setCurrentId(null);
      setPrepared(null);
      const my = ++runToken.current;
      void prepareCurrent(my);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prepareCurrent closes over the latest state it needs
  }, [intent?.id, intent?.stage]);

  const onSendChain = () => {
    if (!prepared || !wallet || !accountId || currentId) return;
    const id = newIntentId();
    const store = intentStore();
    store.upsert({
      id,
      tokenId: snap.token_id,
      chain: prepared.chain,
      createdAt: Date.now(),
      contract: SATCHEL_CONTRACT,
      sigCountBefore: live.sig_count,
      heightBefore: 0,
      unsigned: prepared.unsigned,
      payloadHashes: prepared.payloadHashes,
      evmNonce: prepared.evmNonce,
      stage: "preparing",
      display: { amount: formatAmount(prepared.amount, TICKER[prepared.chain] as Ticker), to: prepared.to, toShort: prepared.to, network: NETWORK_LABEL[prepared.chain] },
      signerId: accountId,
    });
    store.dispatch(id, { type: "PERSISTED", now: Date.now() });
    setCurrentId(id);
    callWallet(id, wallet, { ...calls.signFor(snap.token_id, prepared.request), signerId: accountId } as never, { store });
    startRunner(id);
  };

  const onSkipChain = () => {
    if (intent) setResults((r) => [...r, { chain: intent.chain, batch: attempts + 1, ok: false, intentId: intent.id }]);
    advanceChain();
  };

  let body: ReactNode;
  let action: ReactNode = null;
  let meta: string | undefined;
  let guarded = false;

  if (ready && !accountId) {
    guarded = true;
    body = (
      <Guard icon={Wallet} title={copy.empty.guard.connectTitle} body={copy.empty.guard.connectBody(snap.token_id)}>
        <ConnectButton size="lg" />
      </Guard>
    );
  } else if (ready && !isOwner && step === "form") {
    guarded = true;
    body = (
      <Guard icon={Lock} title={copy.empty.guard.notOwnerTitle(snap.token_id)} body={copy.send.guard.notOwnerBody(accountId ?? "", live.owner)}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (live.listing && step === "form") {
    guarded = true;
    body = (
      <Guard icon={Snowflake} tone="frozen" title={copy.empty.guard.listedTitle} body={copy.empty.guard.listedBody(snap.token_id)}>
        <Button size="lg" href={`/s/${snap.token_id}/sale`}>
          {copy.send.guard.goToSell}
        </Button>
      </Guard>
    );
  } else if (chains.length === 0 && step === "form") {
    guarded = true;
    body = (
      <Guard icon={PackageOpen} title={copy.empty.guard.zeroTitle} body={copy.empty.guard.zeroBody}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (step === "form") {
    meta = copy.empty.stepAddresses;
    body = (
      <>
        <p className="m-0 font-sans text-body text-ink-muted">{copy.empty.intro}</p>
        {chains.map((c) => {
          const text = addr[c] ?? "";
          const v = text.trim() ? val[c] : null;
          const err = v?.tier === "error" ? v.message : null;
          return (
            <div key={c} className="flex flex-col gap-1.5">
              <label htmlFor={`empty-${c}`} className="flex items-center gap-2 font-sans text-label text-ink">
                <ChainCharm chain={c} size={20} />
                {copy.empty.addressFor(chainName(c))}
              </label>
              <TextInput
                id={`empty-${c}`}
                mono
                value={text}
                onChange={(e) => setAddr((p) => ({ ...p, [c]: e.target.value }))}
                placeholder={copy.empty.placeholderFor(chainName(c))}
                autoComplete="off"
                spellCheck={false}
                invalid={!!err}
                data-testid={`empty-addr-${c}`}
              />
              {err ? (
                <p role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
                  <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
      </>
    );
    action = (
      <Button variant="primary" size="lg" block disabled={!formOk} onClick={() => formOk && setStep("review")} data-testid="empty-review">
        {copy.send.form.review}
      </Button>
    );
  } else if (step === "review") {
    meta = copy.empty.stepReview;
    body = (
      <>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {chains.map((c) => (
            <li key={c} className="flex items-center gap-2.5 rounded-md bg-surface-sunken px-3.5 py-3 font-sans text-body text-ink">
              <ChainCharm chain={c} size={28} />
              <span className="min-w-0 flex-1 wrap-anywhere">{copy.empty.reviewRow(chainName(c), formatAmount(balanceBase(live, c) ?? 0n, TICKER[c] as Ticker), addr[c] ?? "")}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-3.5 font-sans text-body-sm text-ink">
          <Icon icon={Info} size={16} className="mt-0.5 flex-none text-ink-muted" />
          {copy.empty.confirmNote}
        </p>
      </>
    );
    action = (
      <Button variant="primary" size="lg" block onClick={() => setStep("running")} data-testid="empty-start">
        {copy.empty.cta}
      </Button>
    );
  } else if (step === "done") {
    const failed = results.filter((r) => !r.ok);
    body = (
      <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
        <span className={`grid size-16 place-items-center rounded-[20px] bg-surface-sunken ${failed.length ? "text-ink" : "text-success"}`}>
          <Icon icon={failed.length ? TriangleAlert : Check} size={28} />
        </span>
        <h3 className="m-0 font-display text-heading text-ink">{failed.length ? copy.empty.partialTitle : copy.empty.allDoneTitle}</h3>
        <p className="font-sans text-body text-ink-muted">{failed.length ? copy.empty.partialBody : copy.empty.allDoneBody}</p>
        <ul className="m-0 flex w-full list-none flex-col gap-2 p-0 text-left" data-testid="empty-results">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-md bg-surface-sunken px-3.5 py-2.5 font-sans text-body-sm text-ink" data-testid={`empty-result-${r.chain}`}>
              <Icon icon={r.ok ? Check : CircleX} size={16} className={r.ok ? "text-success" : "text-danger"} />
              {chainName(r.chain)}
              {r.amount ? ` — ${r.amount}` : ""}
              {!r.ok ? ` — ${copy.empty.chainFailed(chainName(r.chain))}` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
    action = (
      <div className="flex flex-col gap-2.5">
        <Button variant="primary" size="lg" block href={closeHref} replace>
          {copy.empty.doneBtn}
        </Button>
        <Button size="lg" block href={`/s/${snap.token_id}/activity`}>
          {copy.empty.viewActivity}
        </Button>
      </div>
    );
  } else {
    // running
    meta = copy.empty.stepRunning;
    const batchLabel = chain === "btc" && attempts > 0 ? copy.empty.batchProgress(attempts + 1) : null;
    if (intent) {
      body = (
        <>
          {batchLabel ? <p className="font-sans text-body-sm text-ink-muted">{batchLabel}</p> : null}
          <SigningProgress intent={intent} />
        </>
      );
      const terminal = !["awaiting_wallet", "signing", "signed", "broadcasting"].includes(intent.stage) && intent.stage !== "sent" && intent.stage !== "confirmed";
      action = terminal ? (
        <div className="flex flex-col gap-2.5">
          <SigningActions intent={intent} closeHref={closeHref} />
          <Button size="lg" block onClick={onSkipChain} data-testid="empty-skip">
            {copy.empty.skip}
          </Button>
        </div>
      ) : null;
    } else {
      body = (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2.5 font-sans text-label text-ink">
            <ChainCharm chain={chain ?? "btc"} size={24} />
            {copy.empty.chainTitle(chainName(chain ?? "btc"))}
          </p>
          {prepError ? (
            <p role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
              <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
              {prepError}
            </p>
          ) : prepared ? (
            <p className="font-sans text-body text-ink t-num">{formatAmount(prepared.amount, TICKER[prepared.chain] as Ticker)}</p>
          ) : (
            <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              {copy.send.form.estimating}
            </p>
          )}
        </div>
      );
      action = (
        <div className="flex flex-col gap-2.5">
          <Button variant="primary" size="lg" block disabled={!prepared || preparing} loading={preparing} spinner="none" onClick={onSendChain} data-testid="empty-send">
            {copy.empty.cta}
          </Button>
          {prepError ? (
            <Button size="lg" block onClick={onSkipChainNoIntent}>
              {copy.empty.skip}
            </Button>
          ) : null}
        </div>
      );
    }
  }

  function onSkipChainNoIntent() {
    if (chain) setResults((r) => [...r, { chain, batch: attempts + 1, ok: false, intentId: "" }]);
    advanceChain();
  }

  return (
    <FlowShell title={copy.empty.title(snap.token_id)} meta={meta} fill={!guarded} closeHref={closeHref} action={action} testId="empty-flow">
      {body}
    </FlowShell>
  );
}

function Guard({ icon, tone = "ink", title, body, children }: { icon: typeof Wallet; tone?: "ink" | "frozen"; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center" data-testid="empty-guard">
      <span className={`mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken ${tone === "frozen" ? "text-frozen" : "text-ink"}`}>
        <Icon icon={icon} size={28} />
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
