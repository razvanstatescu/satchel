"use client";

import { overview } from "@/lib/overview";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, LoaderCircle, Lock, Snowflake, TriangleAlert, Wallet } from "lucide-react";
import { ConnectButton } from "@/components/client/ConnectButton";
import { CopyButton } from "@/components/client/CopyButton";
import { FlowShell } from "@/components/client/FlowShell";
import { useViewer } from "@/components/client/SatchelPage";
import { SatchelCard } from "@/components/SatchelCard";
import { Button, Icon } from "@/components/ui";
import { copy } from "@/lib/copy";
import { CLAIM_FUNDING_YOCTO, buildClaimUrl, generateClaimKey, type ClaimKey } from "@/lib/claim/link";
import { formatAmount } from "@/lib/format";
import { calls, contractViews } from "@/lib/near/contract";
import { dataSource } from "@/lib/data/source";
import type { SatchelSnapshot } from "@/lib/data/types";
import { useWallet } from "@/lib/near/wallet";
import { holdingsSentence } from "@/lib/view";

/**
 * Give by link (A2, plan/feature-ideas.md A2): Review → one wallet approval (funds the fresh implicit account, then
 * transfers the Satchel to it; batched behind one click when the wallet supports it, else fund-then-transfer in
 * order) → the link, shown once. The secret lives only in this component's state and the URL fragment it builds;
 * it is never sent anywhere and never logged.
 */

type Phase = "review" | "wallet" | "processing" | "done" | "error";

export function GiveLinkFlow({ snap }: { snap: SatchelSnapshot }) {
  const { live, isOwner, accountId, status } = useViewer(snap);
  const { wallet, ready } = useWallet();
  const [phase, setPhase] = useState<Phase>("review");
  const [key, setKey] = useState<ClaimKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState(false);
  const busy = phase === "wallet" || phase === "processing";
  const closeHref = `/s/${snap.token_id}`;

  const onCreate = async () => {
    if (!wallet || !accountId) return;
    setError(null);
    const k = generateClaimKey();
    const txTransfer = calls.transferNear(k.implicitAccountId, CLAIM_FUNDING_YOCTO);
    const txNft = { ...calls.nftTransfer(snap.token_id, k.implicitAccountId), signerId: accountId };
    setPhase("wallet");
    try {
      if (wallet.signAndSendTransactions) {
        await wallet.signAndSendTransactions([{ ...txTransfer, signerId: accountId }, txNft]);
      } else {
        // fallback (no batch support): fund first, then transfer — so an interruption never leaves the Satchel at
        // an account with no gas to move it.
        await wallet.signAndSendTransaction({ ...txTransfer, signerId: accountId });
        await wallet.signAndSendTransaction(txNft);
      }
    } catch (e) {
      setPhase("review");
      setError(e instanceof Error && /reject|cancel|denied/i.test(e.message) ? copy.xfer.cancelled : copy.giveLink.error.title);
      return;
    }
    setPhase("processing");
    // never optimistic: confirm the new owner before showing the link (kb/90 §8.1)
    const t = await contractViews(dataSource().view).nftToken(snap.token_id).catch(() => null);
    if (t?.owner_id !== k.implicitAccountId) {
      setPhase("error");
      setError(copy.giveLink.error.title);
      return;
    }
    if (keep) {
      try {
        window.sessionStorage.setItem(`satchel:claim-copy:${snap.token_id}`, k.secretKey);
      } catch {
        /* ignore */
      }
    }
    setKey(k);
    setPhase("done");
  };

  const balances = holdingsSentence(live);
  let body: ReactNode;
  let action: ReactNode = null;
  let title = copy.giveLink.title(snap.token_id);
  let meta: string | undefined;
  let guarded = false;

  if (phase === "done" && key) {
    title = copy.giveLink.createdTitle;
    const url = buildClaimUrl(key.secretKey, [snap.token_id]);
    body = (
      <>
        <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-3.5 font-sans text-body text-ink" role="alert">
          <Icon icon={TriangleAlert} size={18} className="mt-0.5 flex-none text-danger" />
          {copy.giveLink.warning}
        </p>
        <ClaimQr url={url} />
        <p className="m-0 break-all rounded-md bg-surface-sunken p-3 font-mono text-[0.8125rem] text-ink" data-testid="claim-url">
          {url}
        </p>
      </>
    );
    action = (
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <CopyButton value={url} label={copy.giveLink.copy} toastText={copy.giveLink.copied} variant="primary" text={copy.giveLink.copy} />
          <ShareButton url={url} />
        </div>
        <Button size="lg" block href={closeHref} replace data-testid="give-link-done">
          {copy.giveLink.doneBtn}
        </Button>
      </div>
    );
  } else if (ready && !accountId) {
    guarded = true;
    body = (
      <Guard icon={Wallet} title={copy.giveLink.guard.connectTitle} body={copy.giveLink.guard.connectBody(snap.token_id)}>
        <ConnectButton size="lg" />
      </Guard>
    );
  } else if (ready && !isOwner && !busy) {
    guarded = true;
    body = (
      <Guard icon={Lock} title={copy.giveLink.guard.notOwnerTitle(snap.token_id)} body={copy.giveLink.guard.notOwnerBody(accountId ?? "", live.owner)}>
        <Button size="lg" href={closeHref} replace>
          {copy.sign.close}
        </Button>
      </Guard>
    );
  } else if (live.listing && !busy) {
    guarded = true;
    body = (
      <Guard icon={Snowflake} tone="frozen" title={copy.giveLink.guard.listedTitle} body={copy.giveLink.guard.listedBody(snap.token_id)}>
        <Button size="lg" href={`/s/${snap.token_id}/sale`}>
          {copy.send.guard.goToSell}
        </Button>
      </Guard>
    );
  } else {
    meta = copy.giveLink.stepReview;
    body = (
      <>
        <SatchelCard tokenId={snap.token_id} id={`give-link-card-${snap.token_id}`} size="md" status={status} owned contents={overview(live)} headingLevel={3} className="self-center" />
        <p className="m-0 font-sans text-body text-ink-muted">{copy.giveLink.reviewBody}</p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 font-sans text-body text-ink">
          <li className="flex items-start gap-2.5">
            <Icon icon={Check} size={18} className="mt-0.5 flex-none text-success" />
            {copy.giveLink.rows.satchel(snap.token_id)} ({balances})
          </li>
          <li className="flex items-start gap-2.5">
            <Icon icon={Check} size={18} className="mt-0.5 flex-none text-success" />
            {copy.giveLink.rows.gas} ({formatAmount(CLAIM_FUNDING_YOCTO, "NEAR")})
          </li>
          <li className="flex items-start gap-2.5">
            <Icon icon={Check} size={18} className="mt-0.5 flex-none text-success" />
            {copy.giveLink.rows.secret}
          </li>
        </ul>
        <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-3.5 font-sans text-body-sm text-ink">
          <Icon icon={TriangleAlert} size={16} className="mt-0.5 flex-none text-danger" />
          {copy.giveLink.warning}
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-sans text-label text-ink">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-5.5 flex-none accent-(--ink)" data-testid="keep-copy" />
          {copy.giveLink.keepCopy}
        </label>
        {keep ? <p className="font-sans text-body-sm text-ink-muted">{copy.giveLink.keepCopyNote}</p> : null}
      </>
    );
    action = (
      <>
        <Button variant="primary" size="lg" block loading={busy} spinner="none" onClick={onCreate} data-testid="create-link">
          {busy ? copy.giveLink.creating : copy.giveLink.cta}
        </Button>
        {error ? (
          <p role="alert" className="mt-2.5 flex items-start gap-2 font-sans text-body-sm text-danger" data-testid="give-link-error">
            <Icon icon={TriangleAlert} size={16} className="mt-0.5" />
            <span>{error}</span>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <FlowShell title={title} meta={meta} fill={!guarded} closeHref={closeHref} action={action} testId="give-link-flow">
      {body}
    </FlowShell>
  );
}

function ShareButton({ url }: { url: string }) {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  if (!canShare) return null;
  return (
    <Button
      size="lg"
      block
      icon={ArrowUpRight}
      onClick={() =>
        void navigator.share({ title: copy.giveLink.share, url }).catch(() => {
          /* dismissed */
        })
      }
    >
      {copy.giveLink.share}
    </Button>
  );
}

/** The claim link as a QR, same plate treatment as Add coins (ReceiveSheet's `qrSvg`). */
function ClaimQr({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void import("@/lib/qr").then((m) => m.qrSvg(url)).then(setSvg);
  }, [url]);
  return (
    <div
      role="img"
      aria-label={copy.giveLink.qrAlt}
      data-scheme="day"
      data-testid="claim-qr"
      className="mx-auto size-50 rounded-[16px] border border-line-strong bg-surface p-2.5 text-ink *:block *:size-full"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? null : <LoaderCircle className="size-full animate-spin text-ink-muted" aria-hidden="true" />}
    </div>
  );
}

function Guard({ icon, tone = "ink", title, body, children }: { icon: typeof Wallet; tone?: "ink" | "frozen"; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 pt-3 pb-1 text-center">
      <span className={`mb-1.5 grid size-16 place-items-center rounded-[20px] bg-surface-sunken ${tone === "frozen" ? "text-frozen" : "text-ink"}`}>
        <Icon icon={icon} size={28} />
      </span>
      <h3 className="m-0 font-display text-heading text-ink">{title}</h3>
      <p className="max-w-[34ch] font-sans text-body text-ink-muted">{body}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
