'use client';
// THROWAWAY spike: what does near-connect's signAndSendTransaction return for a long-running (MPC yield) tx?
import { useEffect, useRef, useState } from 'react';
import { NearConnector } from '@hot-labs/near-connect';

export default function WalletProbe() {
  const [out, setOut] = useState<string[]>([]);
  const conn = useRef<NearConnector | null>(null);
  const t0 = useRef(0);
  const log = (s: string) => setOut((o) => [...o, `[+${t0.current ? Date.now() - t0.current : 0}ms] ${s}`]);
  useEffect(() => {
    const c = new NearConnector({ network: 'testnet', footerBranding: null });
    c.on('wallet:signIn', (e) => log('event wallet:signIn ' + JSON.stringify(e.accounts)));
    c.on('wallet:signOut', () => log('event wallet:signOut'));
    conn.current = c;
    c.whenManifestLoaded.then(() => log('manifest loaded; testnet wallets=' + c.availableWallets.map((w) => w.manifest.id).join(',')));
  }, []);
  async function connect(walletId?: string) {
    try { const w = await conn.current!.connect(walletId ? { walletId } : {}); log('connected ' + JSON.stringify(await w.getAccounts())); }
    catch (e) { log('connect ERR ' + (e as Error).message); }
  }
  async function signMpc() {
    t0.current = Date.now();
    const payload = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');
    log('calling wallet.signAndSendTransaction (MPC sign, payload ' + payload.slice(0, 8) + '...)');
    try {
      const w = await conn.current!.wallet();
      const r = await w.signAndSendTransaction({
        receiverId: 'v1.signer-prod.testnet',
        actions: [{ type: 'FunctionCall', params: { methodName: 'sign', args: { request: { payload_v2: { Ecdsa: payload }, path: 'satchel/web-wallet-probe/evm', domain_id: 0 } }, gas: '50000000000000', deposit: '1' } }],
      });
      const st = r?.status as unknown;
      log('RESOLVED tx=' + r?.transaction?.hash + ' final_execution_status=' + (r as { final_execution_status?: string })?.final_execution_status + ' status=' + JSON.stringify(st)?.slice(0, 120) + ' receipts=' + r?.receipts_outcome?.length);
      (window as unknown as { __lastResult: unknown }).__lastResult = r;
    } catch (e) { log('REJECTED ' + (e as Error).message); }
    log('DONE');
  }
  return (
    <main style={{ padding: 16 }}>
      <button id="connect-cli" onClick={() => connect('near-cli')}>Connect NEAR CLI</button>{' '}
      <button id="connect-any" onClick={() => connect()}>Connect (modal)</button>{' '}
      <button id="sign-mpc" onClick={signMpc}>Sign via MPC</button>
      <pre id="out">{out.join('\n')}</pre>
    </main>
  );
}
