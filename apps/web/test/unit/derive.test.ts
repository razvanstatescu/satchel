import { describe, expect, it } from "vitest";
import { satchelAddresses } from "@/lib/derive";

// research/final-addresses.md (cross-checked live against v1.signer-prod.testnet derived_public_key, domains 0 and 1)
describe("derived addresses via @satchel/core", () => {
  it("matches the pre-computed final #1 addresses", () => {
    const a = satchelAddresses("1", "satchel.satchelhq.testnet");
    expect(a.btc).toBe("tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5");
    expect(a.evm.toLowerCase()).toBe("0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad");
    expect(a.sol).toBe("AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd");
    expect(a.paths).toEqual({ btc: "satchel/1/btc", evm: "satchel/1/evm", sol: "satchel/1/sol" });
  });
  it("matches final #4 and dev1 #1", () => {
    expect(satchelAddresses("4", "satchel.satchelhq.testnet").btc).toBe("tb1qujvrkz47vga3razn2fpegp9gfqfcnwcvf6cl7f");
    expect(satchelAddresses("1", "dev1.satchelhq.testnet").evm.toLowerCase()).toBe("0x355180f2d253833dfb736b05561588d7d4bc7db3");
  });
});
