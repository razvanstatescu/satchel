"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleX, Info, LoaderCircle, Lock, PackageOpen, Snowflake, TriangleAlert, Wallet } from "lucide-react";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { BookField } from "@/components/client/AddressBook";
import { kindOfChain } from "@/lib/address-book";
import { ConnectButton } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { SigningActions, SigningProgress } from "@/components/client/SigningProgress";
import { useViewer } from "@/components/client/SatchelPage";
import { Button, Icon, TextInput } from "@/components/ui";
import { copy, errorCopy, NETWORK_LABEL } from "@/lib/copy";
import { SATCHEL_CONTRACT } from "@/lib/config";
import { refreshSnapshot } from "@/lib/data/client";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { evmNetworkName } from "@/lib/evm-networks";
import { formatAmount, truncateAddress } from "@/lib/format";
import { hasCoins, holdings, type Holding } from "@/lib/holdings";
import { calls, contractViews, marketCalls } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import type { SigRecordView } from "@/lib/near/types";
import { useWallet } from "@/lib/near/wallet";
import { callWallet } from "@/lib/signing/runner";
import { startRunner, useIntent } from "@/lib/signing/client";
import { intentStore, newIntentId } from "@/lib/signing/store";
import { validateBtc, validateEvm, validateSol, type Validation } from "@/lib/validate";
import { chainName, UI_CHAINS, type UiChain } from "@/lib/view";
import type { PreparedSend } from "@/lib/chains/send";

/**
 * Empty the Satchel (A3; kb/90 §5.11, §8.9): every coin it holds, wherever it is (lib/holdings.ts), one send at a time,
 * reusing the Send building blocks (`prepareSend`, `callWallet`, `SigningProgress`). Addresses (one per chain: the
 * Ethereum address takes every EVM testnet's ETH and USDC) → Review (the plan is frozen here, so balances that update
 * mid-run can't shift it) → run. On each EVM network USDC goes first, because its fee is paid in that network's ETH, and
 * the ETH sweep waits until the USDC send has confirmed. Coins held inside go back to the owner's NEAR account. USDC on
 * a network without ETH for the fee can't move and is named in the review instead. Each send is its own pending
 * intent, so a failure on one never loses another's state.
 */

type Step = "form" | "review" | "running" | "done";

/** One send in the plan: a coin at one of the Satchel's addresses (a `sign_for`), or a coin inside (a withdrawal). */
interface Job {
  key: string;
  h: Holding;
  /** "BTC on Bitcoin testnet4", "USDC on Base Sepolia", "NEAR inside" */
  label: string;
}

interface JobResult {
  key: string;
  label: string;
  ok: boolean;
  amount?: string;
}

const jobLabel = (h: Holding) => (h.place === "inside" ? copy.inside.row(h.ticker) : `${h.ticker} on ${h.networkName}`);

/** The plan: every holding with coins, USDC before ETH on each EVM network; inside coins last. USDC with no ETH on
 * its network for the fee is left out (`stuck`). */
export function emptyPlan(list: Holding[]): { jobs: Job[]; stuck: Holding[] } {
  const held = list.filter(hasCoins);
  const ethOn = (chainId: number | null) => held.some((h) => h.coin === "ETH" && h.chainId === chainId);
  const stuck = held.filter((h) => h.place === "chain" && h.coin === "USDC" && !ethOn(h.chainId));
  const movable = held.filter((h) => !stuck.includes(h));
  const rank = (h: Holding) => (h.place === "inside" ? 3 : h.chain === "sol" ? 2 : h.chain === "evm" ? 1 : 0);
  const ordered = [...movable].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.chain === "evm" && b.chain === "evm" && a.chainId !== b.chainId) return list.indexOf(a) - list.indexOf(b);
    if (a.chain === "evm" && b.chain === "evm") return a.coin === "USDC" ? -1 : b.coin === "USDC" ? 1 : 0;
    return list.indexOf(a) - list.indexOf(b);
  });
  return { jobs: ordered.map((h) => ({ key: h.key, h, label: jobLabel(h) })), stuck };
}

const ADDRESS_CHAINS: UiChain[] = ["btc", "evm", "sol"];

/** Module scope, as SendFlow's `wallClock`: the react-hooks purity rule flags a `Date.now()` in a component body. */
const wallClock = () => Date.now();

export function EmptyFlow({ snap, records }: { snap: SatchelSnapshot; records: SigRecordView[] }) {
  const { live, isOwner, accountId } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const closeHref = `/s/${snap.token_id}`;
  const draft = emptyPlan(holdings(live));

  const [step, setStep] = useState<Step>("form");
  const [plan, setPlan] = useState<Job[]>([]);
  const [addr, setAddr] = useState<Partial<Record<UiChain, string>>>({});
  const [val, setVal] = useState<Partial<Record<UiChain, Validation>>>({});
  const [jobIdx, setJobIdx] = useState(0);
  const [attempts, setAttempts] = useState(0); // successful batches so far for the CURRENT job (BTC can need several)
  const [results, setResults] = useState<JobResult[]>([]);
  const [prepared, setPrepared] = useState<PreparedSend | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [insidePhase, setInsidePhase] = useState<"idle" | "wallet" | "doing">("idle");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const intent = useIntent(currentId);
  const runToken = useRef(0);
  const recsRef = useRef<SigRecordView[]>(records);
  const attemptsRef = useRef(0);

  // the address inputs the plan needs (inside coins need none: they go to the owner's NEAR account)
  const jobsNow = step === "form" ? draft.jobs : plan;
  const chainsNeeded = ADDRESS_CHAINS.filter((c) => UI_CHAINS.includes(c) && jobsNow.some((j) => j.h.chain === c));
  const job = plan[jobIdx];
  const addresses = live.addresses;

  // debounced validation per chain text input
  useEffect(() => {
    const timers = chainsNeeded.map((c) => {
      const text = (addr[c] ?? "").trim();
      if (!text) return null;
      return setTimeout(async () => {
        const v = c === "evm" ? validateEvm(text, addresses.evm) : c === "sol" ? await validateSol(text, addresses.sol) : await validateBtc(text, addresses.btc);
        setVal((p) => ({ ...p, [c]: v }));
      }, 200);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-validate only when the relevant text changes
  }, [chainsNeeded.map((c) => addr[c]).join("|")]);

  const formOk = draft.jobs.length > 0 && chainsNeeded.every((c) => val[c]?.tier !== "error" && !!val[c] && (addr[c] ?? "").trim());
  const toFor = (c: UiChain) => (val[c] && val[c]!.tier !== "error" ? (val[c] as Exclude<Validation, { tier: "error" }>).normalized : (addr[c] ?? "").trim());

  const prepareCurrent = async (my: number) => {
    if (!job || job.h.place === "inside") return;
    const h = job.h;
    setPreparing(true);
    setPrepError(null);
    try {
      // re-read the sig records right before preparing: an earlier send THIS run adds records (the BTC
      // forbidden-txid rule and the EVM nonce-gap rule both need to see them, or a later send would collide).
      const views = contractViews(dataSource().view);
      const s = await views.satchel(snap.token_id).catch(() => null);
      if (s) recsRef.current = await views.allSigRecords(snap.token_id, s.sig_count).catch(() => recsRef.current);
      const mod = await import("@/lib/chains/send");
      const p = await mod.prepareSend({
        tokenId: snap.token_id,
        chain: h.chain!,
        to: toFor(h.chain!),
        amount: "max",
        records: recsRef.current,
        ...(h.chain === "evm" ? { evmChainId: h.chainId!, asset: h.coin === "USDC" ? ("usdc" as const) : ("eth" as const) } : {}),
      });
      if (runToken.current !== my) return;
      setPrepared(p);
    } catch (e) {
      if (runToken.current !== my) return;
      if (attemptsRef.current > 0) {
        // already sent at least one batch for this coin this run: nothing more to sweep, move on quietly.
        advance();
        return;
      }
      setPrepError(e instanceof Error ? e.message : String(e));
    } finally {
      if (runToken.current === my) setPreparing(false);
    }
  };

  const advance = () => {
    setPrepared(null);
    setPrepError(null);
    setCurrentId(null);
    setAttempts(0);
    setInsidePhase("idle");
    attemptsRef.current = 0;
    const next = jobIdx + 1;
    setJobIdx(next);
    if (next >= plan.length) {
      setStep("done");
      refreshSnapshot(snap.token_id);
    }
  };

  // enter "running": prepare the first send; also re-prepare whenever we move to the next one
  useEffect(() => {
    if (step !== "running" || !job) return;
    const my = ++runToken.current;
    void prepareCurrent(my);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on step/jobIdx change
  }, [step, jobIdx]);

  // the active intent reached a terminal stage (an effect, not render: this does real work)
  const seenStage = useRef<string | null>(null);
  useEffect(() => {
    if (!intent || !job) return;
    const key = `${intent.id}:${intent.stage}`;
    if (key === seenStage.current) return;
    seenStage.current = key;
    // a USDC send waits for "confirmed" when ETH on the same network comes next (its fee must be spent first, or the
    // ETH sweep would overspend); everything else moves on at "sent"
    const next = plan[jobIdx + 1];
    const waitConfirm = job.h.coin === "USDC" && next?.h.chain === "evm" && next.h.chainId === job.h.chainId;
    if (!(intent.stage === "confirmed" || (intent.stage === "sent" && !waitConfirm))) return;
    const t = setTimeout(() => {
      setResults((r) => [...r, { key: job.key, label: job.label, ok: true, amount: intent.display?.amount }]);
      setAttempts((n) => n + 1);
      attemptsRef.current += 1;
      setCurrentId(null);
      setPrepared(null);
      // only BTC can need a second sweep (more than MAX_BTC_INPUTS coins); every other coin drains in one send.
      if (job.h.chain === "btc") {
        const my = ++runToken.current;
        void prepareCurrent(my);
      } else {
        advance();
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prepareCurrent closes over the latest state it needs
  }, [intent?.id, intent?.stage]);

  const onSend = () => {
    if (!job || !wallet || !accountId) return;
    if (job.h.place === "inside") return onWithdraw();
    if (!prepared || currentId) return;
    const h = job.h;
    const id = newIntentId();
    const store = intentStore();
    const network = h.chain === "evm" ? evmNetworkName(h.chainId!) : NETWORK_LABEL[h.chain!];
    store.upsert({
      id,
      tokenId: snap.token_id,
      chain: prepared.chain,
      createdAt: wallClock(),
      contract: SATCHEL_CONTRACT,
      sigCountBefore: live.sig_count,
      heightBefore: 0,
      unsigned: prepared.unsigned,
      payloadHashes: prepared.payloadHashes,
      evmNonce: prepared.evmNonce,
      evmChainId: prepared.evmChainId,
      asset: prepared.asset,
      stage: "preparing",
      display: { amount: formatAmount(prepared.amount, h.ticker), to: prepared.to, toShort: truncateAddress(prepared.to), network },
      signerId: accountId,
    });
    store.dispatch(id, { type: "PERSISTED", now: wallClock() });
    setCurrentId(id);
    callWallet(id, wallet, { ...calls.signFor(snap.token_id, prepared.request), signerId: accountId } as never, { store });
    startRunner(id);
  };

  /** A coin inside: the owner's withdrawal (to the connected account), one NEAR transaction. */
  const onWithdraw = () => {
    if (!job || !wallet || !accountId || insidePhase !== "idle") return;
    const h = job.h;
    const amount = h.amount ?? 0n;
    const tx = h.coin === "NEAR" ? marketCalls.withdrawNear(snap.token_id, amount) : marketCalls.withdrawFt(snap.token_id, h.ft!, amount);
    setPrepError(null);
    void runCall(wallet, tx, accountId, (s) => setInsidePhase(s === "wallet" ? "wallet" : "doing")).then((r) => {
      setInsidePhase("idle");
      if (r.ok) {
        setResults((rs) => [...rs, { key: job.key, label: job.label, ok: true, amount: formatAmount(amount, h.ticker) }]);
        advance();
      } else if ("cancelled" in r) setPrepError(copy.sell.cancelled);
      else setPrepError(errorCopy(r.failure.code, { id: snap.token_id }));
    });
  };

  const onSkip = () => {
    if (job) setResults((r) => [...r, { key: job.key, label: job.label, ok: false }]);
    advance();
  };

  const start = () => {
    setPlan(draft.jobs);
    setJobIdx(0);
    setResults([]);
    setStep("running");
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
  } else if (draft.jobs.length === 0 && step === "form") {
    guarded = true;
    body = (
      <Guard icon={PackageOpen} title={copy.empty.guard.zeroTitle} body={draft.stuck.length ? copy.empty.stuckOnly : copy.empty.guard.zeroBody}>
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
        {chainsNeeded.map((c) => {
          const text = addr[c] ?? "";
          const v = text.trim() ? val[c] : null;
          const err = v?.tier === "error" ? v.message : null;
          const coins = draft.jobs.filter((j) => j.h.chain === c);
          return (
            <div key={c} className="flex flex-col gap-1.5">
              <label htmlFor={`empty-${c}`} className="flex items-center gap-2 font-sans text-label text-ink">
                <ChainCharm chain={c} size={20} />
                {copy.empty.addressFor(chainName(c))}
              </label>
              <BookField kind={kindOfChain(c)} onPick={(a) => setAddr((p) => ({ ...p, [c]: a }))}>
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
                className="pr-13"
              />
              </BookField>
              {c === "evm" && coins.length > 1 ? <p className="m-0 font-sans text-caption text-ink-muted">{copy.empty.evmAll(coins.map((j) => j.label).join(", "))}</p> : null}
              {err ? (
                <p role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
                  <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
        {draft.jobs.some((j) => j.h.place === "inside") ? <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.empty.insideTo(accountId ?? "")}</p> : null}
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
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0" data-testid="empty-plan">
          {draft.jobs.map((j) => (
            <li key={j.key} data-empty-job={j.key} className="flex items-center gap-2.5 rounded-md bg-surface-sunken px-3.5 py-3 font-sans text-body text-ink">
              <CoinIcon coin={j.h.coin} badge={j.h.badge} size={28} className="flex-none" />
              <span className="min-w-0 flex-1 wrap-anywhere">
                {copy.empty.reviewRow(j.h.place === "inside" ? j.label : j.h.networkName, formatAmount(j.h.amount ?? 0n, j.h.ticker), j.h.place === "inside" ? (accountId ?? "") : toFor(j.h.chain!))}
              </span>
            </li>
          ))}
        </ul>
        {draft.stuck.length ? (
          <p className="m-0 flex items-start gap-2 rounded-md bg-surface-sunken p-3.5 font-sans text-body-sm text-ink" data-testid="empty-stuck">
            <Icon icon={TriangleAlert} size={16} className="mt-0.5 flex-none text-frozen" />
            {draft.stuck.map((h) => copy.empty.stuck(formatAmount(h.amount ?? 0n, h.ticker), h.networkName)).join(" ")}
          </p>
        ) : null}
        <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-3.5 font-sans text-body-sm text-ink">
          <Icon icon={Info} size={16} className="mt-0.5 flex-none text-ink-muted" />
          {copy.empty.confirmNote}
        </p>
      </>
    );
    action = (
      <Button variant="primary" size="lg" block onClick={start} data-testid="empty-start">
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
            <li key={`${r.key}-${i}`} className="flex items-center gap-2.5 rounded-md bg-surface-sunken px-3.5 py-2.5 font-sans text-body-sm text-ink" data-testid={`empty-result-${r.key}`}>
              <Icon icon={r.ok ? Check : CircleX} size={16} className={r.ok ? "text-success" : "text-danger"} />
              {r.label}
              {r.amount ? ` — ${r.amount}` : ""}
              {!r.ok ? ` — ${copy.empty.chainFailed(r.label)}` : ""}
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
        <Button size="lg" block href={`/s/${snap.token_id}/transactions`}>
          {copy.empty.viewActivity}
        </Button>
      </div>
    );
  } else if (job) {
    // running
    meta = copy.empty.progress(jobIdx + 1, plan.length);
    const batchLabel = job.h.chain === "btc" && attempts > 0 ? copy.empty.batchProgress(attempts + 1) : null;
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
          <Button size="lg" block onClick={onSkip} data-testid="empty-skip">
            {copy.empty.skip}
          </Button>
        </div>
      ) : null;
    } else {
      const inside = job.h.place === "inside";
      body = (
        <div className="flex flex-col gap-4">
          <p className="m-0 flex items-center gap-2.5 font-sans text-label text-ink">
            <CoinIcon coin={job.h.coin} badge={job.h.badge} size={24} />
            {copy.empty.chainTitle(job.label)}
          </p>
          {prepError ? (
            <p role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger">
              <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
              {prepError}
            </p>
          ) : inside ? (
            <p className="m-0 font-sans text-body text-ink t-num">
              {formatAmount(job.h.amount ?? 0n, job.h.ticker)} → {accountId}
            </p>
          ) : prepared ? (
            <p className="m-0 font-sans text-body text-ink t-num">{formatAmount(prepared.amount, job.h.ticker)}</p>
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
          <Button
            variant="primary"
            size="lg"
            block
            disabled={inside ? insidePhase !== "idle" : !prepared || preparing}
            loading={inside ? insidePhase !== "idle" : preparing}
            spinner={inside ? "auto" : "none"}
            onClick={onSend}
            data-testid="empty-send"
          >
            {inside ? copy.empty.takeOut(job.h.ticker) : copy.empty.cta}
          </Button>
          {prepError ? (
            <Button size="lg" block onClick={onSkip} data-testid="empty-skip">
              {copy.empty.skip}
            </Button>
          ) : null}
        </div>
      );
    }
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
