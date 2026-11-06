"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { Mark } from "@/components/brand/Mark";
import { SatchelCard, type CardChip } from "@/components/SatchelCard";
import { ModalSheet } from "@/components/client/LandingMenu";
import { toast } from "@/components/client/Toaster";
import { Avatar, Button, FilterChip, ItemPill, cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import { SOL_UI_ENABLED, SATCHEL_CONTRACT } from "@/lib/config";
import { dataSource } from "@/lib/data/source";
import { contractViews } from "@/lib/near/contract";
import { useWallet } from "@/lib/near/wallet";
import type { ChainsOption, ExperienceOption, GoalOption, SourceOption } from "@/lib/onboarding-validate";

/**
 * First-time onboarding (the onboarding build): three short screens on a Satchel's first wallet connect in this
 * browser, then an optional "about you" survey. Client-only, mounted after hydration (no SSR HTML, no layout
 * shift), built on the one overlay-sheet pattern (`ModalSheet`, LandingMenu.tsx) so it inherits its focus trap, Esc,
 * scroll lock and reduced-motion entrance/exit for free.
 *
 * `OnboardingProvider` wraps the app (Providers.tsx): it watches the wallet for a first connect with no stored
 * record and opens itself, and exposes `useOnboardingReplay()` so the account menu's "Replay intro" row can reopen
 * it on demand. Closing it any way (X, Escape, Skip, a screen-3 CTA, or the survey's Skip/Send) writes the stored
 * record once and never shows it again; `submitted` is sticky, so a replay that's closed without resending never
 * un-submits an earlier survey.
 */

export type View = "closed" | "screens" | "survey";

const SCREEN_CHIPS: CardChip[] = (SOL_UI_ENABLED ? (["btc", "evm", "sol"] as const) : (["btc", "evm"] as const)).map((chain) => ({
  chain,
  ticker: chain === "btc" ? "BTC" : chain === "evm" ? "ETH" : "SOL",
  amount: null,
}));

/** The three screens' illustrations, each built from an existing brand part: the card (a wallet you can hand over),
 * the sticker S with two "Used" pills (every signature is on the record), and an access row with a daily cap (let
 * someone spend, within limits). */
function ScreenArt({ screenId }: { screenId: string }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-center rounded-card bg-sky px-6 py-7">
      {screenId === "hand-over" ? (
        <SatchelCard tokenId={null} variant="mint-preview" size="sm" status={null} chips={SCREEN_CHIPS} className="pointer-events-none max-w-50" />
      ) : screenId === "clean-history" ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <Mark size={64} />
          <div className="flex gap-2">
            <ItemPill status="spent" />
            <ItemPill status="spent" />
          </div>
        </div>
      ) : (
        <SpendArt />
      )}
    </div>
  );
}

/** Screen 3's art: one sticker-style access row, someone you added and their daily cap (sample words, not data). */
function SpendArt() {
  const a = O.screens[2]!.art!;
  return (
    <div className="flex w-full max-w-60 flex-col gap-2.5 rounded-card border-3 border-sticker bg-surface p-3.5 text-ink shadow-sticker">
      <div className="flex items-center gap-2.5">
        <Avatar account={a.who} size={32} />
        <span className="min-w-0 truncate font-sans text-label">{a.who}</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 font-sans text-body-sm">
        <span className="flex items-center gap-2 text-ink-muted">
          <CoinIcon coin="BTC" size={20} />
          {a.coin}
        </span>
        <span className="t-num text-ink">{a.cap}</span>
      </div>
    </div>
  );
}

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} aria-hidden="true" className={cx("size-1.5 rounded-full transition-colors duration-150", i === step ? "bg-ink" : "bg-line-strong")} />
      ))}
      <span className="sr-only" aria-live="polite">
        {copy.app.step(step + 1, total)}
      </span>
    </div>
  );
}

/** Does the connected account already own a Satchel? Null while unknown (loading, or signed out); the CTA defaults
 * to Mint until it resolves, so there's no flash from one label to the other. */
function useOwnsAny(accountId: string | null): boolean | null {
  const [state, setState] = useState<{ for: string | null; owns: boolean | null }>({ for: null, owns: null });
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    contractViews(dataSource().view, SATCHEL_CONTRACT)
      .nftSupplyForOwner(accountId)
      .then((n) => alive && setState({ for: accountId, owns: n > 0 }))
      .catch(() => alive && setState({ for: accountId, owns: false }));
    return () => {
      alive = false;
    };
  }, [accountId]);
  return state.for === accountId ? state.owns : null;
}

const O = copy.onboarding;

function Screens({
  step,
  setStep,
  accountId,
  onFinish,
}: {
  step: number;
  setStep: (n: number) => void;
  accountId: string | null;
  onFinish: (opts: { toSurvey: boolean }) => void;
}) {
  const total = O.screens.length;
  const screen = O.screens[step]!;
  const last = step === total - 1;
  const owns = useOwnsAny(accountId);
  return (
    <div className="flex flex-col gap-5" data-testid="onboarding-screens" data-step={step}>
      <ScreenArt screenId={screen.id} />
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-heading text-ink">{screen.title}</h2>
        <p className="m-0 font-sans text-body text-ink-muted">{screen.body}</p>
        {/* a new tab, so the intro stays where it was; the visible words start the accessible name (WCAG 2.5.3) */}
        <a href={`/questions#${screen.learnMore.anchor}`} target="_blank" rel="noopener" className="text-link self-start font-sans text-body-sm underline decoration-1 underline-offset-3 hover:decoration-2">
          {O.learnMore}
          <span className="sr-only">: {screen.learnMore.label}{O.newTab}</span>
        </a>
      </div>
      <Dots step={step} total={total} />
      {/* Skip lives in the top bar (OnboardingOverlay's head); Back and the forward button share the bottom row */}
      {last ? (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            block
            href={owns ? "/satchels" : "/mint"}
            onClick={() => onFinish({ toSurvey: false })}
          >
            {owns ? O.openCta : O.mintCta}
          </Button>
          <div className="flex items-center gap-2">
            <Button size="lg" onClick={() => setStep(step - 1)}>
              {O.back}
            </Button>
            <Button size="lg" className="flex-1" onClick={() => onFinish({ toSurvey: true })}>
              {O.continueCta}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => setStep(step - 1)} disabled={step === 0}>
            {O.back}
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={() => setStep(step + 1)}>
            {O.next}
          </Button>
        </div>
      )}
    </div>
  );
}

type GoalSet = ReadonlySet<GoalOption>;
type ChainsSet = ReadonlySet<ChainsOption>;

function ChipGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly { id: T; label: string }[];
  selected: ReadonlySet<T>;
  onToggle: (id: T) => void;
}) {
  const legendId = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend id={legendId} className="m-0 p-0 font-sans text-label text-ink">
        {legend}
      </legend>
      <div role="group" aria-labelledby={legendId} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <FilterChip key={o.id} pressed={selected.has(o.id)} onClick={() => onToggle(o.id)}>
            {o.label}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}

interface SurveyState {
  goal: GoalSet;
  experience: ExperienceOption | null;
  chains: ChainsSet;
  source: SourceOption | null;
  shareAccount: boolean;
}

const EMPTY_SURVEY: SurveyState = { goal: new Set(), experience: null, chains: new Set(), source: null, shareAccount: false };
const EMPTY_EXPERIENCE: ReadonlySet<ExperienceOption> = new Set();
const EMPTY_SOURCE: ReadonlySet<SourceOption> = new Set();

function toggleIn<T>(set: ReadonlySet<T>, id: T): ReadonlySet<T> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

async function postOnboarding(body: unknown) {
  try {
    await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    /* best effort: the survey still closes either way */
  }
}

function Survey({ accountId, onFinish }: { accountId: string | null; onFinish: (submitted: boolean) => void }) {
  const [s, setS] = useState<SurveyState>(EMPTY_SURVEY);
  const [sending, setSending] = useState(false);
  const S = O.survey;

  const skip = () => {
    void postOnboarding({ skipped: true }); // fire and forget: it must not block closing
    onFinish(false);
  };

  const send = async () => {
    setSending(true);
    const body: Record<string, unknown> = {};
    if (s.goal.size) body.goal = [...s.goal];
    if (s.experience) body.experience = s.experience;
    if (s.chains.size) body.chains = [...s.chains];
    if (s.source) body.source = s.source;
    body.share_account = s.shareAccount;
    if (s.shareAccount && accountId) body.account_id = accountId;
    await postOnboarding(body);
    toast(S.thanks);
    onFinish(true);
  };

  return (
    <div className="flex flex-col gap-5" data-testid="onboarding-survey">
      <p className="m-0 font-sans text-body text-ink-muted">{S.lead}</p>
      <ChipGroup
        legend={S.goal.q}
        options={Object.entries(S.goal.options).map(([id, label]) => ({ id: id as GoalOption, label }))}
        selected={s.goal}
        onToggle={(id) => setS((p) => ({ ...p, goal: toggleIn(p.goal, id) }))}
      />
      <ChipGroup
        legend={S.experience.q}
        options={Object.entries(S.experience.options).map(([id, label]) => ({ id: id as ExperienceOption, label }))}
        selected={s.experience ? new Set([s.experience]) : EMPTY_EXPERIENCE}
        onToggle={(id) => setS((p) => ({ ...p, experience: p.experience === id ? null : id }))}
      />
      <ChipGroup
        legend={S.chains.q}
        options={Object.entries(S.chains.options).map(([id, label]) => ({ id: id as ChainsOption, label }))}
        selected={s.chains}
        onToggle={(id) => setS((p) => ({ ...p, chains: toggleIn(p.chains, id) }))}
      />
      <ChipGroup
        legend={S.source.q}
        options={Object.entries(S.source.options).map(([id, label]) => ({ id: id as SourceOption, label }))}
        selected={s.source ? new Set([s.source]) : EMPTY_SOURCE}
        onToggle={(id) => setS((p) => ({ ...p, source: p.source === id ? null : id }))}
      />
      {accountId ? (
        <label className="flex items-start gap-2.5 font-sans text-body-sm text-ink">
          <input
            type="checkbox"
            checked={s.shareAccount}
            onChange={(e) => setS((p) => ({ ...p, shareAccount: e.target.checked }))}
            className="mt-0.5 size-4.5 flex-none accent-brand"
          />
          <span>{S.shareAccount.label}</span>
        </label>
      ) : null}
      <p className="m-0 font-sans text-caption text-ink-muted">{S.privacy}</p>
      <a href="/questions#q-feedback" target="_blank" rel="noopener" className="text-link self-start font-sans text-body-sm underline decoration-1 underline-offset-3 hover:decoration-2">
        {O.learnMore}
        <span className="sr-only">: {S.learnMoreLabel}{O.newTab}</span>
      </a>
      <div className="flex items-center justify-between gap-3">
        <Button onClick={skip} disabled={sending}>
          {S.skip}
        </Button>
        <Button variant="primary" loading={sending} onClick={() => void send()}>
          {sending ? S.sending : S.send}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingOverlay({ view, step, setStep, close, onFinishScreens }: { view: View; step: number; setStep: (n: number) => void; close: (submitted?: boolean) => void; onFinishScreens: (opts: { toSurvey: boolean }) => void }) {
  const { accountId } = useWallet();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null); // nothing to return focus to on an auto-open or a replay
  const titleId = useId();
  const title = view === "survey" ? O.survey.title : undefined;
  return (
    <ModalSheet
      open={view !== "closed"}
      onClose={() => close(false)}
      label={title}
      labelledBy={title ? undefined : titleId}
      closeLabel={O.close}
      initialFocus={titleRef}
      returnFocus={triggerRef}
      testId="onboarding"
      head={
        view === "survey" ? (
          <h2 ref={titleRef} tabIndex={-1} className="m-0 font-display text-heading text-ink outline-none">
            {O.survey.title}
          </h2>
        ) : (
          // names the dialog only; the screen's own visible heading is the one heading (no duplicate h2)
          <div className="flex min-h-11 items-center">
            <p id={titleId} ref={titleRef as React.RefObject<HTMLParagraphElement | null>} tabIndex={-1} className="sr-only outline-none">
              {O.screens[step]?.title}
            </p>
            {/* Skip at the top, beside the close button: always within reach, out of the way of Next */}
            <Button variant="link" className="ml-auto" onClick={() => close(false)}>
              {O.skip}
            </Button>
          </div>
        )
      }
    >
      {view === "survey" ? (
        <Survey accountId={accountId} onFinish={(submitted) => close(submitted)} />
      ) : (
        <Screens step={step} setStep={setStep} accountId={accountId} onFinish={onFinishScreens} />
      )}
    </ModalSheet>
  );
}
