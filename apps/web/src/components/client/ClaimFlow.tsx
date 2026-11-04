"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, CircleX, LoaderCircle, PackageOpen, RefreshCw, TriangleAlert, Wallet } from "lucide-react";
import { gateModel, GateLine } from "@/components/Clean";
import { ConnectButton } from "@/components/client/ConnectButton";
import { useCleanCheck } from "@/components/client/useCleanCheck";
import { Button, Icon } from "@/components/ui";
import { copy } from "@/lib/copy";
import { claimToWallet, readClaimAccount, type ClaimAccountState } from "@/lib/claim/claim-source";
import { parseClaimLink, type ClaimKey } from "@/lib/claim/link";
import { planClaim } from "@/lib/claim/plan";
import { dataSource } from "@/lib/data/source";
import { satchelAddresses } from "@/lib/derive";
import { useWallet } from "@/lib/near/wallet";
import { holdingsSentence } from "@/lib/view";

/**
 * /claim (A2 Give by link; plan/feature-ideas.md A2): client-only — the secret lives in `location.hash`, which this
 * page reads ONCE on mount and never forwards anywhere (no server component ever sees it; no analytics, no logs).
 * It derives the implicit account, shows what it holds, and offers "Claim to my wallet", which signs with the
 * in-browser key (never the connected wallet) and moves everything to the connected wallet in one go.
 */

type Phase = "parsing" | "missing" | "invalid" | "loading" | "rpc-error" | "ready" | "claiming" | "claimed" | "failed";

export function ClaimFlow() {
  const { wallet, accountId, ready } = useWallet();
  const [phase, setPhase] = useState<Phase>("parsing");
  const [key, setKey] = useState<ClaimKey | null>(null);
  const [state, setState] = useState<ClaimAccountState | null>(null);
  const [gift, setGift] = useState<string[] | null>(null);
  const [claimed, setClaimed] = useState<{ tokenIds: string[]; failedIds: string[]; nearSentYocto: bigint; to: string } | null>(null);

  const load = async (k: ClaimKey) => {
    setPhase("loading");
    try {
      const s = await readClaimAccount(k.implicitAccountId);
      setState(s);
      setPhase("ready");
    } catch {
      setPhase("rpc-error");
    }
  };

  useEffect(() => {
    const read = () => {
      const link = parseClaimLink(window.location.hash);
      if (!link) {
        setPhase(window.location.hash ? "invalid" : "missing");
        return;
      }
      setKey(link.key);
      setGift(link.giftTokenIds);
      void load(link.key);
    };
    // deferred (not called synchronously in the effect body, react-hooks/set-state-in-effect): reads the fragment
    // on mount, and again on a same-document fragment change (e.g. the hash alone changes without a full reload).
    const t = setTimeout(read, 0);
    window.addEventListener("hashchange", read);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  const onClaim = async () => {
    if (!key || !wallet || !accountId || !state) return;
    setPhase("claiming");
    try {
      // only the gifted ids (R3-X-4); an older link with no list claims what the account holds
      const plan = planClaim(state.tokenIds, gift);
      const r = await claimToWallet(key, accountId, plan.claim);
      if (r.tokenIds.length === 0) {
        if (r.failedIds.length > 0) {
          setPhase("failed");
          return;
        }
        setPhase("ready");
        await load(key);
        return;
      }
      setClaimed({ ...r, to: accountId });
      setPhase("claimed");
    } catch {
      setPhase("failed");
    }
  };

  let body: ReactNode;

  if (phase === "parsing" || phase === "loading") {
    body = (
      <Centre icon={LoaderCircle} spin>
        <p className="font-sans text-body text-ink-muted">{copy.claim.checking}</p>
      </Centre>
    );
  } else if (phase === "missing" || phase === "invalid") {
    body = (
      <Centre icon={TriangleAlert} tone="danger">
        <h1 className="m-0 font-display text-heading text-ink">{phase === "missing" ? copy.claim.missingTitle : copy.claim.invalidTitle}</h1>
        <p className="font-sans text-body text-ink-muted">{phase === "missing" ? copy.claim.missingBody : copy.claim.invalidBody}</p>
      </Centre>
    );
  } else if (phase === "rpc-error") {
    body = (
      <Centre icon={TriangleAlert} tone="danger">
        <h1 className="m-0 font-display text-heading text-ink">{copy.claim.rpcErrorTitle}</h1>
        <p className="font-sans text-body text-ink-muted">{copy.claim.rpcErrorBody}</p>
        <Button variant="primary" icon={RefreshCw} onClick={() => key && void load(key)}>
          {copy.claim.retry}
        </Button>
      </Centre>
    );
  } else if (phase === "claimed" && claimed) {
    body = (
      <Centre icon={Check} tone="success">
        <h1 className="m-0 font-display text-heading text-ink">{copy.claim.claimedTitle}</h1>
        <p className="font-sans text-body text-ink-muted">{copy.claim.claimedBody(claimed.to)}</p>
        {claimed.failedIds.length > 0 ? (
          <p className="m-0 font-sans text-body text-danger" role="alert" data-testid="claim-partial">
            {copy.claim.partialBody(claimed.failedIds)}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {claimed.tokenIds.map((id) => (
            <Button key={id} variant="primary" href={`/s/${id}`}>
              {copy.claim.viewSatchel(id)}
            </Button>
          ))}
        </div>
      </Centre>
    );
  } else if (phase === "failed") {
    body = (
      <Centre icon={CircleX} tone="danger">
        <h1 className="m-0 font-display text-heading text-ink">{copy.claim.failedTitle}</h1>
        <Button variant="primary" icon={RefreshCw} onClick={() => key && void load(key).then(() => setPhase("ready"))}>
          {copy.claim.retry}
        </Button>
      </Centre>
    );
  } else if (state) {
    const exists = state.exists;
    const plan = planClaim(state.tokenIds, gift);
    const hasTokens = plan.claim.length > 0;
    const othersList = plan.others.length > 0 ? <OthersHere ids={plan.others} /> : null;
    if (!exists) {
      body = (
        <Centre icon={PackageOpen}>
          <h1 className="m-0 font-display text-heading text-ink">{copy.claim.unfundedTitle}</h1>
          <p className="font-sans text-body text-ink-muted">{copy.claim.unfundedBody}</p>
          <Button icon={RefreshCw} onClick={() => key && void load(key)}>
            {copy.claim.retry}
          </Button>
        </Centre>
      );
    } else if (!hasTokens) {
      body = (
        <Centre icon={PackageOpen}>
          <h1 className="m-0 font-display text-heading text-ink">{copy.claim.alreadyClaimedTitle}</h1>
          <p className="font-sans text-body text-ink-muted">{gift ? copy.claim.giftGoneBody : copy.claim.alreadyClaimedBody}</p>
          {othersList}
        </Centre>
      );
    } else {
      body = (
        <div className="flex flex-col gap-5 px-4 py-6">
          <h1 className="m-0 font-display text-heading text-ink">{copy.claim.title}</h1>
          <p className="m-0 font-sans text-body text-ink-muted">{plan.legacy ? copy.claim.legacyNote : copy.claim.note}</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {plan.claim.map((id) => (
              <ClaimSatchelRow key={id} tokenId={id} />
            ))}
          </ul>
          {othersList}
          {state.truncated ? <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.claim.truncatedNote(state.tokenIds.length)}</p> : null}
          {!ready || !accountId ? (
            <div className="flex flex-col items-center gap-2.5 rounded-md bg-surface-sunken p-4 text-center">
              <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.claim.connectFirst}</p>
              <ConnectButton size="lg" />
            </div>
          ) : (
            <Button variant="primary" size="lg" block loading={phase === "claiming"} spinner="none" onClick={onClaim} data-testid="claim-to-wallet">
              {phase === "claiming" ? copy.claim.claiming : copy.claim.claimTo}
            </Button>
          )}
        </div>
      );
    }
  }

  return <div className="mx-auto max-w-130 px-4 py-10" data-testid="claim-flow">{body}</div>;
}

function Centre({ icon, tone = "ink", spin = false, children }: { icon: typeof Wallet; tone?: "ink" | "danger" | "success"; spin?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className={`grid size-16 place-items-center rounded-[20px] bg-surface-sunken ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink"}`}>
        <Icon icon={icon} size={28} spin={spin} />
      </span>
      {children}
    </div>
  );
}

/** R3-X-4: tokens found in the link's account that the gift didn't name. Shown with their own clean check, never claimed. */
function OthersHere({ ids }: { ids: string[] }) {
  return (
    <section className="flex flex-col gap-3 text-left" aria-labelledby="claim-others-title" data-testid="claim-others">
      <h2 id="claim-others-title" className="m-0 font-sans text-label text-ink">
        {copy.claim.alsoHereTitle}
      </h2>
      <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.claim.alsoHereBody}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {ids.map((id) => (
          <ClaimSatchelRow key={id} tokenId={id} />
        ))}
      </ul>
    </section>
  );
}

function ClaimSatchelRow({ tokenId }: { tokenId: string }) {
  const { report } = useCleanCheck(tokenId, true);
  const [sentence, setSentence] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const addr = satchelAddresses(tokenId);
    void dataSource()
      .balances(addr, tokenId)
      .then((b) => {
        if (alive) setSentence(holdingsSentence({ balances: b }));
      });
    return () => {
      alive = false;
    };
  }, [tokenId]);
  const model = gateModel("browser", report, "");
  return (
    <li className="flex flex-col gap-1.5 rounded-md border border-line bg-surface p-4">
      <Link href={`/s/${tokenId}`} className="font-display text-label text-ink underline-offset-2 hover:underline">
        {copy.card.name(tokenId)}
      </Link>
      <p className="m-0 font-sans text-body-sm text-ink-muted" data-testid={`claim-balance-${tokenId}`}>
        {sentence ?? "…"}
      </p>
      <GateLine model={model} />
    </li>
  );
}
