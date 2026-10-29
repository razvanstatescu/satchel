import { describe, expect, it } from "vitest";
import { classifySignRequest, maxSignedEvmNonce } from "@satchel/core/policy";
import { prepareSend } from "@/lib/chains/send";
import { FIXTURE_RECORDS } from "@/lib/data/fixtures";
import { satchelAddresses } from "@/lib/derive";
import { errorCopy } from "@/lib/copy";

/**
 * kb/90 §5.9 nonce-gap rule (D-43; security review S-04): the Send builder never builds an EVM request the contract
 * would refuse with ERR_EVM_NONCE_GAP (first request: nonce ≤ 1; then ≤ highest signed + 1).
 */
const TO = satchelAddresses("2").evm;
const recs = FIXTURE_RECORDS["1"]!; // one EVM record at nonce 0

describe("EVM send builder and the nonce-gap rule", () => {
  it("builds the next nonce and a retry of an earlier one; the request passes the contract's rule", async () => {
    expect(maxSignedEvmNonce(recs)).toBe(0n);
    for (const evmNonce of [undefined, 0, 1]) {
      const p = await prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: recs, reuse: evmNonce === undefined ? undefined : { evmNonce } });
      const c = classifySignRequest(p.request as never, { evmMaxSignedNonce: maxSignedEvmNonce(recs) });
      expect(c.ok, `nonce ${p.evmNonce}`).toBe(true);
    }
  });

  it("refuses to build a nonce more than one above the highest signed nonce", async () => {
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: recs, reuse: { evmNonce: 2 } })).rejects.toMatchObject({
      problem: "evm_nonce_gap",
      message: expect.stringMatching(/nonce 1 or lower/),
    });
    // a token without EVM records: 0 and 1 are fine, 2 is not
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: [], reuse: { evmNonce: 1 } })).resolves.toMatchObject({ evmNonce: 1 });
    await expect(prepareSend({ tokenId: "1", chain: "evm", to: TO, amount: 1000n, records: [], reuse: { evmNonce: 2 } })).rejects.toMatchObject({ problem: "evm_nonce_gap" });
  });

  it("maps the contract's ERR_EVM_NONCE_GAP to its own sentence", () => {
    expect(errorCopy("ERR_EVM_NONCE_GAP", { id: "1", chain: "evm" })).toMatch(/Nothing was signed/);
  });
});
