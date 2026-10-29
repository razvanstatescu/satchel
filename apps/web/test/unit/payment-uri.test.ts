import { describe, expect, it } from "vitest";
import { buildBip21, buildEip681, buildEip681Erc20, buildPaymentUri, buildSolanaPay, validateChainAmount } from "@/lib/payment-uri";

/**
 * A4: Request coins' payment URIs (Add coins' optional amount field). Exact-string vectors, so a future change to
 * formatting or chain ids is a deliberate, visible diff.
 */

const BTC_ADDR = "tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5";
const EVM_ADDR = "0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad";
const SOL_ADDR = "AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd";

describe("BIP-21 (Bitcoin)", () => {
  it("bitcoin:<address>?amount=<BTC decimal>, trailing zeros trimmed", () => {
    expect(buildBip21(BTC_ADDR, 123_000_000n)).toBe(`bitcoin:${BTC_ADDR}?amount=1.23`);
    expect(buildBip21(BTC_ADDR, 1n)).toBe(`bitcoin:${BTC_ADDR}?amount=0.00000001`);
    expect(buildBip21(BTC_ADDR, 100_000_000n)).toBe(`bitcoin:${BTC_ADDR}?amount=1`);
  });
});

describe("EIP-681 (Ethereum Sepolia)", () => {
  it("ethereum:<address>@11155111?value=<integer wei>, never decimal ETH", () => {
    expect(buildEip681(EVM_ADDR, 1_000_000_000_000_000_000n)).toBe(`ethereum:${EVM_ADDR}@11155111?value=1000000000000000000`);
    expect(buildEip681(EVM_ADDR, 1n)).toBe(`ethereum:${EVM_ADDR}@11155111?value=1`);
  });
});

describe("EIP-681 with a chain id (C3: Base, Arbitrum and OP Sepolia)", () => {
  it("names the network with @<chainId>", () => {
    expect(buildEip681(EVM_ADDR, 1_000_000_000_000_000n, 84532)).toBe(`ethereum:${EVM_ADDR}@84532?value=1000000000000000`);
    expect(buildEip681(EVM_ADDR, 1n, 421614)).toBe(`ethereum:${EVM_ADDR}@421614?value=1`);
    expect(buildEip681(EVM_ADDR, 1n, 11155420)).toBe(`ethereum:${EVM_ADDR}@11155420?value=1`);
    expect(buildPaymentUri("evm", EVM_ADDR, 1n, { chainId: 84532 })).toBe(`ethereum:${EVM_ADDR}@84532?value=1`);
  });
});

describe("EIP-681 token transfer (C2: USDC, 6 decimals)", () => {
  const BASE_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  it("ethereum:<token>@<chainId>/transfer?address=<this Satchel>&uint256=<base units>", () => {
    expect(buildEip681Erc20(BASE_USDC, EVM_ADDR, 1_500_000n, 84532)).toBe(`ethereum:${BASE_USDC}@84532/transfer?address=${EVM_ADDR}&uint256=1500000`);
    expect(buildPaymentUri("evm", EVM_ADDR, 1_500_000n, { chainId: 84532, usdc: BASE_USDC })).toBe(`ethereum:${BASE_USDC}@84532/transfer?address=${EVM_ADDR}&uint256=1500000`);
  });
  it("validates USDC amounts to 6 decimals", () => {
    expect(validateChainAmount("1.5", "evm", "usdc")).toEqual({ ok: true, base: 1_500_000n, decimal: "1.5" });
    expect(validateChainAmount("0.000001", "evm", "usdc")).toMatchObject({ ok: true, base: 1n });
    expect(validateChainAmount("0.0000001", "evm", "usdc")).toEqual({ ok: false });
    expect(validateChainAmount("0", "evm", "usdc")).toEqual({ ok: false });
  });
});

describe("Solana Pay (Solana devnet)", () => {
  it("solana:<address>?amount=<SOL decimal>, trailing zeros trimmed", () => {
    expect(buildSolanaPay(SOL_ADDR, 500_000_000n)).toBe(`solana:${SOL_ADDR}?amount=0.5`);
    expect(buildSolanaPay(SOL_ADDR, 1n)).toBe(`solana:${SOL_ADDR}?amount=0.000000001`);
  });
});

describe("buildPaymentUri (dispatch by chain)", () => {
  it("matches the per-chain builder", () => {
    expect(buildPaymentUri("btc", BTC_ADDR, 123_000_000n)).toBe(buildBip21(BTC_ADDR, 123_000_000n));
    expect(buildPaymentUri("evm", EVM_ADDR, 1n)).toBe(buildEip681(EVM_ADDR, 1n));
    expect(buildPaymentUri("sol", SOL_ADDR, 1n)).toBe(buildSolanaPay(SOL_ADDR, 1n));
  });
});

describe("validateChainAmount", () => {
  it("accepts a plain decimal within the chain's decimals", () => {
    expect(validateChainAmount("1.23", "btc")).toEqual({ ok: true, base: 123_000_000n, decimal: "1.23" });
    expect(validateChainAmount("0.5", "sol")).toEqual({ ok: true, base: 500_000_000n, decimal: "0.5" });
    expect(validateChainAmount("1", "evm")).toEqual({ ok: true, base: 1_000_000_000_000_000_000n, decimal: "1" });
  });

  it.each([
    ["", "btc"],
    ["0", "btc"],
    ["-1", "btc"],
    ["1.234567891", "btc"], // 9 decimals, BTC allows 8
    ["1.2345678901234567891", "evm"], // 19 decimals, ETH allows 18
    ["1.2345678901", "sol"], // 10 decimals, SOL allows 9
    ["abc", "btc"],
    ["1.2.3", "btc"],
    ["NaN", "evm"],
  ] as const)("rejects %s on %s (empty, zero, negative or too many decimals)", (input, chain) => {
    expect(validateChainAmount(input, chain)).toEqual({ ok: false });
  });

  it("accepts exactly the chain's maximum decimals", () => {
    expect(validateChainAmount("0.00000001", "btc")).toMatchObject({ ok: true, base: 1n });
    expect(validateChainAmount("0.000000001", "sol")).toMatchObject({ ok: true, base: 1n });
    expect(validateChainAmount("0.000000000000000001", "evm")).toMatchObject({ ok: true, base: 1n });
  });
});
