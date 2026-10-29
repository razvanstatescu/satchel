'use client';
import { WalletProvider } from '@/lib/wallet';
export default function Providers({ children }: { children: React.ReactNode }) { return <WalletProvider>{children}</WalletProvider>; }
