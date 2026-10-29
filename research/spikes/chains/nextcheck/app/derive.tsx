'use client'
import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

export default function Derive() {
  const [out, setOut] = useState('pending')
  useEffect(() => {
    ;(async () => {
      try {
        const { chainAdapters, contracts, utils } = await import('chainsig.js')
        const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
        const evm = new chainAdapters.evm.EVM({ publicClient: createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') }) as any, contract })
        const btc = new chainAdapters.btc.Bitcoin({ network: 'testnet', contract, btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })
        const sol = new chainAdapters.solana.Solana({ solanaConnection: {} as any, contract })
        const a = await evm.deriveAddressAndPublicKey('satchel.example.testnet', 'satchel/1/evm')
        const b = await btc.deriveAddressAndPublicKey('satchel.example.testnet', 'satchel/1/btc')
        const s = await sol.deriveAddressAndPublicKey('satchel.example.testnet', 'satchel/1/sol')
        const rsv = utils.cryptography.toRSV({ big_r: { affine_point: '02' + '11'.repeat(32) }, s: { scalar: '22'.repeat(32) }, recovery_id: 1 } as any)
        setOut('OK ' + JSON.stringify({ evm: a.address, btc: b.address, sol: s.address, v: rsv.v }))
      } catch (e: any) { setOut('RUN-ERROR ' + e?.message) }
    })()
  }, [])
  return <pre id="out">{out}</pre>
}
