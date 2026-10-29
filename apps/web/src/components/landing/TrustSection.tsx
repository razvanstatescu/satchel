import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, FileCode, FlaskConical, Lock, Plus } from "lucide-react";
import { ArtIcon, Coin, Lbl } from "@/components/landing/art";
import { CONTAINER, H2, HEAD, LEAD, SECTION_Y, SPLIT } from "@/components/landing/layout";
import { Button, cx, Icon } from "@/components/ui";
import { CONTRACT_ROLE, REPO_URL } from "@/lib/config";
import { copy, type SolVariant } from "@/lib/copy";
import { LANDING_SOL } from "@/lib/faq";
import { lockView, type ContractRole } from "@/lib/lock-facts";

/** "What you still trust: rest" → the bold lead (up to and with the colon) and the rest. */
export function colonLead(s: string): { lead: string; rest: string } {
  const i = s.indexOf(": ");
  return i < 0 ? { lead: "", rest: s } : { lead: s.slice(0, i + 1), rest: s.slice(i + 2) };
}

/**
 * Trust (`#trust`, design-spec §4.7; 49 words, plus Under the hood's 12 while closed): what you trust, said calmly, with
 * real UI as proof. Text left, art right from 1024 (text first on phones):
 * - the H2 and the lead from `lockView(role)`, a build-time claim (the landing reads nothing): rc and final say "No
 *   admin key. Not even ours."; rc adds the release-candidate line; dev shows its twin and no art (that contract still
 *   has keys);
 * - the honest limits on a sunken panel with a bold "What you still trust:";
 * - "See the contract facts" (→ /contract, where the live proof is);
 * - Under the hood, one closed native `<details>`: the six rules and five "Check it yourself" links, in the server HTML.
 * The art (rc and final): a flat lemon field holding a Contract facts slip, the BTC and ETH coins peeking over its top
 * edge (they peek up once on enter). No account, no Satchel number, no time.
 */
export function TrustSection({ role = CONTRACT_ROLE, sol = LANDING_SOL }: { role?: ContractRole; sol?: SolVariant }) {
  const v = lockView(role);
  const L = copy.landing.lock;
  const limits = colonLead(L.limits);
  const art = v.variant === "locked";
  return (
    <section id="trust" aria-labelledby="trust-title" data-lock-variant={v.variant} className={SECTION_Y}>
      <div className={cx(CONTAINER, art && SPLIT)}>
        <div className="flex min-w-0 flex-col gap-5">
          <div className={HEAD}>
            <h2 id="trust-title" className={H2}>
              {v.h2}
            </h2>
            <p className={LEAD}>{v.body}</p>
          </div>
          {v.note ? (
            <p className="flex items-start gap-3 text-ink-muted" data-testid="lock-note">
              <Icon icon={FlaskConical} size={20} className="mt-0.5" />
              <span className="min-w-0">{v.note}</span>
            </p>
          ) : null}
          <p className="rounded-md bg-surface-sunken px-4.5 py-4" data-testid="trust-limits">
            {limits.lead ? <strong className="font-bold">{limits.lead}</strong> : null}
            {limits.lead ? " " : null}
            {limits.rest}
          </p>
          <div>
            <Button variant="secondary" size="lg" href="/contract" icon={FileCode}>
              {L.cta}
            </Button>
          </div>
          <UnderTheHood sol={sol} />
        </div>
        {art ? <ContractFacts /> : null}
      </div>
    </section>
  );
}

/** The art: the Contract facts slip on lemon (a Day island), the coins peeking over it. rc and final only. */
function ContractFacts() {
  const s = copy.landing.lock.slip;
  const rows: [string, string][] = [
    [s.keys, s.keysValue],
    [s.admin, s.adminValue],
    [s.code, s.codeValue],
  ];
  return (
    <div className="lp-trust" data-scheme="day" aria-hidden="true" data-enter="trust" data-trust-art="">
      <div className="lp-trust__stack">
        <div className="lp-peek">
          <Coin chain="btc" data-k="peek-btc" />
          <Coin chain="evm" data-k="peek-eth" />
        </div>
        <div className="lp-slip">
          <p className="lp-slip__head">
            <ArtIcon icon={FileCode} />
            <Lbl l={s.title} />
          </p>
          <ol className="lp-slip__rows">
            {rows.map(([k, val]) => (
              <li key={k} className="lp-slip__row">
                <Lbl l={k} />
                <span className="lp-slip__state">
                  <ArtIcon icon={Check} />
                  <Lbl l={val} />
                </span>
              </li>
            ))}
          </ol>
          <p className="lp-slip__verdict">
            <ArtIcon icon={Lock} />
            <Lbl l={s.verdict} />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Under the hood (`#under-the-hood`): the depth for judges, one click away. One closed native `<details>` (no `open`, no
 * JS), so everything inside is in the server HTML: the six rules (by the same `SolVariant` as the chains answer in
 * Questions, so the two always agree) and the five "Check it yourself" links, generic (D-42: no Satchel's addresses, no
 * sale that needs a live read). Its plus turns 45° when open (no transition under reduced motion).
 */
export function UnderTheHood({ sol }: { sol: SolVariant }) {
  const H = copy.landing.hood;
  const links: { href: string; label: string }[] = [
    { href: "/s/1", label: H.links.one },
    { href: "/s/1/activity", label: H.links.activity },
    { href: "/market", label: H.links.market },
    { href: "/contract", label: H.links.contract },
  ];
  const LINK = "inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] leading-5 text-ink-muted hover:text-ink hover:underline hover:underline-offset-3";
  return (
    <details id="under-the-hood" data-hood="" className="group scroll-mt-24 rounded-md border border-line bg-surface">
      <summary className="flex min-h-15 cursor-pointer list-none items-center gap-3 rounded-md px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-display text-[1.0625rem] leading-5.5 font-bold">{H.h2}</span>
          <span className="text-body-sm text-ink-muted">{H.summary}</span>
        </span>
        <Icon icon={Plus} size={20} className="ml-auto transition-transform duration-220 ease-out group-open:rotate-45 motion-reduce:transition-none" />
      </summary>
      <div className="grid gap-4.5 px-4 pt-1 pb-4">
        <ol aria-label={H.rulesTitle} className="m-0 grid list-none gap-3 p-0">
          {H.rules(sol).map((r, i) => (
            <li key={r.title} data-hood-rule={i + 1} className="text-[0.9375rem] leading-5.5 text-ink-muted">
              {/* one text node: `{r.title}.` would print "only<!-- -->.", which a naive extractor reads as "only ." */}
              <strong className="font-bold text-ink">{`${r.title}.`}</strong> {r.body}
            </li>
          ))}
        </ol>
        <ul aria-label={H.linksTitle} className="m-0 flex list-none flex-col p-0">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={LINK}>
                <Icon icon={ArrowRight} size={16} />
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={LINK}>
              <Icon icon={ArrowUpRight} size={16} />
              {H.links.repo}
              <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
            </a>
          </li>
        </ul>
      </div>
    </details>
  );
}
