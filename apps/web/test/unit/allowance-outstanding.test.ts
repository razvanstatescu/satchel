import { describe, expect, it } from "vitest";
import { activeDelegates, outstandingSigs } from "@/lib/allowanceView";
import type { CleanItem } from "@/lib/data/types";

/** R3-A-1 (a delegate's outstanding signatures) and R3-A-2 (who counts as an active delegate). */

const item = (seq: number, requester: string, status: CleanItem["status"]): CleanItem => ({
  seq,
  chain: "evm",
  key: `nonce ${seq}`,
  wouldPay: null,
  amountSource: "chain",
  evidence: "",
  evidenceUrl: null,
  status,
  signedAt: 0,
  height: 0,
  requester,
});

describe("outstandingSigs", () => {
  it("counts only this account's records that are not dead and not messages", () => {
    const items = [
      item(0, "bob.testnet", "unused"),
      item(1, "bob.testnet", "settling"),
      item(2, "bob.testnet", "unknown"),
      item(3, "bob.testnet", "spent"),
      item(4, "bob.testnet", "expired"),
      item(5, "bob.testnet", "unfunded"),
      item(6, "bob.testnet", "foreign"),
      item(7, "bob.testnet", "message"),
      item(8, "alice.testnet", "unused"),
    ];
    expect(outstandingSigs(items, "bob.testnet").map((i) => i.seq)).toEqual([0, 1, 2]);
    expect(outstandingSigs(items, "carol.testnet")).toEqual([]);
  });
});

describe("activeDelegates", () => {
  it("leaves out expired access but keeps paused", () => {
    expect(
      activeDelegates([
        { delegate: "a.testnet", status: "active" },
        { delegate: "b.testnet", status: "paused" },
        { delegate: "c.testnet", status: "expired" },
      ]),
    ).toEqual(["a.testnet", "b.testnet"]);
  });
});
