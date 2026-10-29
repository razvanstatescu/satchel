'use client';
// src/lib/near/wallet.tsx: ONE connector per tab (module singleton; StrictMode runs effects twice in dev)
import { NearConnector, type NearWalletBase } from '@hot-labs/near-connect';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

let connector: NearConnector | null = null;
export function getConnector() {
  if (typeof window === 'undefined') throw new Error('client only');
  return (connector ??= new NearConnector({ network: 'testnet', footerBranding: null }));
}
type Ctx = { accountId: string | null; wallet: NearWalletBase | null; signIn(): Promise<void>; signOut(): Promise<void>; ready: boolean };
const WalletCtx = createContext<Ctx | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, set] = useState<{ accountId: string | null; wallet: NearWalletBase | null; ready: boolean }>({ accountId: null, wallet: null, ready: false });
  useEffect(() => {
    const c = getConnector();
    const onIn = async ({ wallet, accounts }: { wallet: NearWalletBase; accounts: { accountId: string }[] }) => set({ wallet, accountId: accounts[0]?.accountId ?? null, ready: true });
    const onOut = () => set({ wallet: null, accountId: null, ready: true });
    c.on('wallet:signIn', onIn); c.on('wallet:signOut', onOut);
    c.getConnectedWallet().then(({ wallet, accounts }) => set({ wallet, accountId: accounts[0].accountId, ready: true })).catch(() => set((s) => ({ ...s, ready: true })));
    return () => { c.off('wallet:signIn', onIn); c.off('wallet:signOut', onOut); };
  }, []);
  const value: Ctx = { ...state, signIn: async () => { await getConnector().connect(); }, signOut: async () => { await getConnector().disconnect(); } };
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}
export const useWallet = () => { const v = useContext(WalletCtx); if (!v) throw new Error('WalletProvider missing'); return v; };
