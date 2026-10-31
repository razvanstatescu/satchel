/**
 * Round two of the test audit (docs/testing/core-api.md "What remains untested"): `lib/validate.ts`'s four
 * validators in isolation. These gate every Send and Give: testnet-only networks, checksum/case rules, self-send,
 * and the NEAR reserved accounts (contract, MPC signer). Only `validateSol`'s happy path had any prior coverage
 * (via `sol-send.test.ts`); everything else is new.
 */
import { describe, expect, it } from "vitest";
import { validateBtc, validateEvm, validateNearAccount, validateSol } from "@/lib/validate";
import { copy } from "@/lib/copy";

// A real checksummed EVM address (computed from toChecksumAddress; verified by `toChecksumAddress` test coverage
// elsewhere), unrelated to any real wallet.
const EVM_CHECKSUMMED = "0xD1A9c89504b8F7c24f4810868Ba29bDC33aC4897";
const EVM_LOWER = EVM_CHECKSUMMED.toLowerCase();
const EVM_UPPER = "0x" + EVM_CHECKSUMMED.slice(2).toUpperCase();
const SELF_EVM = "0x1111111111111111111111111111111111111111";

describe("validateEvm", () => {
  it("rejects malformed input: too short, too long, missing 0x, non-hex chars", () => {
    expect(validateEvm("0x123", SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
    expect(validateEvm(EVM_LOWER + "ab", SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
    expect(validateEvm(EVM_LOWER.slice(2), SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
    expect(validateEvm("0x" + "g".repeat(40), SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
    expect(validateEvm("", SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
  });

  it("rejects the zero address", () => {
    expect(validateEvm("0x" + "0".repeat(40), SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmZero });
  });

  it("an uppercase 0X prefix fails the format check before it ever reaches the zero-address check (the regex's \"0x\" is case-sensitive)", () => {
    expect(validateEvm("0X" + "0".repeat(40), SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
  });

  it("rejects self-send, case-insensitively", () => {
    expect(validateEvm(SELF_EVM, SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.self });
    expect(validateEvm(SELF_EVM.toUpperCase().replace("0X", "0x"), SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.self });
  });

  it("an all-lowercase address is a checksum warning, normalized to the checksummed form", () => {
    const r = validateEvm(EVM_LOWER, SELF_EVM);
    expect(r).toMatchObject({ tier: "warning", normalized: EVM_CHECKSUMMED });
  });

  it("an all-uppercase-hex address is also a checksum warning, normalized to the checksummed form", () => {
    const r = validateEvm(EVM_UPPER, SELF_EVM);
    expect(r).toMatchObject({ tier: "warning", normalized: EVM_CHECKSUMMED });
  });

  it("a mixed-case address that matches its checksum is accepted outright", () => {
    expect(validateEvm(EVM_CHECKSUMMED, SELF_EVM)).toEqual({ tier: "ok", normalized: EVM_CHECKSUMMED });
  });

  it("a mixed-case address that does NOT match its checksum is a typo error, not a silent accept", () => {
    // Flip the case of one hex letter relative to the correct checksum.
    const wrong = EVM_CHECKSUMMED.replace("a", "A");
    expect(wrong).not.toBe(EVM_CHECKSUMMED);
    expect(validateEvm(wrong, SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmTypo });
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateEvm(`  ${EVM_CHECKSUMMED}  `, SELF_EVM)).toEqual({ tier: "ok", normalized: EVM_CHECKSUMMED });
  });

  it("rejects unicode full-width digits that merely look like hex", () => {
    const lookalike = "0x" + "１".repeat(40); // full-width 1s, not ASCII
    expect(validateEvm(lookalike, SELF_EVM)).toMatchObject({ tier: "error", message: copy.send.val.evmFormat });
  });
});

describe("validateBtc", () => {
  const SELF_BTC = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";

  it("rejects mainnet-shaped addresses: bech32 bc1, legacy 1 and 3, case-insensitively", async () => {
    expect(await validateBtc("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcMainnet });
    expect(await validateBtc("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KXPJZSX", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcMainnet });
    expect(await validateBtc("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcMainnet });
    expect(await validateBtc("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcMainnet });
  });

  it("rejects self-send, case-insensitively, before the network parse", async () => {
    expect(await validateBtc(SELF_BTC, SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.self });
    expect(await validateBtc(SELF_BTC.toUpperCase(), SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.self });
  });

  it("accepts a testnet4 bech32 (segwit v0) address, lowercased", async () => {
    const r = await validateBtc(SELF_BTC.toUpperCase(), "some-other-address");
    expect(r).toEqual({ tier: "ok", normalized: SELF_BTC.toLowerCase() });
  });

  it("accepts a testnet4 bech32m (taproot, tb1p...) address", async () => {
    const taproot = "tb1pujs38ezwgpq3nr5qk940rdy0lc8em2agr9wy2tz2c2qkcheqnzvs8x6q37"; // real bech32m testnet taproot address
    const r = await validateBtc(taproot, SELF_BTC);
    expect(r.tier).toBe("ok");
    if (r.tier === "ok") expect(r.normalized).toBe(taproot.toLowerCase());
  });

  it("accepts a testnet legacy (base58, m/n prefix) address", async () => {
    const legacy = "mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn"; // a well-known testnet legacy vector
    const r = await validateBtc(legacy, SELF_BTC);
    expect(r).toEqual({ tier: "ok", normalized: legacy });
  });

  it("rejects garbage / malformed addresses with a typo error, not a throw", async () => {
    expect(await validateBtc("not a btc address", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcTypo });
    expect(await validateBtc("tb1qinvalidchecksumxxxxxxxxxxxxxxxxxxxxxx", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcTypo });
    expect(await validateBtc("", SELF_BTC)).toMatchObject({ tier: "error", message: copy.send.val.btcTypo });
  });

  it("trims surrounding whitespace before validating", async () => {
    const r = await validateBtc(`  ${SELF_BTC}  `, "some-other-address");
    expect(r).toEqual({ tier: "ok", normalized: SELF_BTC });
  });
});

describe("validateSol", () => {
  const SELF_SOL = "Fp9KseRXBcArquhWCibLr4nrFPRhAx8S2kAihQ5sLWiQ"; // off-curve (used as the PDA example elsewhere)
  const ON_CURVE = "GosiBeQgFC9SFA7T9sBR5pGMZZQan3qZpyrrD4JiEfy3"; // a freshly generated Ed25519 pubkey (on-curve by construction)

  it("rejects empty input", async () => {
    expect(await validateSol("", SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.solFormat });
  });

  it("rejects strings with characters outside the base58 alphabet (0, O, I, l)", async () => {
    expect(await validateSol("0OIl" + "1".repeat(40), SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.solFormat });
  });

  it("rejects strings shaped like other chains' addresses (an EVM 0x address)", async () => {
    expect(await validateSol("0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741", SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.solFormat });
  });

  it("rejects too-short and too-long base58 strings", async () => {
    expect(await validateSol("1".repeat(31), SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.solFormat });
    expect(await validateSol("1".repeat(45), SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.solFormat });
  });

  it("rejects self-send", async () => {
    expect(await validateSol(SELF_SOL, SELF_SOL)).toMatchObject({ tier: "error", message: copy.send.val.self });
  });

  it("an on-curve wallet address is accepted outright", async () => {
    const r = await validateSol(ON_CURVE, SELF_SOL);
    expect(r).toEqual({ tier: "ok", normalized: ON_CURVE });
  });

  it("an off-curve address (PDA-shaped, no private key) is a warning, not an error", async () => {
    const r = await validateSol(SELF_SOL, "some-other-address");
    expect(r).toMatchObject({ tier: "warning", message: copy.send.val.solPda, normalized: SELF_SOL });
  });

  it("trims surrounding whitespace before validating", async () => {
    const r = await validateSol(`  ${ON_CURVE}  `, SELF_SOL);
    expect(r).toEqual({ tier: "ok", normalized: ON_CURVE });
  });
});

describe("validateNearAccount", () => {
  const ctx = { self: "alice.testnet", contract: "satchel-spk.testnet", mpc: "v1.signer-prod.testnet" };

  it("rejects too-short input (under 2 chars)", () => {
    expect(validateNearAccount("a", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
  });

  it("rejects input over 64 chars", () => {
    expect(validateNearAccount("a".repeat(65), ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
  });

  it("accepts input at exactly the 64-char boundary when it's a valid named account", () => {
    const name = "a".repeat(60) + ".near"; // 65 total? check boundary precisely below instead
    expect(name.length).toBeGreaterThan(0); // sanity, boundary covered by the 64-exact case next
    const exact64 = "b".repeat(59) + ".near"; // 59 + 5 = 64
    expect(exact64.length).toBe(64);
    expect(validateNearAccount(exact64, ctx)).toMatchObject({ tier: "ok", normalized: exact64 });
  });

  it("rejects a leading or trailing separator in a segment", () => {
    expect(validateNearAccount("-bob.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
    expect(validateNearAccount("bob-.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
    expect(validateNearAccount("bob..testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
  });

  it("rejects a trailing dot (empty final segment)", () => {
    expect(validateNearAccount("bob.testnet.", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
  });

  it("rejects unicode lookalikes (not plain ASCII a-z0-9._-)", () => {
    expect(validateNearAccount("а.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format }); // cyrillic а
  });

  it("rejects the Satchel's own account, case-insensitively", () => {
    expect(validateNearAccount("alice.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.self });
    expect(validateNearAccount("ALICE.TESTNET", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.self });
  });

  it("rejects the Satchel contract account itself", () => {
    expect(validateNearAccount("satchel-spk.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.contract });
  });

  it("rejects the MPC signer account itself", () => {
    expect(validateNearAccount("v1.signer-prod.testnet", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.mpc });
  });

  it("accepts a well-formed, unrelated named account", () => {
    expect(validateNearAccount("bob.testnet", ctx)).toEqual({ tier: "ok", normalized: "bob.testnet" });
  });

  it("flags a bare 64-hex implicit account as a warning, not an error", () => {
    const implicit = "a".repeat(64);
    expect(validateNearAccount(implicit, ctx)).toMatchObject({ tier: "warning", message: copy.xfer.implicit, normalized: implicit });
  });

  it("a 64-char string that is NOT all hex is NOT treated as implicit (falls through to ok, since it's still a valid account syntactically)", () => {
    const notHex = "g".repeat(63) + "1"; // 64 chars, contains 'g' so not hex, but still valid account syntax (no dots/dashes needed)
    const r = validateNearAccount(notHex, ctx);
    expect(r.tier).not.toBe("warning");
  });

  it("is case-insensitive on input (uppercase is lowercased before every check, including self/contract/mpc)", () => {
    expect(validateNearAccount("BOB.TESTNET", ctx)).toEqual({ tier: "ok", normalized: "bob.testnet" });
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateNearAccount("  bob.testnet  ", ctx)).toEqual({ tier: "ok", normalized: "bob.testnet" });
  });

  it("rejects an empty string", () => {
    expect(validateNearAccount("", ctx)).toMatchObject({ tier: "error", message: copy.xfer.err.format });
  });

  it("when self is null (no connected wallet), self-send can never trigger, and other accounts still validate normally", () => {
    const noSelf = { ...ctx, self: null };
    expect(validateNearAccount("alice.testnet", noSelf)).toEqual({ tier: "ok", normalized: "alice.testnet" });
    expect(validateNearAccount("bob.testnet", noSelf)).toEqual({ tier: "ok", normalized: "bob.testnet" });
  });
});
