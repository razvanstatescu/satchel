'use client';
import { useWallet } from '@/lib/wallet';
export default function Who() {
  const { ready, accountId, signIn } = useWallet();
  return <pre id="out">{ready ? `ready account=${accountId ?? 'none'} DONE` : 'loading'}<button onClick={signIn}>sign in</button></pre>;
}
