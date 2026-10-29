import { describe, expect, it, vi } from 'vitest'
import type { PublicClient } from 'viem'
import evm from '../../../vectors/evm.json' with { type: 'json' }
import { buildErc20TransferTx,
  attachEvmSignature,
  blockscoutHistory,
  broadcastEvm,
  buildUnsignedEvmTx,
  createSepoliaClient,
  evmPayloadHash,
  finalizeEvmTx,
  parseUnsignedEvmTx,
  prepareEvmSend,
  SEPOLIA_RPCS,
  serializeUnsignedEvmTx,
  estimateTransferGas,
  EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK,
  EVM_CONTRACT_TRANSFER_GAS_FALLBACK,
} from '../src/chains/evm'
import { toHex } from '../src/bytes'
import type { MpcSignature } from '../src/near'

const KB31_RESP: MpcSignature = {
  scheme: 'Secp256k1',
  big_r: { affine_point: '02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c' },
  s: { scalar: '549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1' },
  recovery_id: 1,
}
const FROM = '0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d'
const TO = '0x61739f33AdbB7F76c1b5B222E4119085257528BE'

describe('evm builder', () => {
  it('reproduces the kb/31 48-byte unsigned tx and its keccak payload', () => {
    const tx = buildUnsignedEvmTx({ nonce: 0, to: TO, value: 10n ** 14n, maxFeePerGas: 200_028n, maxPriorityFeePerGas: 200_008n })
    const u = serializeUnsignedEvmTx(tx)
    expect(u).toBe('0x02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0')
    expect(toHex(evmPayloadHash(u))).toBe('bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377')
  })

  it('rebuilds every accepted vector byte for byte from its fields', () => {
    const acc = evm.vectors.filter((v) => v.expect.ok && v.expect.fields)
    expect(acc.length).toBeGreaterThanOrEqual(7)
    for (const v of acc) {
      const f = v.expect.fields as Record<string, string> & { erc20?: { to: string; amount: string } }
      if (BigInt(f.nonce!) > BigInt(Number.MAX_SAFE_INTEGER)) continue // viem takes number nonces; covered by the Rust/TS classifiers
      const common = {
        chainId: Number(f.chain_id),
        nonce: Number(f.nonce),
        gas: BigInt(f.gas_limit!),
        maxFeePerGas: BigInt(f.max_fee_per_gas!),
        maxPriorityFeePerGas: BigInt(f.max_priority_fee_per_gas!),
      }
      const tx = f.erc20
        ? buildErc20TransferTx({ ...common, recipient: `0x${f.erc20.to}`, amount: BigInt(f.erc20.amount) }) // C2
        : buildUnsignedEvmTx({ ...common, to: f.to as `0x${string}`, value: BigInt(f.value!) })
      expect(serializeUnsignedEvmTx(tx).slice(2), v.name).toBe(f.unsigned_tx)
      expect(toHex(evmPayloadHash(serializeUnsignedEvmTx(tx))), v.name).toBe(v.expect.hash)
    }
  })

  it('kb/70 F1 (52 B, nonce 7) parses and hashes to 8cb1…a1a9', () => {
    const f1 = '02f283aa36a7078459682f008506fc23ac0082520894000000000000000000000000000000000000dead872bb2c8eabcc00080c0'
    const tx = parseUnsignedEvmTx(f1, '8cb1b816dd6087e2a2680a1e77be488ee50a63fe49b1f384537c399513f6a1a9')
    expect(tx.nonce).toBe(7)
    expect(serializeUnsignedEvmTx(tx).slice(2)).toBe(f1)
    expect(() => parseUnsignedEvmTx(f1, '00'.repeat(32))).toThrow(/payload/)
  })

  it('refuses calldata and access lists at build time', () => {
    const tx = buildUnsignedEvmTx({ nonce: 0, to: TO, value: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n })
    expect(() => serializeUnsignedEvmTx({ ...tx, data: '0x095ea7b3' })).toThrow(/native/)
    expect(() => serializeUnsignedEvmTx({ ...tx, accessList: [{ address: TO, storageKeys: [] }] })).toThrow(/access/)
    expect(() => buildUnsignedEvmTx({ nonce: 0, to: '0x1234' as `0x${string}`, value: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n })).toThrow()
  })
})

describe('evm attach + verify (real MPC signature, kb/31 NEAR tx Dcc3gktA…)', () => {
  const tx = buildUnsignedEvmTx({ nonce: 0, to: TO, value: 10n ** 14n, maxFeePerGas: 200_028n, maxPriorityFeePerGas: 200_008n })

  it('attaches with yParity = recovery_id and recovers the derived address', async () => {
    const f = await finalizeEvmTx(tx, KB31_RESP, FROM)
    expect(f.from).toBe(FROM)
    expect(f.signed.startsWith('0x02f87183aa36a7')).toBe(true)
    expect(f.signed).toContain('c001a0f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0ca0549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1')
    expect(f.hash).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('refuses to finalize when the signature does not recover to the Satchel (wrong parity / wrong tx)', async () => {
    await expect(finalizeEvmTx(tx, { ...KB31_RESP, recovery_id: 0 } as MpcSignature, FROM)).rejects.toThrow(/recovers/)
    await expect(finalizeEvmTx({ ...tx, nonce: 1 }, KB31_RESP, FROM)).rejects.toThrow(/recovers/)
    expect(attachEvmSignature(tx, KB31_RESP)).toMatch(/^0x02/)
  })
})

describe('evm network helpers (mocked, no network)', () => {
  it('client uses the four spec RPCs, never the viem default', () => {
    expect([...SEPOLIA_RPCS]).toEqual(['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.ethpandaops.io', 'https://0xrpc.io/sep', 'https://sepolia.gateway.tenderly.co'])
    const c = createSepoliaClient()
    expect(c.chain?.id).toBe(11155111)
    expect(c.transport.type).toBe('fallback')
  })

  it('prepareEvmSend reads the pending nonce, fees and balance; "max" leaves the fee', async () => {
    const client = {
      getTransactionCount: vi.fn(async () => 5),
      estimateFeesPerGas: vi.fn(async () => ({ maxFeePerGas: 200_028n, maxPriorityFeePerGas: 200_008n })),
      getBalance: vi.fn(async () => 10n ** 16n),
      estimateGas: vi.fn(async () => 21_000n),
    } as unknown as PublicClient
    const p = await prepareEvmSend(client, { from: FROM, to: TO, value: 'max' })
    expect(client.getTransactionCount).toHaveBeenCalledWith({ address: FROM, blockTag: 'pending' })
    expect(p.tx.nonce).toBe(5)
    expect(p.tx.value).toBe(10n ** 16n - 21_000n * 200_028n)
    expect(toHex(p.payload)).toBe(toHex(evmPayloadHash(p.unsigned)))
    const reuse = await prepareEvmSend(client, { from: FROM, to: TO, value: 1n, nonce: 2 })
    expect(reuse.tx.nonce).toBe(2) // retry rule: reuse the earlier nonce (spec §8.7)
    await expect(prepareEvmSend(client, { from: FROM, to: TO, value: 10n ** 17n })).rejects.toThrow(/insufficient/)
  })

  it('gas: uses the node estimate (a new recipient costs 204,600 on Sepolia since its 2026 fork), never < 21,000', async () => {
    const at = (g: bigint) => ({ estimateGas: vi.fn(async () => g) }) as unknown as PublicClient
    expect(await estimateTransferGas(at(204_600n), { from: FROM, to: TO })).toBe(204_600n)
    expect(await estimateTransferGas(at(20_000n), { from: FROM, to: TO })).toBe(21_000n)
    const client = {
      getTransactionCount: vi.fn(async () => 0),
      estimateFeesPerGas: vi.fn(async () => ({ maxFeePerGas: 71n, maxPriorityFeePerGas: 51n })),
      getBalance: vi.fn(async () => 5n * 10n ** 16n),
      estimateGas: vi.fn(async () => 204_600n),
    } as unknown as PublicClient
    const p = await prepareEvmSend(client, { from: FROM, to: TO, value: 5n * 10n ** 15n })
    expect(p.tx.gas).toBe(204_600n)
    expect(p.feeMax).toBe(204_600n * 71n)
    expect(parseUnsignedEvmTx(p.unsigned).gas).toBe(204_600n) // the gas limit is in the bytes the contract signs
  })

  it('gas: when the node cannot estimate, an empty recipient gets 250,000, a contract 100,000, an existing EOA 21,000', async () => {
    const failing = (code: string, nonce: number, balance: bigint) =>
      ({
        estimateGas: vi.fn(async () => { throw new Error('method not found') }),
        getCode: vi.fn(async () => code),
        getTransactionCount: vi.fn(async () => nonce),
        getBalance: vi.fn(async () => balance),
      }) as unknown as PublicClient
    expect(await estimateTransferGas(failing('0x', 0, 0n), { from: FROM, to: TO })).toBe(EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK)
    expect(await estimateTransferGas(failing('0x6080', 1, 0n), { from: FROM, to: TO })).toBe(EVM_CONTRACT_TRANSFER_GAS_FALLBACK)
    expect(await estimateTransferGas(failing('0x', 3, 10n), { from: FROM, to: TO })).toBe(21_000n)
    const dead = { estimateGas: vi.fn(async () => { throw new Error('x') }), getCode: vi.fn(async () => { throw new Error('x') }) } as unknown as PublicClient
    expect(await estimateTransferGas(dead, { from: FROM, to: TO })).toBe(EVM_NEW_ACCOUNT_TRANSFER_GAS_FALLBACK)
  })

  it('broadcast: "already known" after a fallback retry is treated as sent when the hash is found', async () => {
    const { signed, hash } = await finalizeEvmTx(
      buildUnsignedEvmTx({ nonce: 0, to: TO, value: 10n ** 14n, maxFeePerGas: 200_028n, maxPriorityFeePerGas: 200_008n }),
      KB31_RESP,
      FROM,
    )
    const known = {
      sendRawTransaction: async () => {
        throw Object.assign(new Error('already known'), { details: 'already known' })
      },
      getTransaction: async () => ({ hash }),
    } as unknown as PublicClient
    expect(await broadcastEvm(known, signed)).toEqual({ hash, alreadyKnown: true })
    const funds = {
      sendRawTransaction: async () => {
        throw Object.assign(new Error('insufficient funds for gas * price + value: have 0 want 100004200588000'), {})
      },
      getTransaction: async () => null,
    } as unknown as PublicClient
    await expect(broadcastEvm(funds, signed)).rejects.toThrow(/insufficient funds/)
  })

  it('Blockscout history: simple GET, 404 = empty', async () => {
    const urls: string[] = []
    const f = (async (u: string) => {
      urls.push(u)
      return u.includes('dead') ? new Response('', { status: 404 }) : Response.json({ items: [{ hash: '0x1', nonce: 0 }], next_page_params: { block_number: 1 } })
    }) as unknown as typeof fetch
    const page = await blockscoutHistory(FROM, { fetch: f })
    expect(urls[0]).toBe(`https://eth-sepolia.blockscout.com/api/v2/addresses/${FROM}/transactions`)
    expect(page.items.length).toBe(1)
    await blockscoutHistory(FROM, { fetch: f, pageParams: page.next_page_params })
    expect(urls[1]).toContain('?block_number=1')
    expect(await blockscoutHistory('0xdead', { fetch: f })).toEqual({ items: [], next_page_params: null })
  })
})
