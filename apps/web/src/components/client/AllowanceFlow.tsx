"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Info, LoaderCircle, Lock, TriangleAlert, Wallet } from "lucide-react";
import { ChainCharm } from "@/components/brand/ChainCharm";
import { ConnectButton } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { useViewer } from "@/components/client/SatchelPage";
import { toast } from "@/components/client/Toaster";
import { Avatar, Button, Icon, Morph, Segmented, TextInput, cx } from "@/components/ui";
import { CHAIN_ASSET } from "@/lib/allowanceView";
import { copy, TICKER } from "@/lib/copy";
import { MPC_CONTRACT, SATCHEL_CONTRACT } from "@/lib/config";
import { refreshSnapshot } from "@/lib/data/client";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { DECIMALS, parseUnits, truncateMiddle } from "@/lib/format";
import { calls, contractViews } from "@/lib/near/contract";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";
import { validateNearAccount, type Validation } from "@/lib/validate";
import { UI_CHAINS, type UiChain } from "@/lib/view";

/**
 * The Add sheet (/s/[id]/allowance; docs/specs/C5.md §1): Who → Limits (the daily caps + an expiry) → the wallet.
 * Owner only, blocked past MAX_DELEGATES (4 live, non-expired rows). No ERC-20/USDC cap yet (the Send flow doesn't
 * support C2 sends either) and no second EVM chain (C3's web UI comes in a later phase); both already extend the
 * contract's `Asset` enum without a shape change, so this sheet only needs new rows then.
 */

const MAX_DELEGATES = 4;
type Phase = "who" | "caps" | "wallet" | "adding";
type Expiry = "24h" | "7d" | "30d" | "never";
const EXPIRY_MS: Record<Expiry, number | null> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000, never: null };
/** The wall clock, read only from event handlers (never during render). */
const wallClock = () => Date.now();

export function AllowanceFlow({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner, accountId } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const router = useRouter();
  const id = snap.token_id;
  const closeHref = `/s/${id}`;

  const [text, setText] = useState("");
  const val: Validation | null = useMemo(() => (text.trim() ? validateNearAccount(text, { self: accountId, contract: SATCHEL_CONTRACT, mpc: MPC_CONTRACT }) : null), [text, accountId]);
  const target = val && val.tier !== "error" ? val.normalized : "";
  const [lookup, setLookup] = useState<{ for: string; ok: boolean; owns: number } | null>(null);
  const exists = !target ? { checking: false, ok: null, owns: 0 } : lookup?.for === target ? { checking: false, ok: lookup.ok as boolean | null, owns: lookup.owns } : { checking: true, ok: null, owns: 0 };

  const [caps, setCaps] = useState<Record<UiChain, { on: boolean; text: string }>>(() => Object.fromEntries(UI_CHAINS.map((c) => [c, { on: false, text: "" }])) as Record<UiChain, { on: boolean; text: string }>);
  const [expiry, setExpiry] = useState<Expiry>("never");
  const [phase, setPhase] = useState<Phase>("who");
  const [note, setNote] = useState<{ kind: "cancelled" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    const t = setTimeout(async () => {
      const src = dataSource();
      const ok = await src.accountExists(target);
      const owns = ok ? await contractViews(src.view).nftSupplyForOwner(target).catch(() => 0) : 0;
      if (alive) setLookup({ for: target, ok, owns });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [target]);

  const atLimit = live.allowances.length >= MAX_DELEGATES;
  const canReview = !!target && exists.ok === true && !atLimit;
  const busy = phase === "wallet" || phase === "adding";

  const capRows = UI_CHAINS.map((chain) => {
    const ticker = TICKER[chain];
    const decimals = DECIMALS[ticker];
    const row = caps[chain];
    const amount = row.on && row.text.trim() ? parseUnits(row.text, decimals) : null;
    const invalid = row.on && row.text.trim() !== "" && amount === null;
    return { chain, ticker, decimals, row, amount, invalid };
  });
  const anyOn = capRows.some((r) => r.row.on);
  const capsValid = anyOn && capRows.every((r) => !r.row.on || (r.amount !== null && r.amount > 0n));
  const canAdd = capsValid && phase === "caps";

  const onAdd = () => {
    if (!canAdd || !wallet || !accountId || !target) return;
    setNote(null);
    const capInputs = capRows.filter((r) => r.row.on && r.amount !== null).map((r) => ({ asset: CHAIN_ASSET[r.chain], limit: r.amount! }));
    const expiresAtMs = EXPIRY_MS[expiry] === null ? undefined : wallClock() + EXPIRY_MS[expiry]!;
    runCall(wallet, calls.setAllowance(id, target, capInputs, expiresAtMs), accountId, (s) => setPhase(s === "wallet" ? "wallet" : "adding")).then((r) => {
      if (r.ok) {
        toast(copy.allowance.add.addedToast(target));
        refreshSnapshot(id);
        router.replace(closeHref);
        return;
      }
      setPhase("caps");
      if ("cancelled" in r) setNote({ kind: "cancelled", text: copy.allowance.add.cancelled });
      else setNote({ kind: "error", text: copy.allowance.err[r.failure.code as keyof typeof copy.allowance.err] ?? r.failure.message });
    });
  };

  let title = copy.allowance.add.title;
  let meta: string | undefined;
  let body: ReactNode;
  let action: ReactNode = null;
  let guarded = false;

  if (ready && !accountId) {
    guarded = true;
    body = (
      <Guard icon={Wallet} title={copy.send.guard.connectTitle} body={copy.xfer.guard.connectBody(id)}>
        <ConnectButton size="lg" />
      </Guard>
    );
  } else if (ready && accountId && !isOwner) {
    guarded = true;
    body = (
      <Guard icon={Lock} title={copy.send.guard.notOwnerTitle(id)} body={copy.xfer.guard.notOwnerBody(accountId, live.owner)}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (atLimit && phase === "who") {
    guarded = true;
    body = (
      <Guard icon={Info} title={copy.allowance.manage.title} body={copy.allowance.manage.limitReached}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (phase === "who") {
    meta = `${copy.app.step(1, 2)} · ${copy.allowance.add.stepWho}`;
    const err = val?.tier === "error" ? val.message : exists.ok === false ? copy.allowance.add.err.missing(target) : null;
    body = (
      <>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="allowance-to" className="font-sans text-label text-ink">
            {copy.allowance.add.to}
          </label>
          <TextInput
            id="allowance-to"
            mono
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.allowance.add.placeholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            invalid={!!err}
            aria-describedby="allowance-to-status"
            data-testid="allowance-to"
          />
          <div id="allowance-to-status" aria-live="polite" className="flex flex-col gap-2 font-sans text-body-sm">
            {!text.trim() ? (
              <p className="text-ink-muted">{copy.allowance.add.help}</p>
            ) : err ? (
              <p className="flex items-start gap-1.5 text-danger" data-testid="allowance-to-error">
                <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
                <span className="min-w-0 wrap-anywhere">{err}</span>
              </p>
            ) : exists.checking ? (
              <p className="flex min-h-5 items-center gap-2 text-ink-muted">
                <Icon icon={LoaderCircle} size={16} spin />
                {copy.allowance.add.checking}
              </p>
            ) : exists.ok && target ? (
              <div className="flex items-center gap-3 rounded-md bg-surface-sunken px-3.5 py-3" data-testid="allowance-recipient-card">
                <Avatar account={target} size={40} />
                <span className="flex min-w-0 flex-col">
                  <b className="font-mono text-[0.9375rem] leading-5 font-[450] wrap-anywhere text-ink">{val?.tier === "warning" ? truncateMiddle(target, 8, 5) : target}</b>
                  <span className="text-ink-muted">{copy.allowance.add.found(exists.owns)}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </>
    );
    action = (
      <Button variant="primary" size="lg" block disabled={!canReview} aria-describedby="allowance-to-status" onClick={() => canReview && setPhase("caps")} data-testid="allowance-review">
        {copy.allowance.add.review}
      </Button>
    );
  } else {
    title = copy.allowance.add.title;
    meta = `${copy.app.step(2, 2)} · ${copy.allowance.add.stepCaps}`;
    body = (
      <>
        <div className="flex items-center gap-3 rounded-md bg-surface-sunken px-3.5 py-3">
          <Avatar account={target} size={32} />
          <span className="min-w-0 truncate font-mono text-[0.9375rem] leading-5 font-[450]">{target}</span>
        </div>
        <section aria-labelledby="allowance-caps-title" className="flex flex-col gap-2.5">
          <h3 id="allowance-caps-title" className="m-0 font-sans text-label text-ink">
            {copy.allowance.add.capsTitle}
          </h3>
          <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.add.capsHelp}</p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {capRows.map(({ chain, ticker, row, invalid }) => (
              <li key={chain} className="flex flex-col gap-2 rounded-md border border-line p-3.5">
                <label className="flex items-center gap-2.5 font-sans text-[0.9375rem]/5 font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={row.on}
                    onChange={(e) => setCaps((c) => ({ ...c, [chain]: { ...c[chain], on: e.target.checked } }))}
                    className="size-5 accent-sticker"
                    data-testid={`allowance-cap-${chain}`}
                  />
                  <ChainCharm chain={chain} size={20} />
                  {ticker}
                </label>
                {row.on ? (
                  <TextInput
                    inputMode="decimal"
                    value={row.text}
                    onChange={(e) => setCaps((c) => ({ ...c, [chain]: { ...c[chain], text: e.target.value.replace(",", ".") } }))}
                    aria-label={copy.allowance.add.capAmountIn(ticker)}
                    placeholder="0"
                    invalid={invalid}
                    data-testid={`allowance-cap-${chain}-amount`}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {!anyOn && phase === "caps" ? (
            <p className="m-0 flex items-start gap-1.5 font-sans text-body-sm text-ink-muted">
              <Icon icon={Info} size={16} className="mt-0.5" />
              {copy.allowance.add.needCap}
            </p>
          ) : null}
        </section>
        <section aria-labelledby="allowance-expiry-title" className="flex flex-col gap-2.5">
          <h3 id="allowance-expiry-title" className="m-0 font-sans text-label text-ink">
            {copy.allowance.add.expiryTitle}
          </h3>
          <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.add.expiryHelp}</p>
          <Segmented
            size="sm"
            label={copy.allowance.add.expiryTitle}
            value={expiry}
            onChange={setExpiry}
            options={(Object.keys(EXPIRY_MS) as Expiry[]).map((v) => ({ value: v, label: copy.allowance.add.expiryOptions[v] }))}
          />
        </section>
        <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.allowance.manage.trustNote}</p>
      </>
    );
    action = (
      <>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!canAdd && !busy}
          loading={busy}
          spinner="none"
          onClick={onAdd}
          data-testid="allowance-submit"
        >
          <Morph
            value={phase === "wallet" ? "wallet" : phase === "adding" ? "adding" : "idle"}
            labels={{
              idle: copy.allowance.add.cta(truncateMiddle(target, 10, 6)),
              wallet: { label: copy.sign.wallet, icon: LoaderCircle, spin: true },
              adding: { label: copy.allowance.add.adding, icon: LoaderCircle, spin: true },
            }}
          />
        </Button>
        {note ? (
          <p role={note.kind === "error" ? "alert" : undefined} className={cx("mt-2.5 flex items-start gap-2 font-sans text-body-sm", note.kind === "error" ? "text-danger" : "text-ink")} data-testid="allowance-note">
            <Icon icon={note.kind === "error" ? TriangleAlert : Info} size={16} className="mt-0.5" />
            <span>{note.text}</span>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <FlowShell title={title} meta={meta} fill={!guarded} closeHref={closeHref} action={action} testId="allowance-flow">
      {body}
    </FlowShell>
  );
}

function Guard({ icon, title, body, children }: { icon: typeof Wallet; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center" data-testid="allowance-guard">
      <span className="mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken text-ink">
        <Icon icon={icon} size={28} />
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
