import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { CopyButton } from "@/components/client/CopyButton";
import { Icon, Pill, cx } from "@/components/ui";
import { copy } from "@/lib/copy";
import { CONTRACT_ROLE, EXPLORERS } from "@/lib/config";
import { marketing } from "@/lib/copy/marketing";
import { pageMetadata } from "@/lib/seo";
import { getContractFacts } from "@/lib/data/server";
import type { ContractFacts } from "@/lib/data/types";
import { truncateMiddle, utcStamp } from "@/lib/format";

/**
 * /contract, a judge route (app-screens §11.1; kb/90 §8.1, §5.16 proofs): blocking SSR with no Suspense above the
 * facts (cached 60 s). "Born without a key", the Keyless since birth. badge, the facts as one flat `dl`
 * (`[data-judge-facts]`, `data-fact=…`; the birth tx is an explorer link; Expected carries "Matches"), the Config
 * disclosure, and the commands that verify it, each saying what it proves with a labelled 44 px Copy. The dev variant
 * says so and shows its keys in danger.
 */
export const instant = false;

// The dev contract has keys: "born without a key" is for the rc and final contracts only (CR-19).
export const metadata: Metadata = pageMetadata({
  path: "/contract",
  title: copy.contract.title,
  description: CONTRACT_ROLE === "dev" ? marketing.meta.contract.dev : marketing.meta.contract.keyless,
});

const F = copy.contract.facts;

function commands(account: string, birthTx: string | null, strict: boolean): { what: string; cmd: string }[] {
  const c = strict ? copy.contract.cmd : { ...copy.contract.cmd, ...copy.contract.cmd.dev };
  return [
    { what: c.summary, cmd: `near account view-account-summary ${account} network-config testnet-fastnear now` },
    {
      what: c.signer,
      cmd: `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"${account}","is_any_signer":true}'`,
    },
    {
      what: c.oldest,
      cmd: `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"${account}","desc":false,"limit":1}'`,
    },
    ...(birthTx
      ? [{ what: c.birth, cmd: `curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["${birthTx}"]}'` }]
      : []),
    { what: c.build, cmd: "cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml && shasum -a 256 target/near/satchel/satchel.wasm" },
  ];
}

/** A 64-hex hash in 8-character groups that wrap only between groups; the DOM text stays the raw hash. */
function Hash({ hex }: { hex: string }) {
  const groups = hex.match(/.{1,8}/g) ?? [hex];
  return (
    <span className="inline-flex flex-wrap gap-x-[0.5ch] font-mono text-[0.875rem] leading-5 font-[450]">
      {groups.map((g, i) => (
        <span key={i} className="whitespace-nowrap">
          {g}
        </span>
      ))}
    </span>
  );
}

const mono = "font-mono text-[0.875rem] leading-5 font-[450]";
const muted = "text-body-sm text-ink-muted";

function factRows(f: ContractFacts): { key: string; label: string; value: ReactNode }[] {
  const unavailable = <span className="text-ink-muted">{F.unavailable}</span>;
  // An empty key list also comes back for an account that doesn't exist, so a count needs a confirmed account
  // (as the Satchel page's keys fact does).
  const keys =
    f.locked === true ? (
      F.locked
    ) : f.account_exists === false ? (
      <span className="text-danger">{F.noAccount}</span>
    ) : f.access_keys === null || f.account_exists === null ? (
      unavailable
    ) : (
      <span className={f.access_keys > 0 ? "text-danger" : undefined}>{F.keysSome(f.access_keys)}</span>
    );
  return [
    { key: "contract", label: F.contract, value: <span className={mono}>{f.account_id}</span> },
    { key: "role", label: F.role, value: copy.contract.roles[f.role] },
    { key: "keys", label: F.keys, value: keys },
    {
      key: "birth",
      label: F.birth,
      value: f.birth_tx ? (
        <>
          <a href={EXPLORERS.nearTx(f.birth_tx)} target="_blank" rel="noreferrer" className={cx(mono, "text-link underline decoration-1 underline-offset-3 hover:decoration-2")}>
            {f.birth_tx}
            <span className="sr-only">{` ${copy.a11y.newTab}`}</span>
          </a>
          {f.birth_block ? <span className={muted}>{` · ${F.block(f.birth_block.toLocaleString("en-US"))}`}</span> : null}
        </>
      ) : (
        unavailable
      ),
    },
    { key: "signer-txs", label: F.signerTxs, value: f.any_signer_tx_count === null ? unavailable : <span className="t-num">{f.any_signer_tx_count}</span> },
    {
      key: "oldest",
      label: F.oldest,
      value: f.oldest_tx ? (
        <>
          <span className={mono} title={f.oldest_tx}>
            {truncateMiddle(f.oldest_tx, 12, 7)}
          </span>
          {f.oldest_tx === f.birth_tx ? <span className={muted}>{` ${F.theBirth}`}</span> : null}
        </>
      ) : (
        unavailable
      ),
    },
    { key: "code-hash", label: F.codeHash, value: f.code_hash_hex ? <Hash hex={f.code_hash_hex} /> : unavailable },
    {
      key: "expected",
      label: F.expected,
      value: f.expected_code_hash ? (
        <span className="flex flex-col items-start gap-1.5">
          <Hash hex={f.expected_code_hash} />
          {f.code_matches ? (
            <Pill tone="success" icon={Check}>
              {F.matches}
            </Pill>
          ) : null}
        </span>
      ) : (
        unavailable
      ),
    },
    { key: "mpc", label: F.mpc, value: f.mpc_version ?? unavailable },
  ];
}

export default async function ContractPage() {
  const f = await getContractFacts();
  const strict = f.role !== "dev";
  return (
    <article className="flex max-w-215 flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <h1 className="m-0 font-display text-title text-ink">{strict ? copy.contract.h1 : copy.contract.devH1}</h1>
        <p className="m-0 max-w-[68ch] font-sans text-body text-ink-muted">
          {strict ? copy.contract.sub(f.account_id) : (f.access_keys ?? 0) > 0 ? copy.contract.devSub : copy.contract.devSubLocked}
        </p>
        {strict && f.locked ? (
          <p data-testid="keyless" className="m-0 inline-flex items-center gap-2 self-start rounded-pill bg-surface-sunken py-2 pr-3.5 pl-2.5 font-sans text-label text-success">
            <Icon icon={Lock} size={18} />
            {copy.contract.keyless}
          </p>
        ) : null}
      </header>

      <dl className="m-0 rounded-md border border-line bg-surface" data-judge-facts>
        {factRows(f).map((r) => (
          <div
            key={r.key}
            data-fact={r.key}
            className="relative grid gap-0.5 px-4 py-3 min-[560px]:grid-cols-[150px_minmax(0,1fr)] min-[560px]:gap-x-4 [&+&]:before:absolute [&+&]:before:inset-x-4 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-line [&+&]:before:content-['']"
          >
            <dt className="font-sans text-body-sm text-ink-muted">{r.label}</dt>
            <dd className="m-0 min-w-0 font-sans text-[0.9375rem] leading-5.5 wrap-anywhere text-ink t-num">{r.value}</dd>
          </div>
        ))}
      </dl>

      {f.config ? (
        <details className="group rounded-md border border-line bg-surface">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 font-sans text-label text-ink [&::-webkit-details-marker]:hidden">
            {F.config}
            <Icon icon={ChevronDown} size={20} className="text-ink-muted transition-transform duration-150 group-open:rotate-180" />
          </summary>
          <pre className="m-0 px-4 pb-4 font-mono text-address whitespace-pre-wrap text-ink-muted wrap-anywhere">{JSON.stringify(f.config, null, 2)}</pre>
        </details>
      ) : null}

      <section aria-labelledby="verify-title" className="flex flex-col gap-3">
        <h2 id="verify-title" className="m-0 font-display text-heading text-ink">
          {copy.contract.verifyTitle}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {commands(f.account_id, f.birth_tx, strict).map((c) => (
            <li key={c.cmd} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-md border border-line bg-surface py-3 pr-3 pl-4">
              <p className="col-span-full m-0 font-sans text-body-sm font-semibold text-ink-muted">{c.what}</p>
              <code className="pt-3 font-mono text-[0.8125rem] leading-5 font-[450] wrap-anywhere text-ink">{c.cmd}</code>
              <CopyButton value={c.cmd} label={copy.contract.cmd.copy} toastText={copy.contract.cmd.copied} />
            </li>
          ))}
        </ul>
      </section>

      <p className="m-0 font-sans text-body-sm text-ink-muted">{copy.contract.readAt(utcStamp(f.as_of))}</p>
    </article>
  );
}
