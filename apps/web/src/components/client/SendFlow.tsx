"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, ClipboardPaste, Hourglass, Info, LoaderCircle, Lock, RefreshCw, Snowflake, TriangleAlert, Undo2, Wallet, X, type LucideIcon } from "lucide-react";
import { checkDelegatedSign } from "@satchel/core/policy";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { ConnectButton } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { BroadcastAgain, SigningActions, SigningProgress, UnsentCard } from "@/components/client/SigningProgress";
import { useViewer } from "@/components/client/SatchelPage";
import { AddressDisplay } from "@/components/AddressDisplay";
import { AmountInput, Banner, Button, Icon, IconButton, Morph, SatchelThumb, Segmented, Skeleton, TextInput, cx } from "@/components/ui";
import { capForAsset, capForChain, evmAsset, formatCapAmount } from "@/lib/allowanceView";
import { copy, errorCopy, NETWORK_LABEL, TICKER } from "@/lib/copy";
import { SATCHEL_CONTRACT, SOL_SEND_ENABLED } from "@/lib/config";
import type { SatchelSnapshot } from "@/lib/data/types";
import { formatAmount, formatSats, parseUnits, truncateAddress, type Ticker } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play } from "@/lib/motion/play";
import { calls } from "@/lib/near/contract";
import { dataSource } from "@/lib/data/source";
import { contractViews } from "@/lib/near/contract";
import type { SigRecordView } from "@/lib/near/types";
import { useWallet } from "@/lib/near/wallet";
import { callWallet } from "@/lib/signing/runner";
import { blockingIntent, retryPlan } from "@/lib/signing/retry";
import { intentStore, newIntentId } from "@/lib/signing/store";
import { startRunner, useIntent, useIntents } from "@/lib/signing/client";
import type { PendingIntent } from "@/lib/signing/types";
import { validateBtc, validateEvm, validateSol, type Validation } from "@/lib/validate";
import { SOL_REFRESH_MS, solBlockhashFresh } from "@/lib/signing/sol-timing";
import { balanceBase, chainName } from "@/lib/view";
import { EvmSendOptions } from "@/components/client/EvmSendOptions";
import { hasCoins, holdings } from "@/lib/holdings";
import { anyEvmFunds, evmBalanceOf, evmNetworkName, SEPOLIA, usdcAddress, USDC_DECIMALS, type EvmChainId } from "@/lib/evm-networks";
import type { PreparedSend } from "@/lib/chains/send";

/**
 * Send (kb/80 R3 §Send; kb/90 §8.6; app-screens §6): Amount and recipient → Review (the exact outcome) → the tracker
 * that becomes the receipt. The unsigned tx, payload hashes, s0 and h0 are prepared WHILE Review is shown; the Send
 * click persists the intent and calls the wallet synchronously in the handler. Everything after that is driven by chain
 * state (lib/signing, untouched). Guards are centred states in a sheet sized to their content, in today's order: not
 * connected, not owner, for sale, nothing to send, an unsent signed send on this chain.
 */

type Chain = "btc" | "evm" | "sol";
type Step = "form" | "review" | "tracker";

const DECIMALS: Record<Chain, number> = { btc: 8, evm: 18, sol: 9 };
/** The chain picker: Bitcoin · Ethereum, plus Solana when the P2 SOL send flow is on (kb/80 R3 §Send). */
export const SEND_CHAINS: Chain[] = SOL_SEND_ENABLED ? ["btc", "evm", "sol"] : ["btc", "evm"];

/** Map a prepare error to copy (SOL rent/balance rules carry a `problem`, kb/80 E25/E26). */
function prepareErrorText(e: unknown, net?: string): string {
  const problem = e && typeof e === "object" && "problem" in e ? String((e as { problem: unknown }).problem) : null;
  switch (problem) {
    case "below_rent_new_recipient":
      return copy.send.val.solRent;
    case "remainder_below_rent":
      return copy.send.sol.E25;
    case "insufficient":
      return copy.send.val.amountMax;
    case "no_balance":
      return copy.send.sol.E26;
    case "old_blockhash_valid":
      return copy.send.sol.oldValid;
    case "usdc_insufficient":
      return copy.usdc.tooMuch;
    case "usdc_no_gas":
      return copy.usdc.noGas(net ?? "this network");
  }
  return e instanceof Error ? e.message : String(e);
}

/** The network a send goes on: "Base Sepolia" for EVM (C3), the chain's network otherwise. */
const networkOf = (chain: Chain, evmChainId: number): string => (chain === "evm" ? evmNetworkName(evmChainId) : NETWORK_LABEL[chain]);

const noop = () => () => {};
/** The wall clock, for event handlers (the click persists the intent with its time). */
const wallClock = () => Date.now();
/** False on the server and while hydrating; true after (the intent store is client-only). */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function SendFlow({
  snap,
  initialChain,
  intentId,
  records,
  initialNetwork = SEPOLIA,
  initialAsset = "eth",
}: {
  snap: SatchelSnapshot;
  initialChain: Chain;
  intentId: string | null;
  records: SigRecordView[];
  /** C3: the EVM testnet (`?network=`) */
  initialNetwork?: EvmChainId;
  /** C2: ETH or USDC (`?asset=`) */
  initialAsset?: "eth" | "usdc";
}) {
  const { live, isOwner, isDelegate, myAllowance, accountId } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const intents = useIntents();
  const hydrated = useHydrated();
  const [chain, setChain] = useState<Chain>(initialChain);
  const [evmChainId, setEvmChainId] = useState<EvmChainId>(initialNetwork);
  const [asset, setAsset] = useState<"eth" | "usdc">(initialAsset);
  const usdc = chain === "evm" && asset === "usdc";
  /** The network the send goes on ("Base Sepolia" for EVM; the chain's network otherwise). */
  const net = networkOf(chain, evmChainId);
  const [amountText, setAmountText] = useState("");
  const [useMax, setUseMax] = useState(false);
  const [toText, setToText] = useState("");
  // the validation answers for one (chain, text); a stale answer is never shown
  const [valFor, setValFor] = useState<{ key: string; v: Validation } | null>(null);
  const valKey = `${chain}|${toText}`;
  const val = toText.trim() && valFor?.key === valKey ? valFor.v : null;
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<Step>(intentId ? "tracker" : "form");
  const [currentId, setCurrentId] = useState<string | null>(intentId);
  const [prepared, setPrepared] = useState<PreparedSend | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [base, setBase] = useState<{ s0: number; h0: number } | null>(null);
  const [cta, setCta] = useState<"idle" | "preparing" | "wallet">("idle");
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [solWait, setSolWait] = useState(false);
  const [stale, setStale] = useState(false);
  const [solBal, setSolBal] = useState<bigint | null>(null);
  const intent = useIntent(currentId);
  const self = live.addresses[chain];
  const balance = chain === "sol" && live.balances.sol === null ? solBal : chain === "evm" ? evmBalanceOf(live, evmChainId, asset) : balanceBase(live, chain);
  // C2: a USDC send pays its fee in ETH on the same network; with none there, say so before Review
  const gasBal = chain === "evm" ? evmBalanceOf(live, evmChainId, "eth") : null;
  const noGas = usdc && gasBal === 0n;
  const ticker = (usdc ? "USDC" : TICKER[chain]) as Ticker;
  const decimals = usdc ? USDC_DECIMALS : DECIMALS[chain];
  // C5 (docs/specs/C5.md): this chain's cap for a delegate, if any; the owner has no cap (everything is theirs).
  // C2 + C3: on EVM the cap is the picked network's ETH, or its USDC.
  const myCap = isDelegate && myAllowance ? (chain === "evm" ? capForAsset(myAllowance, evmAsset(evmChainId, usdc ? usdcAddress(evmChainId) : undefined)) : capForChain(myAllowance, chain)) : undefined;
  const chainAllowedForMe = isOwner || !isDelegate || !!myCap;
  const preparedRef = useRef<PreparedSend | null>(null);
  useEffect(() => {
    preparedRef.current = prepared;
  }, [prepared]);
  // C3: nonces are per network, so only an unsent send on this same network blocks
  const blocker = blockingIntent(intents, snap.token_id, chain, chain === "evm" ? evmChainId : undefined);
  // the coins held at its other addresses (the zero guard offers them instead of a dead end)
  const heldElsewhere = holdings(live).filter((h) => hasCoins(h) && h.place === "chain" && h.chain !== chain && SEND_CHAINS.includes(h.chain!));

  // validate recipient on change (debounced lightly)
  useEffect(() => {
    if (!toText.trim()) return;
    let alive = true;
    const key = `${chain}|${toText}`;
    const t = setTimeout(async () => {
      const v = chain === "evm" ? validateEvm(toText, self) : chain === "sol" ? await validateSol(toText, self) : await validateBtc(toText, self);
      if (alive) setValFor({ key, v });
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [toText, chain, self]);

  // Live snapshots may not carry the SOL balance: read it from devnet when Solana is selected (lazy chain module).
  useEffect(() => {
    if (chain !== "sol" || live.balances.sol !== null) return;
    let alive = true;
    import("@/lib/chains/send")
      .then((m) => m.solBalance(live.addresses.sol))
      .then((b) => alive && setSolBal(b))
      .catch(() => alive && setSolBal(null));
    return () => {
      alive = false;
    };
  }, [chain, live.balances.sol, live.addresses.sol]);

  const amount = useMax ? "max" : parseUnits(amountText, decimals);
  const overCap = !useMax && amount !== null && amount !== "max" && myCap && amount > BigInt(myCap.remaining);
  const amountError = noGas
    ? copy.usdc.noGas(net)
    : !useMax && amountText && amount === null
      ? copy.send.val.amountDecimals(decimals)
      : !useMax && amount !== null && amount !== "max" && amount <= 0n
        ? copy.send.val.amountPositive
        : !useMax && amount !== null && amount !== "max" && balance !== null && amount > balance
          ? usdc
            ? copy.usdc.tooMuch
            : copy.send.val.amountMax
          : overCap && myCap
            ? copy.allowance.send.overCap(formatCapAmount(myCap.asset, myCap.remaining))
            : null;
  const formOk = !!val && val.tier !== "error" && amount !== null && !amountError && (useMax || amountText !== "") && chainAllowedForMe;

  // Prepare while Review is shown (nonce, fees, UTXOs, s0, h0) so the click handler can call the wallet synchronously.
  const prepare = useCallback(
    async (reuse?: PreparedArgs["reuse"]) => {
      setPrepared(null);
      setPrepError(null);
      setStale(false);
      setSolWait(reuse?.solNotBefore != null);
      try {
        const mod = await import("@/lib/chains/send");
        const p = await mod.prepareSend({
          tokenId: snap.token_id,
          chain,
          to: val && val.tier !== "error" ? val.normalized : toText,
          amount: amount === null ? 0n : amount,
          records,
          reuse,
          ...(chain === "evm" ? { evmChainId, asset } : {}),
        });
        const src = dataSource();
        const [s, h] = await Promise.all([contractViews(src.view).satchel(snap.token_id), src.blockHeight()]);
        setBase({ s0: s?.sig_count ?? live.sig_count, h0: h });
        setPrepared(p);
      } catch (e) {
        setPrepError(prepareErrorText(e, networkOf(chain, evmChainId)));
      } finally {
        setSolWait(false);
      }
    },
    [snap.token_id, chain, val, toText, amount, records, live.sig_count, evmChainId, asset],
  );

  // Retry from the tracker: same nonce / same inputs (kb/90 §8.7).
  useEffect(() => {
    const onRetry = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const it = intentStore().get(id);
      if (!it || id !== currentId) return;
      setStep("review");
      setCta("idle");
      const plan = retryPlan({ ...it, stage: "timed_out" });
      void prepare({ evmNonce: plan.evmNonce, btcInputs: plan.btcInputs, bumpFees: plan.bumpFees, solNotBefore: plan.solNotBefore });
    };
    window.addEventListener("satchel:retry", onRetry);
    return () => window.removeEventListener("satchel:retry", onRetry);
  }, [currentId, prepare]);

  // D-09: while Review is idle, refresh the SOL blockhash every 8 s so the one used at the click is ≤ 10 s old.
  const refreshSol = useCallback(async () => {
    const cur = preparedRef.current;
    if (!cur || cur.chain !== "sol") return;
    try {
      const next = await (await import("@/lib/chains/send")).refreshSolBlockhash(cur);
      if (preparedRef.current === cur) {
        setPrepared(next);
        setStale(false);
      }
    } catch {
      /* keep the old one; the click refuses it once it is older than 10 s */
    }
  }, []);
  const solReview = step === "review" && prepared?.chain === "sol" && cta === "idle";
  useEffect(() => {
    if (!solReview) return;
    const t = setInterval(() => void refreshSol(), SOL_REFRESH_MS);
    return () => clearInterval(t);
  }, [solReview, refreshSol]);

  // a rejected wallet with no record → back on Review with the neutral note (form kept, WCAG 3.3.7); a record or a
  // hash → the tracker. Reacts to each stage change during render (no effect, no cascading render).
  const stageKey = intent ? `${intent.id}:${intent.stage}` : null;
  const [seenStage, setSeenStage] = useState<string | null>(null);
  if (stageKey !== seenStage) {
    setSeenStage(stageKey);
    if (intent?.stage === "cancelled") {
      setStep("review");
      setCta("idle");
      setCancelMsg(copy.sign.cancelled);
    } else if (intent && intent.stage !== "preparing" && intent.stage !== "awaiting_wallet") {
      setStep("tracker");
    }
  }

  const display = useMemo(() => {
    if (!prepared) return null;
    const amt = formatAmount(prepared.amount, ticker);
    return { amount: amt, to: prepared.to, toShort: truncateAddress(prepared.to), network: networkOf(chain, evmChainId) };
  }, [prepared, ticker, chain, evmChainId]);

  /** The Send click: persist BEFORE the wallet opens, then call it synchronously (no await before signAndSendTransaction). */
  const onSend = () => {
    if (!prepared || !base || !wallet || !accountId || cta !== "idle") return;
    if (val?.tier === "warning" && !ack) return;
    // D-09: never hand the wallet a blockhash older than 10 s (a throttled background tab skips refreshes). No await
    // here (popup blockers): refresh now and let the user click again.
    if (prepared.chain === "sol" && prepared.sol && !solBlockhashFresh(prepared.sol.fetchedAt, wallClock())) {
      setStale(true);
      void refreshSol();
      return;
    }
    // C5: a defensive client-side re-check right before the wallet opens (the contract is authoritative either way).
    if (isDelegate && myAllowance) {
      const chk = checkDelegatedSign(myAllowance, prepared.request, { nowMs: wallClock(), listed: !!live.listing });
      if (!chk.ok) {
        setPrepError(errorCopy(chk.error, { id: snap.token_id, chain }));
        return;
      }
    }
    setCta("preparing");
    setCancelMsg(null);
    const store = intentStore();
    const now = wallClock();
    let id = currentId && intent && intent.stage === "preparing" ? currentId : null;
    const fields: Partial<PendingIntent> = {
      sigCountBefore: base.s0,
      heightBefore: base.h0,
      unsigned: prepared.unsigned,
      payloadHashes: prepared.payloadHashes,
      evmNonce: prepared.evmNonce,
      evmChainId: prepared.evmChainId,
      asset: prepared.asset,
      display: display ?? undefined,
      signerId: accountId,
      chain,
    };
    if (id) {
      store.patch(id, fields);
    } else {
      id = newIntentId();
      const replaced = blocker?.id;
      store.upsert({
        id,
        tokenId: snap.token_id,
        chain,
        createdAt: now,
        contract: SATCHEL_CONTRACT,
        sigCountBefore: base.s0,
        heightBefore: base.h0,
        unsigned: prepared.unsigned,
        payloadHashes: prepared.payloadHashes,
        evmNonce: prepared.evmNonce,
        evmChainId: prepared.evmChainId,
        asset: prepared.asset,
        stage: "preparing",
        display: display ?? undefined,
        signerId: accountId,
        replaces: replaced,
      });
    }
    store.dispatch(id, { type: "PERSISTED", now });
    setCurrentId(id);
    setCta("wallet");
    callWallet(id, wallet, { ...calls.signFor(snap.token_id, prepared.request), signerId: accountId } as never, { store });
    startRunner(id);
    const url = new URL(window.location.href);
    url.searchParams.set("intent", id);
    window.history.replaceState(null, "", url.toString());
  };

  const replace = (b: PendingIntent) => {
    setCurrentId(b.id);
    setStep("review");
    const plan = retryPlan(b);
    void prepare({ evmNonce: plan.evmNonce, btcInputs: plan.btcInputs, bumpFees: plan.bumpFees, solNotBefore: plan.solNotBefore });
  };

  const closeHref = `/s/${snap.token_id}`;
  // a tracker link whose intent this browser doesn't hold (another device, cleared storage): start a fresh send
  const lostIntent = hydrated && step === "tracker" && !intent;
  const tracking = step === "tracker" && !!intent;
  const view: Step = lostIntent ? "form" : step;

  // ── guards (today's order), each a centred state with one action ──
  let guard: { node: ReactNode; foot?: ReactNode } | null = null;
  if (ready && !accountId) {
    guard = {
      node: (
        <Guard icon={Wallet} title={copy.send.guard.connectTitle} body={copy.send.guard.connectBody(snap.token_id)}>
          <ConnectButton size="lg" />
        </Guard>
      ),
    };
  } else if (ready && accountId && !isOwner && !isDelegate && !tracking) {
    guard = {
      node: (
        <Guard icon={Lock} title={copy.send.guard.notOwnerTitle(snap.token_id)} body={copy.send.guard.notOwnerBody(accountId, live.owner)}>
          <Button size="lg" href={closeHref} replace>
            {copy.sign.close}
          </Button>
        </Guard>
      ),
    };
  } else if (live.listing && !tracking) {
    guard = {
      node: (
        <Guard icon={Snowflake} tone="frozen" title={copy.send.guard.listedTitle} body={copy.send.guard.listedBody(snap.token_id)}>
          <Button size="lg" href={`/s/${snap.token_id}/sale`}>
            {copy.send.guard.goToSell}
          </Button>
        </Guard>
      ),
    };
  } else if (view === "form" && (chain === "evm" ? !anyEvmFunds(live) : balance === 0n)) {
    // C3: the Ethereum send only guards when no network holds anything; otherwise the network picker shows where
    guard = {
      node: (
        <Guard art={<ChainCharm chain={chain} size={40} />} title={copy.send.guard.zeroTitle} body={`${copy.send.guard.zero(ticker)} ${copy.send.guard.zeroHelp(chainName(chain))}`}>
          <div className="flex flex-col items-stretch gap-2.5">
            {/* the coins it does hold, one tap away (the column's Send opens on a held coin; a link may not) */}
            {heldElsewhere.slice(0, 3).map((h) => (
              <Button
                key={h.key}
                variant={h === heldElsewhere[0] ? "primary" : "secondary"}
                size="lg"
                icon={ArrowUp}
                data-testid="send-switch"
                onClick={() => {
                  setChain(h.chain!);
                  if (h.chain === "evm") {
                    setEvmChainId(h.chainId as EvmChainId);
                    setAsset(h.coin === "USDC" ? "usdc" : "eth");
                  }
                }}
              >
                {copy.send.guard.sendInstead(h.ticker, h.networkName)}
              </Button>
            ))}
            <Button variant={heldElsewhere.length ? "link" : "primary"} size="lg" icon={ArrowDown} href={`/s/${snap.token_id}/receive?chain=${chain}`}>
              {copy.send.guard.addCoins}
            </Button>
          </div>
        </Guard>
      ),
    };
  } else if (blocker && blocker.id !== currentId && view === "form") {
    const canBroadcast = blocker.stage === "signed_not_sent" && !(blocker.chain === "evm" && blocker.error?.startsWith("nonce-gap:"));
    guard = {
      node: (
        <div className="flex flex-col gap-3" data-testid="send-unsent">
          {blocker.stage === "signed_not_sent" ? <UnsentCard intent={blocker} /> : <SigningProgress intent={blocker} />}
          {blocker.chain !== "sol" ? <p className="font-sans text-body-sm text-ink-muted">{copy.send.guard.replaceNote(blocker.chain === "evm" ? blocker.evmNonce : undefined)}</p> : null}
        </div>
      ),
      foot: (
        <div className="flex flex-col gap-2.5">
          {canBroadcast ? <BroadcastAgain intent={blocker} size="lg" /> : null}
          <Button size="lg" block onClick={() => replace(blocker)}>
            {copy.send.guard.replace}
          </Button>
        </div>
      ),
    };
  }

  const nonTerminal = !!intent && ["awaiting_wallet", "signing", "signed", "broadcasting"].includes(intent.stage);
  const titleChain = tracking && intent ? intent.chain : chain;
  const titleUsdc = tracking && intent ? intent.asset === "usdc" : usdc;

  let body: ReactNode;
  let action: ReactNode = null;
  let stepNo: { index: number; count: number } | undefined;
  if (tracking && intent) {
    body = <SigningProgress intent={intent} />;
    action = <SigningActions intent={intent} closeHref={closeHref} />;
  } else if (step === "tracker" && !hydrated) {
    // server HTML / hydration of a tracker link: the store is client-only, so hold the place quietly
    body = <TrackerPlaceholder />;
  } else if (guard) {
    body = guard.node;
    action = guard.foot ?? null;
  } else if (view === "form") {
    stepNo = { index: 1, count: 2 };
    const why = formOk
      ? null
      : noGas
        ? amountError
        : amountError || val?.tier === "error"
          ? copy.send.form.fixField
          : isDelegate && !chainAllowedForMe
            ? copy.allowance.send.chainNotAllowed(ticker)
            : copy.send.form.reviewWhy(net);
    body = (
      <>
        {isDelegate ? (
          !chainAllowedForMe ? (
            <Banner icon={TriangleAlert} tone="danger" title={copy.allowance.send.chainNotAllowed(ticker)} />
          ) : myCap ? (
            <p className="m-0 font-sans text-body-sm text-ink-muted" data-testid="allowance-remaining">
              {copy.allowance.send.remaining(formatCapAmount(myCap.asset, myCap.remaining))}
            </p>
          ) : null
        ) : null}
        <FormStep
          chain={chain}
        setChain={(c) => {
          setChain(c);
          setToText("");
          setAmountText("");
          setUseMax(false);
        }}
        balanceFor={(c) => (c === "sol" && live.balances.sol === null ? solBal : c === "evm" ? evmBalanceOf(live, evmChainId, asset) : balanceBase(live, c))}
        ticker={ticker}
        network={net}
        evmOptions={
          chain === "evm" ? (
            <EvmSendOptions
              chainId={evmChainId}
              asset={asset}
              onChainId={(c) => {
                setEvmChainId(c);
                setAmountText("");
                setUseMax(false);
              }}
              onAsset={(a) => {
                setAsset(a);
                setAmountText("");
                setUseMax(false);
              }}
            />
          ) : null
        }
        amountText={amountText}
        setAmountText={(v) => {
          setUseMax(false);
          setAmountText(v);
        }}
        useMax={useMax}
        onMax={() => setUseMax(true)}
        amountError={amountError}
        toText={toText}
        setToText={setToText}
        val={val}
        />
      </>
    );
    action = (
      <>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!formOk}
          aria-describedby={why ? "review-why" : undefined}
          data-testid="review"
          onClick={() => {
            if (!formOk) return;
            setStep("review");
            void prepare();
          }}
        >
          {copy.send.form.review}
        </Button>
        {why ? <FootNote id="review-why">{why}</FootNote> : null}
      </>
    );
  } else {
    stepNo = { index: 2, count: 2 };
    const ackMissing = val?.tier === "warning" && !ack;
    const ready2 = !!prepared && !!base && !ackMissing;
    const idleLabel = display ? copy.send.review.cta(display.amount) : prepError ? copy.send.review.label : copy.send.form.estimating;
    const ctaState = cta === "idle" ? (stale ? "stale" : "idle") : cta;
    body = (
      <ReviewStep
        tokenId={snap.token_id}
        chain={chain}
        ticker={ticker}
        network={net}
        prepared={prepared}
        error={prepError}
        val={val}
        ack={ack}
        setAck={setAck}
        onRetry={() => void prepare()}
        locked={cta !== "idle"}
        solWait={solWait}
      />
    );
    action = (
      <>
        <p className="mb-3 flex items-start gap-2 font-sans text-body-sm font-semibold text-ink">
          <Icon icon={Info} size={16} className="mt-0.5 text-ink-muted" />
          {usdc ? copy.usdc.final : copy.send.review.final[chain]}
        </p>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!ready2 && cta === "idle"}
          loading={cta !== "idle"}
          spinner="none"
          data-testid="send"
          aria-label={display && cta === "idle" && !stale ? copy.send.review.ctaAria(display.amount, display.toShort) : undefined}
          aria-describedby="send-why"
          onClick={onSend}
        >
          <Morph
            value={ctaState}
            labels={{
              idle: idleLabel,
              stale: copy.send.sol.refreshing,
              preparing: { label: copy.sign.prepare, icon: LoaderCircle, spin: true },
              wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
            }}
          />
        </Button>
        {cancelMsg ? (
          <FootNote id="send-why" tone="neutral" icon={Undo2} role="status" testId="cancelled">
            {cancelMsg}
          </FootNote>
        ) : (
          <FootNote id="send-why">{cta === "wallet" ? copy.send.review.walletHint : ackMissing && prepared ? copy.send.review.ackFirst : copy.send.review.helper(SATCHEL_CONTRACT)}</FootNote>
        )}
      </>
    );
  }

  return (
    <FlowShell
      title={titleUsdc ? copy.usdc.sendTitle : copy.send.title(chainName(titleChain))}
      meta={copy.send.meta(snap.token_id)}
      thumb
      step={stepNo}
      fill={!guard || tracking}
      closeHref={closeHref}
      minimize={nonTerminal}
      action={action}
      testId="send-flow"
    >
      <StepIn step={tracking ? "tracker" : guard ? "guard" : view}>{body}</StepIn>
    </FlowShell>
  );
}

type PreparedArgs = { reuse?: { evmNonce?: number; btcInputs?: string[]; bumpFees?: boolean; solNotBefore?: number } };

/**
 * A new step starts at the top of the sheet, and if the control you pressed went away with the old step (Review →
 * Send), focus returns to the sheet's title instead of falling to the page.
 */
function settleStep(el: HTMLElement) {
  if (el.parentElement) el.parentElement.scrollTop = 0;
  const a = document.activeElement;
  if (!a || a === document.body || !a.isConnected) document.getElementById("flow-title")?.focus({ preventScroll: true });
}

/**
 * A step arriving (motion-spec §4 "Flow step"): it slides in 16 px from the right as it fades in (200 ms, ease-out).
 * The first paint is as drawn. Reduced motion: a fade.
 */
function StepIn({ step, children }: { step: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    settleStep(el);
    const reduce = readMotionMode() === "reduce";
    const h = play(
      [
        { el, prop: "opacity", frames: [[0, 0, EASE.out], [reduce ? 150 : 200, 1]] },
        ...(reduce ? [] : [{ el, prop: "translate" as const, frames: [[0, "16px 0", EASE.out], [200, "0 0"]] as const }]),
      ],
      200,
    );
    return () => h.cancel();
  }, [step]);
  return (
    <div ref={ref} data-step={step} className="flex flex-col gap-4">
      {children}
    </div>
  );
}

/** A guard: a centred state with an icon tile, a heading, its reason and one action (no step counter, no foot). */
function Guard({ icon, art, tone = "ink", title, body, children }: { icon?: LucideIcon; art?: ReactNode; tone?: "ink" | "frozen" | "danger"; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center" data-testid="send-guard">
      <span className={cx("mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken", tone === "frozen" ? "text-frozen" : tone === "danger" ? "text-danger" : "text-ink")}>
        {art ?? (icon ? <Icon icon={icon} size={28} /> : null)}
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** The line under a pinned primary: its reason, the helper, or your own cancel (neutral, never red). */
function FootNote({ id, children, tone = "muted", icon = Info, role, testId }: { id?: string; children: ReactNode; tone?: "muted" | "neutral"; icon?: LucideIcon; role?: string; testId?: string }) {
  return (
    <p id={id} role={role} data-testid={testId} className={cx("mt-2.5 flex items-start gap-2 font-sans text-body-sm", tone === "neutral" ? "text-ink" : "text-ink-muted")}>
      <Icon icon={icon} size={16} className={cx("mt-0.5", tone === "neutral" ? "text-ink-muted" : undefined)} />
      <span>{children}</span>
    </p>
  );
}

function TrackerPlaceholder() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton line className="h-6 w-48" />
      <Skeleton className="h-12 rounded-md" />
      <div className="flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton line className="w-52" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormStep(p: {
  chain: Chain;
  setChain: (c: Chain) => void;
  balanceFor: (c: Chain) => bigint | null;
  amountText: string;
  setAmountText: (v: string) => void;
  useMax: boolean;
  onMax: () => void;
  amountError: string | null;
  toText: string;
  setToText: (v: string) => void;
  val: Validation | null;
  /** C2: ETH, or USDC on an EVM network */
  ticker: Ticker;
  /** C3: the network name ("Base Sepolia") */
  network: string;
  /** C3 + C2: the EVM network and coin pickers */
  evmOptions?: ReactNode;
}) {
  const ticker = p.ticker;
  const bal = p.balanceFor(p.chain);
  const maxText = bal === null ? "—" : formatAmount(bal, ticker);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolved = p.val && p.val.tier !== "error" ? p.val : null;
  const toError = p.val?.tier === "error" ? p.val.message : null;
  return (
    <>
      <Segmented
        options={SEND_CHAINS.map((c) => ({ value: c, label: TICKER[c], lead: <ChainCharm chain={c} size={20} /> }))}
        value={p.chain}
        onChange={(c) => {
          if (c !== p.chain) p.setChain(c);
        }}
        label={copy.send.form.chain}
        block
        optionAttr="chain-select"
      />
      {p.evmOptions}
      <div>
        <label htmlFor="amount" className="sr-only">
          {copy.send.form.amountIn(ticker)}
        </label>
        <AmountInput
          id="amount"
          data-testid="amount"
          align="center"
          ticker={ticker}
          placeholder="0"
          invalid={!!p.amountError}
          aria-describedby={p.amountError ? "amount-error" : undefined}
          value={p.useMax ? (bal === null ? "" : formatAmount(bal, ticker, { withTicker: false })) : p.amountText}
          onChange={(e) => p.setAmountText(e.target.value.replace(",", "."))}
          available={
            <span className="flex flex-col items-center gap-1">
              <span className="flex flex-wrap items-center justify-center gap-x-2">
                {copy.send.form.available(maxText)}
                <Button variant="link" onClick={p.onMax} aria-label={copy.send.form.maxAria(maxText)}>
                  {copy.send.form.max}
                </Button>
              </span>
              {p.useMax ? <span>{copy.send.form.maxNote}</span> : null}
              {p.amountError ? (
                <span id="amount-error" role="alert" className="flex items-start gap-1.5 text-danger">
                  <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                  {p.amountError}
                </span>
              ) : null}
            </span>
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {resolved ? (
          <>
            <span className="font-sans text-label text-ink">{copy.send.form.to}</span>
            <div
              className="grid grid-cols-[32px_minmax(0,1fr)_44px] items-start gap-x-3 gap-y-1 rounded-sm border-2 border-line-strong bg-surface-sunken py-3.5 pr-2 pl-3.5"
              data-testid="recipient-resolved"
            >
              <ChainCharm chain={p.chain} size={32} />
              <span className="flex min-w-0 flex-col gap-1">
                <AddressDisplay address={resolved.normalized} />
                <span className="flex items-center gap-1.5 font-sans text-body-sm font-semibold text-success">
                  <Icon icon={Check} size={14} />
                  {copy.send.recipient.label(p.network)}
                </span>
              </span>
              <IconButton
                icon={X}
                label={copy.send.recipient.clear}
                className="-mt-2"
                onClick={() => {
                  p.setToText("");
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              />
              {resolved.tier === "warning" ? (
                <p className="col-span-2 col-start-2 flex items-start gap-1.5 font-sans text-body-sm text-ink">
                  <Icon icon={TriangleAlert} size={16} className="mt-0.5 text-danger" />
                  {resolved.message}
                </p>
              ) : null}
              <span role="status" className="sr-only">
                {copy.send.recipient.accepted(p.network)}
              </span>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="to" className="font-sans text-label text-ink">
              {copy.send.form.to}
            </label>
            <div className="relative">
              <TextInput
                id="to"
                ref={inputRef}
                mono
                value={p.toText}
                onChange={(e) => p.setToText(e.target.value)}
                placeholder={copy.send.form.placeholder[p.chain]}
                autoComplete="off"
                spellCheck={false}
                invalid={!!toError}
                aria-describedby={toError ? "to-error" : undefined}
                className="pr-26"
                data-testid="to"
              />
              <button
                type="button"
                className="absolute top-1 right-1 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3.5 font-sans text-[0.875rem] leading-5 font-semibold text-ink hover:bg-line"
                onClick={async () => {
                  try {
                    p.setToText(await navigator.clipboard.readText());
                  } catch {
                    /* clipboard blocked */
                  }
                }}
              >
                <Icon icon={ClipboardPaste} size={16} />
                {copy.send.form.paste}
              </button>
            </div>
            {toError ? (
              <p id="to-error" role="alert" className="flex items-start gap-1.5 font-sans text-body-sm text-danger" data-testid="to-error">
                <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                <span>{toError}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function ReviewStep(p: {
  tokenId: string;
  chain: Chain;
  prepared: PreparedSend | null;
  error: string | null;
  val: Validation | null;
  ack: boolean;
  setAck: (b: boolean) => void;
  onRetry: () => void;
  locked: boolean;
  solWait?: boolean;
  ticker: Ticker;
  network: string;
}) {
  const ticker = p.ticker;
  // C2: a USDC send's fee is ETH on the same network, shown on its own line
  const usdc = ticker === "USDC";
  const feeTicker = (usdc ? "ETH" : ticker) as Ticker;
  if (p.error) {
    return (
      <Banner
        icon={TriangleAlert}
        tone="danger"
        title={copy.send.form.feeError}
        role="alert"
        action={
          <Button icon={RefreshCw} onClick={p.onRetry}>
            {copy.send.form.retry}
          </Button>
        }
      >
        {/Can't build a safe/.test(p.error) ? copy.errors.E41 : p.error}
      </Banner>
    );
  }
  if (!p.prepared)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <p className="sr-only" role="status">
          {copy.send.form.estimating}
        </p>
        <div aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="h-10.5 w-56 rounded-sm" />
          <Skeleton line className="w-48" />
        </div>
        <Skeleton className="h-44 rounded-md" />
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton line className="w-full" />
          <Skeleton line className="w-4/5" />
          <Skeleton line className="w-3/5" />
        </div>
        {p.solWait ? (
          <p className="font-sans text-body-sm text-ink-muted" data-testid="sol-wait">
            {copy.sign.timeout.retry.sol}
          </p>
        ) : null}
      </div>
    );
  const pr = p.prepared;
  const amount = formatAmount(pr.amount, ticker);
  const fee = p.chain === "btc" ? formatSats(pr.fee) : formatAmount(pr.fee, feeTicker);
  // the NEAR fee line stays verbatim (kb/90 §8.9): the value, then its explanation on the next line
  const [nearValue, ...nearRest] = copy.send.review.near.split(" (");
  return (
    <>
      <div className="flex flex-col gap-4" data-testid="review-card" data-blockhash={pr.sol?.recentBlockhash} data-fetched-at={pr.sol?.fetchedAt}>
        <div className="flex flex-col gap-1">
          <h3 className="sr-only">{copy.send.review.label}</h3>
          <p className="font-display text-balance-hero-sm text-ink t-num" data-testid="review-amount">
            {amount}
          </p>
          <p className="font-sans text-body-sm text-ink-muted">{copy.send.review.sub(truncateAddress(pr.to), p.network)}</p>
        </div>
        <ul className="m-0 list-none rounded-md bg-surface-sunken p-0">
          <li className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3.5">
            <SatchelThumb />
            <span className="font-sans text-label text-ink">
              {copy.send.review.from}
              <small className="block text-caption font-normal text-ink-muted">{copy.card.name(p.tokenId)}</small>
            </span>
            <span className="text-right font-sans text-label font-bold whitespace-nowrap text-ink t-num">
              {formatAmount(usdc ? pr.amount : pr.amount + pr.fee, ticker, { sign: "out" })}
              <small className="block text-caption font-normal text-ink-muted">{usdc ? copy.usdc.gasNote(p.network) : copy.send.review.amountFee}</small>
            </span>
          </li>
          <li className="relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-line before:content-['']">
            <span className="grid place-items-center">
              <ChainCharm chain={p.chain} size={32} />
            </span>
            <span className="font-sans text-label text-ink">{copy.send.review.to}</span>
            <span className="text-right font-sans text-label font-bold whitespace-nowrap text-ink t-num">{formatAmount(pr.amount, ticker, { sign: "in" })}</span>
            <span className="col-span-2 col-start-2 flex flex-col gap-1.5">
              <AddressDisplay address={pr.to} />
              <span className="flex items-center gap-1.5 font-sans text-body-sm font-semibold text-success">
                <Icon icon={Check} size={14} />
                {copy.send.review.networkAddress(p.network)}
              </span>
            </span>
          </li>
        </ul>
        <dl className="m-0 flex flex-col gap-2.5 font-sans text-[0.9375rem] leading-5.5">
          <div className="flex justify-between gap-4">
            <dt className="whitespace-nowrap text-ink-muted">{copy.send.review.fee}</dt>
            <dd className="m-0 text-right text-ink t-num">
              ~{fee}
              <small className="block text-caption text-ink-muted">{usdc ? copy.usdc.feeIn : copy.send.review.feePaid}</small>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="whitespace-nowrap text-ink-muted">{usdc ? copy.usdc.after(p.tokenId) : copy.send.review.after(p.tokenId)}</dt>
            <dd className="m-0 text-right text-ink t-num">{formatAmount(pr.after < 0n ? 0n : pr.after, ticker)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="whitespace-nowrap text-ink-muted">{copy.send.review.nearFee}</dt>
            <dd className="m-0 max-w-[68%] text-right text-ink t-num">
              {nearValue}
              {nearRest.length ? (
                <>
                  {" "}
                  <small className="block text-caption text-ink-muted">({nearRest.join(" (")}</small>
                </>
              ) : null}
            </dd>
          </div>
        </dl>
        <p className="flex items-start gap-2 rounded-md bg-surface-sunken px-3 py-2.5 font-sans text-body-sm text-ink">
          <Icon icon={Hourglass} size={16} className="mt-0.5 text-frozen" />
          <span>
            {copy.send.review.timeSign}
            <br />
            {copy.send.review.timeChain[p.chain]}
          </span>
        </p>
        {pr.inputsCount > 1 ? <p className="font-sans text-body-sm text-ink-muted">{copy.send.review.inputs(pr.inputsCount)}</p> : null}
        {pr.chain === "sol" ? <p className="font-sans text-body-sm text-ink-muted">{copy.send.sol.fresh}</p> : null}
        {p.val?.tier === "warning" ? (
          <label className={cx("flex min-h-11 items-center gap-3 font-sans text-label text-ink", p.locked ? "cursor-not-allowed" : "cursor-pointer")}>
            <input type="checkbox" checked={p.ack} disabled={p.locked} onChange={(e) => p.setAck(e.target.checked)} className="size-5.5 flex-none accent-(--ink)" />
            {copy.send.review.ack}
          </label>
        ) : null}
      </div>
      <details className="group rounded-md border border-line bg-surface">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-4 font-sans text-label text-ink [&::-webkit-details-marker]:hidden">
          {copy.send.review.nearAbout}
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" className="text-ink-muted transition-transform duration-150 group-open:rotate-180">
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <p className="px-4 pb-4 font-sans text-body-sm text-ink">{copy.send.review.nearTip}</p>
      </details>
    </>
  );
}
