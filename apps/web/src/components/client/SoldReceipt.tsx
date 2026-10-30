"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Landmark, LoaderCircle, TriangleAlert } from "lucide-react";
import { markSimUsdcRegistered, usdcRegistered } from "@/components/client/fixture-switches";
import { Handoff, Receipt } from "@/components/client/Handoff";
import { announce, toast } from "@/components/client/Toaster";
import type { Overview } from "@/lib/overview";
import { Banner, Button, ExternalLink, Icon, Morph, cx } from "@/components/ui";
import { copy, errorCopy } from "@/lib/copy";
import { EXPLORERS, USDC_CONTRACT } from "@/lib/config";
import { loadSale, proceedsOf, type SaleReceipt } from "@/lib/data/sale";
import { dataSource } from "@/lib/data/source";
import { truncateMiddle } from "@/lib/format";
import { seenSaleKey } from "@/lib/motion/handoff";
import { calls } from "@/lib/near/contract";
import type { Currency, ProceedsView } from "@/lib/near/types";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { priceText } from "@/lib/view";

/**
 * The seller after a sale (app-screens §5.4; spec §5.12): the hand-off's end frame in the object column (X's `Handoff`
 * `sold` variant: the swing plays once per device per sale), the sentence "You sold Satchel #N to B for p.", the payout
 * line, the escrow (Withdraw, or Register for USDC first) and the receipt. The escrow amount always comes from
 * `proceeds_of` (state), never from the event: state wins.
 *
 * `EscrowPanel` and `useProceeds` are imported by H's /satchels too: keep their exports and props stable.
 */

/* ── Small shared helpers ───────────────────────────────────────────────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 26, 09:16 UTC" (receipts; client-only, so no locale or hydration concerns). */
export function shortStamp(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** A NEAR transaction as a receipt value: the explorer link (mono) and when it happened. */
export function TxValue({ hash, at }: { hash: string | null; at: number | null }) {
  if (!hash) return <span>—</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <ExternalLink href={EXPLORERS.nearTx(hash)} className="font-mono">
        {truncateMiddle(hash, 6, 4)}
      </ExternalLink>
      {at ? <span className="font-sans text-ink-muted">· {shortStamp(at)}</span> : null}
    </span>
  );
}

/**
 * Whether `accountId` can receive USDC (`storage_balance_of` on the USDC contract), and the Register action
 * (`storage_deposit`, 0.00125 NEAR) through the wallet. `registered` is true for NEAR (nothing to register), null while
 * unknown.
 */
export function useUsdcRegistration(currency: Currency, accountId: string | null) {
  const { wallet } = useWallet();
  const [reg, setReg] = useState<boolean | null>(null);
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<"idle" | "wallet" | "registering">("idle");
  const [error, setError] = useState<{ cancelled: boolean; text: string } | null>(null);
  useEffect(() => {
    if (currency !== "usdc" || !accountId) return;
    let alive = true;
    const src = dataSource();
    src
      .view<{ total: string } | null>(USDC_CONTRACT, "storage_balance_of", { account_id: accountId })
      .then((v) => alive && setReg(usdcRegistered(v)))
      .catch(() => alive && setReg(null));
    return () => {
      alive = false;
    };
  }, [currency, accountId, n]);
  const register = useCallback(() => {
    if (!wallet || !accountId || phase !== "idle") return;
    setError(null);
    runCall(wallet, calls.usdcRegister(accountId), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "registering")).then((r) => {
      setPhase("idle");
      if (!r.ok) setError({ cancelled: "cancelled" in r, text: "cancelled" in r ? copy.sell.cancelled : errorCopy(r.failure.code, { id: "" }) });
      else {
        markSimUsdcRegistered();
        setN((x) => x + 1);
      }
    });
  }, [wallet, accountId, phase]);
  return { registered: currency === "usdc" ? reg : true, register, phase, error };
}

/* ── The Sold view ──────────────────────────────────────────────────────────────────────────────────────────────── */

type PaidState = keyof typeof copy.sell.sold.paid;

export function SoldReceipt({ sale, accountId, contents }: { sale: SaleReceipt; accountId: string; contents: Overview }) {
  const price = priceText(sale.price, sale.currency);
  const { owed, reload } = useProceeds(accountId);
  const waiting = owed?.find((p) => p.currency === sale.currency) ?? null;
  const onceKey = seenSaleKey(sale.tokenId, sale.listingId);
  // the first look at this sale (on this device) plays the swing, takes focus and is announced; a revisit is quiet
  const [first] = useState(() => {
    try {
      return window.localStorage.getItem(onceKey) === null;
    } catch {
      return true;
    }
  });
  // A payout event not indexed yet: look again a few times (it lands ≈ 2 blocks after the sale).
  useEffect(() => {
    if (sale.payout !== "pending") return;
    let k = 0;
    const t = setInterval(() => {
      k += 1;
      void loadSale(sale.tokenId, accountId, `pending:${k}`);
      reload();
      if (k >= 6) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [sale.payout, sale.tokenId, accountId, reload]);

  // State wins over the event: owed now ⇒ escrow; the event said escrow but nothing is owed ⇒ withdrawn since.
  const paidState: PaidState = waiting ? "escrow" : sale.payout === "escrow" ? (owed ? "withdrawn" : "pending") : sale.payout;
  const line = waiting ? null : paidState === "paid" || paidState === "withdrawn" ? copy.sell.sold.arrived(price) : paidState === "pending" ? copy.sell.sold.paying(price) : null;
  // proto sold-*: from 1024 the hand-off's stage is the object column and the sentence, the payout line, the escrow and
  // the receipt are the main column under the tabs (Handoff `split`); below 1024, one column. The receipt fades in with
  // the sentence when the swing plays (motion-spec §2, `[data-after]`).
  return (
    <div className="contents" data-testid="sold-receipt" data-payout={paidState}>
      <Handoff
        split
        variant="sold"
        tokenId={sale.tokenId}
        from={accountId}
        to={sale.buyer}
        contents={contents}
        onceKey={onceKey}
        focus={first}
        live={first ? copy.sell.sold.live(sale.tokenId, sale.buyer, price) : undefined}
        sentence={copy.sell.sold.title(sale.tokenId, sale.buyer, price)}
        sentenceAs="h2"
        sentenceSize="lg"
        sentenceId={`sold-title-${sale.tokenId}`}
        sub={line}
      >
        {owed?.length ? <EscrowPanel owed={owed} accountId={accountId} onChange={reload} size="lg" /> : null}
        <Receipt
          data-testid="sold-rows"
          rows={[
            { label: copy.sell.sold.receipt.price, value: <span className="t-num">{price}</span> },
            { label: copy.sell.sold.receipt.buyer, value: sale.buyer, mono: true },
            { label: copy.sell.sold.receipt.paid, value: copy.sell.sold.paid[paidState], testId: "sold-paid" },
            { label: copy.sell.sold.receipt.listing, value: `#${sale.listingId}` },
            { label: copy.sell.sold.receipt.tx, value: <TxValue hash={sale.tx} at={sale.timestampMs} /> },
          ]}
        />
      </Handoff>
    </div>
  );
}

/** proceeds_of(account), re-read on demand. `null` while loading or when the view failed. */
export function useProceeds(accountId: string | null) {
  const [owed, setOwed] = useState<ProceedsView[] | null>(null);
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    proceedsOf(accountId)
      .then((r) => alive && setOwed(r))
      .catch(() => alive && setOwed(null));
    return () => {
      alive = false;
    };
  }, [accountId, n]);
  return { owed: accountId ? owed : null, reload };
}

const POLL_MS = 1500;

/**
 * Escrow (spec §5.12; INV-25; proto `sold-escrow*`): one banner per currency owed, "{amount} is waiting for you." + why
 * + Withdraw (the page's primary). An unregistered USDC account registers first (0.00125 NEAR).
 */
export function EscrowPanel({ owed, accountId, onChange, size = "md" }: { owed: ProceedsView[]; accountId: string; onChange: () => void; size?: "md" | "lg" }) {
  // unique ids: this panel shows on /satchels and on a Sold tab, and Next keeps a previous route's DOM (hidden)
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3" data-testid="escrow">
      <h2 id={titleId} className="sr-only">
        {copy.sell.escrow.title}
      </h2>
      {owed.map((p) => (
        <EscrowRow key={p.currency} row={p} accountId={accountId} onChange={onChange} size={size} />
      ))}
    </section>
  );
}

/** Withdraw is md on /satchels and lg on the Sold receipt (proto app-misc `satchels-escrow`, app-sale `sold-escrow`). */
function EscrowRow({ row, accountId, onChange, size }: { row: ProceedsView; accountId: string; onChange: () => void; size: "md" | "lg" }) {
  const { wallet } = useWallet();
  const uid = useId();
  const bannerId = `escrow-${row.currency}${uid}`;
  const amount = priceText(row.amount, row.currency);
  const [phase, setPhase] = useState<"idle" | "wallet" | "doing">("idle");
  const [msg, setMsg] = useState<{ cancelled: boolean; text: string } | null>(null);
  const usdc = useUsdcRegistration(row.currency, accountId);
  const needsReg = row.currency === "usdc" && usdc.registered === false;

  const withdraw = () => {
    if (!wallet || phase !== "idle") return;
    setMsg(null);
    const before = BigInt(row.amount);
    runCall(wallet, calls.withdrawProceeds(row.currency), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "doing")).then(async (r) => {
      if (!r.ok) {
        setPhase("idle");
        setMsg({ cancelled: "cancelled" in r, text: "cancelled" in r ? copy.sell.cancelled : errorCopy(r.failure.code, { id: "" }) });
        if (!("cancelled" in r) && r.failure.code === "ERR_NOTHING_OWED") onChange();
        return;
      }
      // The tx result is the payout chain; on_payout re-credits proceeds if the transfer failed again (spec §5.7).
      const left = await owedAfter(accountId, row.currency, before);
      setPhase("idle");
      if (left > 0n) {
        setMsg({ cancelled: false, text: copy.sell.escrow.again(priceText(left.toString(), row.currency)) });
      } else {
        toast(copy.sell.escrow.doneShort(amount));
        announce(copy.sell.escrow.done(amount));
      }
      onChange();
    });
  };

  const busy = phase !== "idle" || usdc.phase !== "idle";
  const value = phase === "wallet" || usdc.phase === "wallet" ? "wallet" : phase === "doing" ? "doing" : usdc.phase === "registering" ? "registering" : needsReg ? "register" : "withdraw";
  const note = msg ?? usdc.error;
  return (
    <Banner
      icon={Landmark}
      tone="neutral"
      title={copy.sell.escrow.waiting(amount)}
      id={bannerId}
      action={
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="primary"
            size={size}
            loading={busy}
            spinner="none"
            disabled={!wallet}
            aria-label={busy ? undefined : needsReg ? copy.sell.usdc.registerAria : copy.sell.escrow.withdrawAria(amount)}
            onClick={needsReg ? usdc.register : withdraw}
            data-testid={`withdraw-${row.currency}`}
          >
            {/* only this row's labels share the cell (Morph keeps the widest), so the button fits the banner at 390 */}
            {needsReg || usdc.phase !== "idle" ? (
              <Morph
                value={value === "wallet" ? "wallet" : value === "registering" ? "registering" : "register"}
                labels={{
                  register: copy.sell.escrow.register,
                  wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
                  registering: { label: copy.sell.escrow.registering, icon: LoaderCircle, spin: true },
                }}
              />
            ) : (
              <Morph
                value={value === "wallet" ? "wallet" : value === "doing" ? "doing" : "withdraw"}
                labels={{
                  withdraw: copy.sell.escrow.withdraw,
                  wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
                  doing: { label: copy.sell.escrow.withdrawing, icon: LoaderCircle, spin: true },
                }}
              />
            )}
          </Button>
          {phase === "wallet" || usdc.phase === "wallet" ? <p className="font-sans text-body-sm text-ink-muted">{copy.buy.walletHint}</p> : null}
          {note ? (
            <p role={note.cancelled ? "status" : "alert"} className={cx("flex items-start gap-2 font-sans text-body-sm", note.cancelled ? "text-ink" : "text-danger")} data-testid="escrow-message">
              {note.cancelled ? null : <Icon icon={TriangleAlert} size={16} className="mt-0.5" />}
              <span>{note.text}</span>
            </p>
          ) : null}
        </div>
      }
    >
      <p>{copy.sell.escrow.why}</p>
      {needsReg ? <p className="mt-1 font-sans text-body-sm text-ink-muted">{copy.sell.escrow.usdcFirst}</p> : null}
    </Banner>
  );
}

/** Re-read proceeds until it moves off `before` (views lag the tx by a block or two); returns what is still owed. */
async function owedAfter(accountId: string, currency: Currency, before: bigint): Promise<bigint> {
  let left = before;
  for (let i = 0; i < 4; i++) {
    const rows = await proceedsOf(accountId).catch(() => null);
    if (rows) {
      left = BigInt(rows.find((r) => r.currency === currency)?.amount ?? "0");
      if (left !== before) return left;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return left;
}
