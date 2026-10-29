'use client';
// THROWAWAY spike: does chainsig.js + bitcoinjs-lib + viem + near-connect bundle and run in a Next 16 client bundle?
import { useEffect, useState } from 'react';
import { chainAdapters, contracts } from 'chainsig.js';
import * as bitcoin from 'bitcoinjs-lib';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { NearConnector } from '@hot-labs/near-connect';
import { JsonRpcProvider } from 'near-api-js';
import { Buffer as BufferPolyfill } from 'buffer';

const RPCS = ['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'];

const Buffer_hex = (a: number[]) => a.map((x) => x.toString(16).padStart(2, '0')).join('');
export default function Probe() {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    const log = (s: string) => setOut((o) => [...o, s]);
    (async () => {
      log('Buffer global before: ' + typeof (globalThis as { Buffer?: unknown }).Buffer);
      try {
        const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet', fallbackRpcUrls: RPCS });
        const evm = new chainAdapters.evm.EVM({ publicClient: createPublicClient({ chain: sepolia, transport: http() }), contract });
        const e = await evm.deriveAddressAndPublicKey('satchel-spk-web-e9ea1a.testnet', 'satchel/1/evm');
        log('evm address ' + e.address);
      } catch (err) { log('EVM ERR ' + String((err as Error)?.stack ?? err).slice(0, 400)); }
      try {
        const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet', fallbackRpcUrls: RPCS });
        const btc = new chainAdapters.btc.Bitcoin({ network: 'testnet', contract, btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') });
        const b = await btc.deriveAddressAndPublicKey('satchel-spk-web-e9ea1a.testnet', 'satchel/1/btc');
        log('btc address ' + b.address + ' pub ' + b.publicKey.slice(0, 10) + '...');
        // exercise chainsig's bundled bitcoinjs-lib v6 PSBT path (heavy free-variable Buffer use)
        const script = BufferPolyfill.from(bitcoin.address.toOutputScript(b.address, bitcoin.networks.testnet));
        const prep = await btc.prepareTransactionForSigning({
          publicKey: b.publicKey,
          inputs: [{ txid: 'aa'.repeat(32), vout: 0, value: 10000, scriptPubKey: script }],
          outputs: [{ address: b.address, value: 5000 }],
        } as never);
        log('btc prepareTransactionForSigning ok, hashesToSign=' + prep.hashesToSign.length + ' first=' + Buffer_hex(prep.hashesToSign[0] as number[]).slice(0, 16));
      } catch (err) { log('BTC ERR ' + String((err as Error)?.stack ?? err).slice(0, 400)); }
      try {
        const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
        psbt.addOutput({ address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', value: 1000n as unknown as never });
        log('bitcoinjs-lib v7 psbt ok, outputs=' + psbt.txOutputs.length);
      } catch (err) { log('PSBT ERR ' + String((err as Error)?.message ?? err).slice(0, 300)); }
      try {
        const p = new JsonRpcProvider({ url: RPCS[0] });
        const b = await p.viewBlock({ finality: 'final' });
        log('near-api-js block ' + b.header.height);
      } catch (err) { log('NAJ ERR ' + String((err as Error)?.message ?? err).slice(0, 300)); }
      try {
        const c = new NearConnector({ network: 'testnet' });
        await c.whenManifestLoaded;
        log('near-connect wallets ' + c.availableWallets.map((w) => w.manifest.id).join(','));
      } catch (err) { log('CONNECT ERR ' + String((err as Error)?.message ?? err).slice(0, 300)); }
      log('Buffer import resolves to: ' + typeof BufferPolyfill + ' isBuffer=' + typeof BufferPolyfill.isBuffer);
      log('Buffer global after: ' + typeof (globalThis as { Buffer?: unknown }).Buffer);
      log('DONE');
    })();
  }, []);
  return <pre id="out">{out.join('\n')}</pre>;
}
