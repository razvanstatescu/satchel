"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, CircleCheck, Info, LoaderCircle, TriangleAlert, Undo2, Wallet } from "lucide-react";
import { ChainCharms, Sparkle } from "@/components/brand";
import { SatchelCard, type CardChip } from "@/components/SatchelCard";
import { Button, ExternalLink, Icon, Morph, Tracker, cx, type TrackerState } from "@/components/ui";
import { useConnect } from "@/components/client/ConnectButton";
import { FlowShell } from "@/components/client/FlowShell";
import { announce, toast } from "@/components/client/Toaster";
import { copy, errorCopy, TICKER } from "@/lib/copy";
import { EXPLORERS, FAUCETS, SATCHEL_CONTRACT, SOL_UI_ENABLED } from "@/lib/config";
import { dataSource } from "@/lib/data/source";
import { truncateMiddle } from "@/lib/format";
import { readMotionMode } from "@/lib/motion-flag";
import { EASE, play, stickOnTracks, type Frame, type MotionHandle, type Track } from "@/lib/motion/play";
import { calls, contractViews } from "@/lib/near/contract";
import { listOwnerTokens } from "@/lib/near/owner-tokens";
import { runCall } from "@/lib/near/run-call";
import { useWallet } from "@/lib/near/wallet";

/**
 * Mint (app-screens §10; proto/app-mint.html), a flow route presented in the FlowShell over My Satchels.
 * - Ready: the preview card ("New Satchel", the New sticker, one "… address" row per chain, no pill), You get, the
 *   deposit, and **Mint a Satchel** (or **Connect NEAR wallet** + a hint when signed out).
 * - Approve in your wallet → Minting on NEAR → Minted: the tracker (honest milestones from chain state, runCall).
 * - Done: the new card with Yours, "Satchel #8 is yours." and the tx; **Add coins** + **Open Satchel #8**. The first
 *   mint of an account also hangs the chain charms over the card and swings them once.
 * - Errors: your own cancel is a neutral note; E6 (not enough NEAR) says so with "Get testnet NEAR"; nothing is a toast
 *   while this screen is open (the status region announces). A mint that lands after you closed the sheet toasts.
 * - Close returns to `?from=` (default: /satchels when connected, / when not).
 * Test ids: `mint-flow`, `mint-cta`, `mint-done`; the preview is `figure[data-card=preview][data-owned=true]`.
 */

type Phase = "ready" | "wallet" | "minting" | "done";
type Note = { kind: "cancelled" } | { kind: "error"; text: string; getNear: boolean };

const CHAINS = SOL_UI_ENABLED ? (["btc", "evm", "sol"] as const) : (["btc", "evm"] as const);
const chips = (amount: string | null): CardChip[] => CHAINS.map((c) => ({ chain: c, ticker: TICKER[c], amount }));

/** A damped swing about 0° (motion-spec §7): `n` extremes from `amp`, each `ratio` of the last, `halfMs` apart. */
export function swingFrames(t0: number, amp: number, halfMs = 420, ratio = 0.62, n = 5): Frame[] {
  const fr: Frame[] = [[t0, "0deg", EASE.swing]];
  let a = amp;
  let t = t0 + halfMs / 2;
  for (let i = 0; i < n; i++) {
    fr.push([Math.round(t), `${a.toFixed(2)}deg`, i === n - 1 ? EASE.out : EASE.swing]);
    t += halfMs;
    a = -a * ratio;
  }
  fr.push([Math.round(t - halfMs / 2), "0deg"]);
  return fr;
}

const SWING_AMPS = [9, 7.5, 8.5];

/**
 * The chain charms on their strap swing once when they come into view (60 % visible) and nudge when the pointer
 * brushes one (motion-spec §7). Each coin swings about the top of its stem. Never a loop; nothing under reduced motion.
 * `root` holds a `ChainCharms` SVG.
 */
export function useCharmSwing(root: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const svg = root.current?.querySelector("svg");
    if (!enabled || !svg || readMotionMode() === "reduce" || typeof IntersectionObserver !== "function") return;
    const coins = Array.from(svg.querySelectorAll<SVGGElement>(":scope > g"));
    for (const g of coins) {
      g.style.transformBox = "fill-box";
      g.style.transformOrigin = "50% 0";
    }
    const busy = new WeakMap<Element, number>();
    const handles: MotionHandle[] = [];
    const swing = (g: SVGGElement, amp: number, delay: number) => {
      if ((busy.get(g) ?? 0) > performance.now()) return; // never restart mid-swing
      const frames = swingFrames(delay, amp);
      const T = frames[frames.length - 1][0];
      busy.set(g, performance.now() + T - 420);
      handles.push(play([{ el: g, prop: "rotate", frames } as Track<Element>], T));
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.6)) return;
        io.disconnect();
        coins.forEach((g, i) => swing(g, SWING_AMPS[i % SWING_AMPS.length], i * 90));
      },
      { threshold: [0.6] },
    );
    io.observe(svg);
    const brushes = coins.map((g) => {
      const onEnter = (e: PointerEvent) => swing(g, e.movementX < 0 ? -5 : 5, 0);
      g.addEventListener("pointerenter", onEnter);
      return () => g.removeEventListener("pointerenter", onEnter);
    });
    return () => {
      io.disconnect();
      brushes.forEach((off) => off());
      handles.forEach((h) => h.cancel());
    };
  }, [root, enabled]);
}

/**
 * The mint's arrival (motion-spec §8): the card drops into its shadow (16 px up, 1.04×, lands 2 px in at 240 ms, rests
 * at 360), its charms stick on at 420 and 540 ms (turning −18° / +18°), Yours at 720, the line at 900. Reduced: the card
 * fades in and the stickers fade in 60 ms apart.
 */
function playMintArrival(stage: HTMLElement, line: HTMLElement | null): MotionHandle {
  const card = stage.querySelector("figure");
  const coins = Array.from(stage.querySelectorAll("figure li[data-chain] > svg"));
  const yours = stage.querySelector("[data-yours]");
  if (readMotionMode() === "reduce") {
    const fade = (el: Element | null, at: number): Track<Element> => ({ el, prop: "opacity", frames: [[0, 0], [at, 0, EASE.out], [at + 150, 1]] });
    return play([{ el: card, prop: "opacity", frames: [[0, 0, EASE.out], [200, 1]] }, ...coins.map((c, i) => fade(c, 260 + i * 60)), fade(yours, 400), fade(line, 500)], 650);
  }
  const tracks: Track<Element>[] = [
    { el: card, prop: "translate", frames: [[0, "0 -16px", EASE.fall], [240, "0 2px", EASE.out], [360, "0 0"]] },
    { el: card, prop: "opacity", frames: [[0, 0, EASE.out], [100, 1]] },
    { el: card, prop: "scale", frames: [[0, "1.04", EASE.fall], [240, "1"]] },
    ...coins.flatMap((c, i) => stickOnTracks<Element>(c, 420 + i * 120, { from: 1.7, turn: i % 2 ? 18 : -18 })),
    ...stickOnTracks<Element>(yours, 720),
    { el: line, prop: "opacity", frames: [[0, 0], [900, 0, EASE.out], [1120, 1]] },
    { el: line, prop: "translate", frames: [[0, "0 6px"], [900, "0 6px", EASE.out], [1120, "0 0"]] },
  ];
  return play(tracks, 1500);
}

function FootNote({ tone, icon, children, id, role }: { tone: "muted" | "neutral" | "danger"; icon: typeof Info; children: React.ReactNode; id?: string; role?: "status" | "alert" }) {
  return (
    <p id={id} role={role} className={cx("m-0 flex items-start gap-2 font-sans text-body-sm", tone === "danger" ? "text-danger" : tone === "neutral" ? "text-ink" : "text-ink-muted")}>
      <Icon icon={icon} size={16} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

export function MintFlow({ from }: { from: string | null }) {
  const { accountId, wallet } = useWallet();
  const { connect, connecting } = useConnect();
  const [phase, setPhase] = useState<Phase>("ready");
  const [note, setNote] = useState<Note | null>(null);
  const [minted, setMinted] = useState<{ id: string; hash: string | null; first: boolean } | null>(null);
  const mounted = useRef(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const charmsRef = useRef<HTMLDivElement>(null);
  const noteId = useId();
  const youGetId = useId();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const closeHref = from ?? (accountId ? "/satchels" : "/");
  const busy = phase === "wallet" || phase === "minting";

  const onMint = () => {
    if (!accountId || !wallet) {
      connect();
      return;
    }
    if (phase !== "ready") return;
    setNote(null);
    setPhase("wallet");
    void runCall(wallet, calls.nftMint(accountId), accountId, (s) => mounted.current && setPhase(s === "wallet" ? "wallet" : "minting")).then(async (r) => {
      if (r.ok) {
        // the new id: from the tx value, else the newest token the minter owns (chain state, never the wallet's word)
        const views = contractViews(dataSource().view, SATCHEL_CONTRACT);
        const v = r.value as { token_id?: string } | null;
        let id = v?.token_id ?? null;
        if (!id) {
          const mine = await listOwnerTokens(views, accountId).catch(() => null);
          id = mine?.tokens.at(-1)?.token_id ?? null; // sorted ascending by numeric id: the newest is last
        }
        if (id) {
          const first = (await views.nftSupplyForOwner(accountId).catch(() => 0)) === 1;
          if (!mounted.current) {
            toast(copy.mint.toast(id)); // the sheet was closed while it minted
            return;
          }
          setMinted({ id, hash: r.hash, first });
          setPhase("done");
          announce(copy.mint.done(id));
          return;
        }
        if (mounted.current) setNote({ kind: "error", text: copy.mint.unconfirmed, getNear: false });
      } else if ("cancelled" in r) {
        if (mounted.current) setNote({ kind: "cancelled" });
      } else if (mounted.current) {
        const code = r.failure.code;
        const text = code === "UNKNOWN" ? (r.hash ? copy.mint.unconfirmed : copy.mint.failed) : errorCopy(code, { id: "" });
        setNote({ kind: "error", text, getNear: code === "ERR_DEPOSIT" || code === "NOT_ENOUGH_BALANCE" });
      }
      if (mounted.current) setPhase("ready");
    });
  };

  // the arrival plays once, when the done frame mounts; focus then moves to its sentence
  useLayoutEffect(() => {
    if (phase !== "done" || !stageRef.current) return;
    const h = playMintArrival(stageRef.current, lineRef.current);
    doneRef.current?.focus();
    return () => h.cancel();
  }, [phase]);
  useCharmSwing(charmsRef, phase === "done" && !!minted?.first);

  const steps: { label: string; state: TrackerState }[] = [
    { label: phase === "wallet" ? copy.mint.steps.approve : copy.mint.steps.approved, state: phase === "wallet" ? "active" : "done" },
    { label: copy.mint.steps.doing, state: phase === "minting" ? "active" : phase === "done" ? "done" : "future" },
    { label: copy.mint.steps.done, state: phase === "done" ? "done" : "future" },
  ];

  const action =
    phase === "done" && minted ? (
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" block icon={ArrowDown} href={`/s/${minted.id}/receive`}>
          {copy.mint.fund}
        </Button>
        <Button size="lg" block href={`/s/${minted.id}`}>
          {copy.mint.open(minted.id)}
        </Button>
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        {accountId ? (
          <Button variant="primary" size="lg" block loading={busy} spinner="none" onClick={onMint} data-testid="mint-cta" aria-describedby={note || busy ? noteId : undefined}>
            <Morph
              value={phase === "done" ? "ready" : phase}
              labels={{
                ready: copy.mint.cta,
                wallet: { label: copy.mint.approving, icon: LoaderCircle, spin: true },
                minting: { label: copy.mint.minting, icon: LoaderCircle, spin: true },
              }}
            />
          </Button>
        ) : (
          <Button variant="primary" size="lg" block icon={Wallet} loading={connecting} onClick={connect} data-testid="mint-cta" aria-describedby={noteId}>
            {connecting ? copy.nav.connecting : copy.mint.connect}
          </Button>
        )}
        {!accountId ? (
          <FootNote id={noteId} tone="muted" icon={Info}>
            {copy.mint.walletHint}
          </FootNote>
        ) : phase === "wallet" ? (
          <FootNote id={noteId} tone="muted" icon={Info}>
            {copy.mint.walletNote}
          </FootNote>
        ) : note?.kind === "cancelled" ? (
          <FootNote id={noteId} tone="neutral" icon={Undo2} role="status">
            {copy.mint.cancelled}
          </FootNote>
        ) : note?.kind === "error" ? (
          <FootNote id={noteId} tone="danger" icon={TriangleAlert} role="alert">
            {note.text}
            {note.getNear ? (
              <>
                {" "}
                <ExternalLink href={FAUCETS.near} className="font-semibold">
                  {copy.errors.getNear}
                </ExternalLink>
              </>
            ) : null}
          </FootNote>
        ) : null}
      </div>
    );

  return (
    <FlowShell title={copy.mint.title} closeHref={closeHref} testId="mint-flow" action={action}>
      {phase === "done" && minted ? (
        <div ref={stageRef} className="flex flex-col items-center gap-4 pt-1">
          {minted.first ? (
            <div ref={charmsRef} aria-hidden="true" className="relative -mb-1.5 w-42">
              {/* proto .mint-charms: a 168 px strap, 52 px coins 28 px apart */}
              <ChainCharms width={168} layout="strap" stringTone="sticker" />
              <Sparkle size={22} className="absolute top-1 -right-6.5" />
              <Sparkle size={16} className="absolute top-7.5 -left-6" />
            </div>
          ) : null}
          <SatchelCard tokenId={minted.id} size="md" status="active" owned headingLevel={3} />
          <div ref={lineRef} className="flex flex-col items-center gap-1 text-center">
            <h3 ref={doneRef} tabIndex={-1} data-testid="mint-done" className="m-0 font-display text-title text-ink outline-none">
              {copy.mint.done(minted.id)}
            </h3>
            {minted.hash ? (
              <p className="m-0 font-sans text-body-sm text-ink-muted">
                {copy.mint.mintedIn("")}
                <a href={EXPLORERS.nearTx(minted.hash)} target="_blank" rel="noreferrer" className="font-mono text-link underline underline-offset-3">
                  {truncateMiddle(minted.hash, 6, 4)}
                </a>
                <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <SatchelCard tokenId={null} size="md" status={null} owned variant="mint-preview" chips={chips(null)} headingLevel={3} className="self-center" />
          <section aria-labelledby={youGetId} className="flex flex-col gap-2.5">
            <h3 id={youGetId} className="m-0 font-sans text-label text-ink">
              {copy.mint.youGet}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {copy.mint.get.map((g) => (
                <li key={g} className="flex items-start gap-2.5 font-sans text-[0.9375rem] leading-5.5 text-ink">
                  <Icon icon={CircleCheck} size={20} className="mt-px text-success" />
                  {g}
                </li>
              ))}
            </ul>
          </section>
          <dl className="m-0 flex justify-between gap-4 font-sans text-[0.9375rem] leading-5.5">
            <dt className="text-ink-muted">{copy.mint.deposit}</dt>
            <dd className="m-0 text-right t-num">
              {copy.mint.depositAmount}
              <small className="block text-caption font-normal text-ink-muted">{copy.mint.depositNote}</small>
            </dd>
          </dl>
          {busy ? <Tracker label={copy.mint.progress} steps={steps} /> : null}
        </>
      )}
    </FlowShell>
  );
}
