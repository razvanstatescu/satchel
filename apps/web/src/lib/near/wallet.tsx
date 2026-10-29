"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IS_FIXTURE } from "@/lib/config";
import type { WalletTx } from "@/lib/near/contract";

/**
 * WalletProvider (kb/90 §8.5; kb/40 §Wallet provider). ONE NearConnector per tab (module singleton), network
 * 'testnet', footerBranding null, NO `features` filter (the docs' block yields 0 wallets).
 * The wallet's resolved value is never trusted; callers hand it to the signing runner, which tracks chain state.
 *
 * Fixture mode never touches a real wallet: a clearly labelled mock wallet signs in as the fixture persona and feeds
 * the in-browser simulation (lib/data/sim.ts). It cannot exist in live mode.
 */

export interface WalletAdapter {
  kind: "near-connect" | "fixture";
  signAndSendTransaction(tx: WalletTx & { signerId?: string }): Promise<unknown>;
  /** Batch two+ transactions behind one wallet approval (A2 Give by link). Optional: not every wallet supports it. */
  signAndSendTransactions?(txs: (WalletTx & { signerId?: string })[]): Promise<unknown[]>;
}

interface Ctx {
  ready: boolean;
  accountId: string | null;
  wallet: WalletAdapter | null;
  connecting: boolean;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const WalletCtx = createContext<Ctx | null>(null);

type Connector = import("@hot-labs/near-connect").NearConnector;
let connector: Connector | null = null;
let connectorPromise: Promise<Connector> | null = null;

export async function getConnector(): Promise<Connector> {
  if (typeof window === "undefined") throw new Error("client only");
  if (connector) return connector;
  connectorPromise ??= import("@hot-labs/near-connect").then(({ NearConnector }) => {
    connector ??= new NearConnector({ network: "testnet", footerBranding: null });
    return connector;
  });
  return connectorPromise;
}

export const MOCK_WALLET_KEY = "satchel:mock-wallet";
export const MOCK_DEFAULT_ACCOUNT = "alice.satchelhq.testnet";

function readMock(): string | null {
  try {
    return window.localStorage.getItem(MOCK_WALLET_KEY);
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; accountId: string | null; wallet: WalletAdapter | null; connecting: boolean }>({
    ready: false,
    accountId: null,
    wallet: null,
    connecting: false,
  });

  useEffect(() => {
    if (IS_FIXTURE) {
      let cancelled = false;
      void import("@/lib/near/mock-wallet").then(({ mockWallet }) => {
        if (cancelled) return;
        const acct = readMock();
        setState({ ready: true, accountId: acct, wallet: acct ? mockWallet(acct) : null, connecting: false });
      });
      const onStorage = (e: StorageEvent) => {
        if (e.key !== MOCK_WALLET_KEY) return;
        void import("@/lib/near/mock-wallet").then(({ mockWallet }) => {
          const acct = readMock();
          setState({ ready: true, accountId: acct, wallet: acct ? mockWallet(acct) : null, connecting: false });
        });
      };
      window.addEventListener("storage", onStorage);
      return () => {
        cancelled = true;
        window.removeEventListener("storage", onStorage);
      };
    }
    let off = () => {};
    let alive = true;
    void getConnector().then((c) => {
      if (!alive) return;
      const asAdapter = (w: import("@hot-labs/near-connect").NearWalletBase): WalletAdapter => ({
        kind: "near-connect",
        signAndSendTransaction: (tx) => w.signAndSendTransaction(tx as never),
        signAndSendTransactions: (txs) =>
          w.signAndSendTransactions({ transactions: txs.map(({ receiverId, actions }) => ({ receiverId, actions })) } as never) as Promise<unknown[]>,
      });
      const onIn = (p: { wallet: import("@hot-labs/near-connect").NearWalletBase; accounts: { accountId: string }[] }) =>
        setState({ ready: true, accountId: p.accounts[0]?.accountId ?? null, wallet: asAdapter(p.wallet), connecting: false });
      const onOut = () => setState({ ready: true, accountId: null, wallet: null, connecting: false });
      c.on("wallet:signIn", onIn as never);
      c.on("wallet:signOut", onOut as never);
      off = () => {
        c.off?.("wallet:signIn", onIn as never);
        c.off?.("wallet:signOut", onOut as never);
      };
      c.getConnectedWallet()
        .then(({ wallet, accounts }) => setState({ ready: true, accountId: accounts[0]?.accountId ?? null, wallet: asAdapter(wallet), connecting: false }))
        .catch(() => setState((s) => ({ ...s, ready: true })));
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const signIn = useCallback(async () => {
    if (IS_FIXTURE) {
      const { mockWallet } = await import("@/lib/near/mock-wallet");
      try {
        window.localStorage.setItem(MOCK_WALLET_KEY, MOCK_DEFAULT_ACCOUNT);
      } catch {
        /* ignore */
      }
      setState({ ready: true, accountId: MOCK_DEFAULT_ACCOUNT, wallet: mockWallet(MOCK_DEFAULT_ACCOUNT), connecting: false });
      return;
    }
    setState((s) => ({ ...s, connecting: true }));
    try {
      await (await getConnector()).connect();
    } finally {
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (IS_FIXTURE) {
      try {
        window.localStorage.removeItem(MOCK_WALLET_KEY);
      } catch {
        /* ignore */
      }
      setState({ ready: true, accountId: null, wallet: null, connecting: false });
      return;
    }
    await (await getConnector()).disconnect();
  }, []);

  const value = useMemo<Ctx>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet(): Ctx {
  const v = useContext(WalletCtx);
  if (!v) throw new Error("WalletProvider missing");
  return v;
}
