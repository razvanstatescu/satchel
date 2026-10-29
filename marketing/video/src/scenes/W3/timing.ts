import { getScene, type SceneData } from "../../lib/timeline";

/**
 * W3 choreography from the VO (seconds, scene-relative). L22 "Then spend it like any wallet." carries the review and
 * the press; L23 "Approve in your NEAR wallet, and NEAR Chain Signatures signs a native Bitcoin, Ethereum or Solana
 * transaction." carries the approval, the tracker and the three receipts. Every beat is clamped so the order holds
 * even if the voice is re-timed.
 */

/** Start of the n-th (0-based) word of a line that starts with `prefix` (punctuation-insensitive). */
function nth(sc: SceneData, lineId: string, prefix: string, n = 0): number | null {
  const l = sc.line(lineId);
  const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9#']/g, "");
  const hits = l.words.filter((w) => clean(w.text).startsWith(clean(prefix)));
  const w = hits[Math.min(n, hits.length - 1)];
  return w ? l.start + w.start : null;
}

export function w3Timing() {
  const sc = getScene("W3");
  const A = sc.line("L22");
  const B = sc.line("L23");
  const D = sc.duration;
  const a = (p: string, fb: number) => nth(sc, "L22", p) ?? fb;
  const b = (p: string, fb: number, n = 0) => nth(sc, "L23", p, n) ?? fb;
  const at = (x: number) => B.start + x * B.duration; // fallback by proportion

  // ---- Beat A: the card → the amount → the review → the press ("Then spend it like any wallet.")
  const spend = a("spend", A.start + 0.4);
  const cut = Math.max(0.3, spend - 0.1); // push into the BTC chip ends here; the amount slams in
  const pushStart = Math.max(0, cut - 0.34);
  const fly = cut + 0.5; // the amount flies into the review sheet
  const flyEnd = fly + 0.5;
  // the OutcomeCard builds once the amount has landed (nothing appears under the flying amount)
  const fromRow = flyEnd - 0.1;
  const toRow = fromRow + 0.1;
  const addr = toRow + 0.08; // grouped address types in, group by group
  const addrEnd = addr + 0.4;
  const check = addrEnd + 0.02;
  const feeRow = fromRow + 0.26;
  const action = fromRow + 0.34;
  const sheen = action + 0.12;
  const cap1 = fly + 0.3; // once the flying amount has cleared the left rail
  const approve = B.start + (B.words[0]?.start ?? 0);
  const press = Math.min(Math.max(A.end + 0.15, fly + 0.95), Math.max(fly + 0.8, approve - 0.25));
  const ctaWallet = press + 0.12; // label → "Approve in your wallet…"

  // ---- Beat B: the neutral wallet sheet ("Approve in your NEAR wallet,")
  const sheetIn = Math.max(press + 0.2, approve - 0.15);
  const walletB = b("wallet", at(0.2));
  const and = b("and", at(0.25));
  const approvePress = Math.min(Math.max(walletB + 0.2, sheetIn + 0.9), Math.max(sheetIn + 0.7, and - 0.12));
  const approved = approvePress + 0.08;
  const sheetOut = approved + 0.12; // the wallet window closes (0.12 s)

  // ---- Beat C: the tracker ("and NEAR Chain Signatures signs a native")
  const trackerIn = Math.max(sheetOut + 0.14, and - 0.1); // hard cut to the tracker
  const sigAt = b("signatures", at(0.37));
  const jumpCut = Math.max(trackerIn + 0.75, sigAt - 0.1);
  const signs = b("signs", at(0.46));
  const signed = Math.max(jumpCut + 0.35, signs);
  const bcActive = signed + 0.12;
  const native = b("native", at(0.52));
  const sent = Math.max(signed + 0.35, native);

  // ---- Beat D: three receipts ("Bitcoin, Ethereum or Solana transaction.") and "Spend on any chain."
  const btc = Math.max(sent + 0.3, b("bitcoin", at(0.58)));
  const eth = Math.max(btc + 0.35, b("ethereum", at(0.69)));
  const sol = Math.max(eth + 0.35, b("solana", at(0.83)));
  const cap1Out = trackerIn - 0.15;
  const cap2 = Math.max(trackerIn + 0.1, cap1Out + 0.34); // after caption 1 has fully left
  const cap2Out = btc - 0.12;
  const cap3 = Math.max(btc + 0.22, cap2Out + 0.34);

  return {
    D, A, B, spend, cut, pushStart, fly, flyEnd, fromRow, toRow, addr, addrEnd, check, feeRow, action, sheen, cap1, approve,
    press, ctaWallet, sheetIn, walletB, and, approvePress, approved, sheetOut, trackerIn, cap2, sigAt, jumpCut, signs,
    signed, bcActive, native, sent, btc, eth, sol, cap3, cap1Out, cap2Out,
  };
}

export type W3T = ReturnType<typeof w3Timing>;
