import { cx } from "@/components/ui";
import { groupAddress, truncateAddress } from "@/lib/format";

/**
 * An address in Geist Mono (mono only for addresses and hashes), server-safe.
 *
 * - `grouped` (the default; app-screens §0 #8): 4-character groups that wrap only BETWEEN groups, never inside one. The
 *   first two groups and the last are the "key" groups people compare (ink 600); the middle ones are ink-muted 450. The
 *   groups are spans with no separator, so the DOM text, `textContent`, copy and paste and a no-JS reader all get the raw
 *   address in one piece, and `fullAttr` marks it as the judge's full address (`data-full-address`).
 * - `truncated`: prefix + 4 … 4, with the full value as `title` and in the accessible name.
 * - `full`: the raw address, breaking anywhere (rarely right; prefer `grouped`).
 */

export interface AddressGroup {
  text: string;
  /** The first two groups and the last: the ones people compare. */
  key: boolean;
}

/** The address as its 4-character groups, the key ones marked. Joining every `text` gives back the address. Pure. */
export function addressGroups(address: string): AddressGroup[] {
  const g = groupAddress(address);
  return g.map((text, i) => ({ text, key: i < 2 || i === g.length - 1 }));
}

/** sm 13/18 (receipts, review) · md 14/20 (Inside rows, Facts) · lg 15/22 (the QR card). One size class each. */
const SIZE = {
  sm: "text-address",
  md: "text-[0.875rem]/5 font-[450]",
  lg: "text-[0.9375rem]/[1.375rem] font-[450]",
} as const;

export function AddressDisplay({
  address,
  mode = "grouped",
  name,
  fullAttr,
  size = "sm",
  align = "start",
  className,
}: {
  address: string;
  mode?: "truncated" | "full" | "grouped";
  /** The accessible name of a truncated address (it defaults to the address itself). */
  name?: string;
  /** Sets `data-full-address` (the judge facts: "btc" | "evm" | "sol"). */
  fullAttr?: string;
  size?: keyof typeof SIZE;
  /** `center` centres the wrapped lines (the QR card). */
  align?: "start" | "center";
  className?: string;
}) {
  if (mode === "truncated") {
    return (
      <span className={cx("font-mono whitespace-nowrap text-ink", SIZE[size], className)} title={address} aria-label={name ?? address}>
        {truncateAddress(address)}
      </span>
    );
  }
  if (mode === "full") {
    return (
      <span className={cx("font-mono break-all text-ink", SIZE[size], className)} data-full-address={fullAttr}>
        {address}
      </span>
    );
  }
  return (
    <span
      data-full-address={fullAttr}
      data-address={address}
      className={cx("inline-flex max-w-full flex-wrap gap-x-[.55ch] gap-y-0.5 font-mono", SIZE[size], align === "center" && "justify-center", className)}
    >
      {addressGroups(address).map((g, i) => (
        <span key={i} className={cx("whitespace-nowrap", g.key ? "font-semibold text-ink" : "text-ink-muted")}>
          {g.text}
        </span>
      ))}
    </span>
  );
}
