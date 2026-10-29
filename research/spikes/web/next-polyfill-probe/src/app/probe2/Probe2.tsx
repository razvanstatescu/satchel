'use client';
// THROWAWAY spike: same stack minus chainsig.js, to compare client bundle weight.
import { useEffect, useState } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
import { createPublicClient, http, serializeTransaction, keccak256 } from 'viem';
import { sepolia } from 'viem/chains';
import { NearConnector } from '@hot-labs/near-connect';
import { JsonRpcProvider } from 'near-api-js';
export default function Probe2() {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    const log = (s: string) => setOut((o) => [...o, s]);
    (async () => {
      const pc = createPublicClient({ chain: sepolia, transport: http() });
      log('viem ok ' + typeof pc.getBalance + ' ' + keccak256(serializeTransaction({ chainId: 11155111, to: '0x0000000000000000000000000000000000000000', value: 1n, type: 'eip1559', maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, gas: 21000n, nonce: 0 })).slice(0, 10));
      log('bitcoinjs ' + typeof bitcoin.Psbt);
      const p = new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com' });
      log('near block ' + (await p.viewBlock({ finality: 'final' })).header.height);
      const c = new NearConnector({ network: 'testnet' }); await c.whenManifestLoaded;
      log('wallets ' + c.availableWallets.length);
      log('DONE');
    })();
  }, []);
  return <pre id="out">{out.join('\n')}</pre>;
}
