// THROWAWAY: what a Satchel client would import from chainsig.js
import { chainAdapters, contracts, utils } from 'chainsig.js'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
export async function run() {
  const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
  const evm = new chainAdapters.evm.EVM({ publicClient: createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') }) as any, contract })
  const a = await evm.deriveAddressAndPublicKey('satchel.example.testnet', 'satchel/1/evm')
  const btc = new chainAdapters.btc.Bitcoin({ network: 'testnet', contract, btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })
  const b = await btc.deriveAddressAndPublicKey('satchel.example.testnet', 'satchel/1/btc')
  const rsv = utils.cryptography.toRSV({ big_r: { affine_point: '02' + '11'.repeat(32) }, s: { scalar: '22'.repeat(32) }, recovery_id: 1 } as any)
  return { evm: a.address, btc: b.address, rsv }
}
(globalThis as any).__run = run
