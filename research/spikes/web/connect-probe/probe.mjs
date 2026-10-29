// THROWAWAY spike: which wallets does near-connect 0.11.4 show for a given network/features? (Node, no window)
import pkg from '@hot-labs/near-connect';
const { NearConnector } = pkg;
globalThis.indexedDB ??= undefined;
const memStore = { m: new Map(), async get(k){return this.m.get(k) ?? null}, async set(k,v){this.m.set(k,v)}, async remove(k){this.m.delete(k)} };
async function list(label, opts) {
  const c = new NearConnector({ storage: memStore, ...opts });
  await c.whenManifestLoaded;
  await new Promise(r => setTimeout(r, 300));
  console.log(`${label}: manifest v${c.manifest.version}, registered=${c.wallets.length}, available=[${c.availableWallets.map(w => w.manifest.id).join(', ')}]`);
}
await list('mainnet default', { network: 'mainnet' });
await list('testnet default', { network: 'testnet' });
await list('testnet + docs features block', { network: 'testnet', features: { signMessage: true, signTransaction: true, signInWithoutAddKey: true, signAndSendTransaction: true, signAndSendTransactions: true } });
await list('testnet + {signAndSendTransaction:true}', { network: 'testnet', features: { signAndSendTransaction: true } });
await list('testnet + fake walletConnect', { network: 'testnet', walletConnect: { connect: async()=>({}), disconnect: async()=>{}, request: async()=>{}, session: { keys: [], get: () => ({}) }, core: { projectId: 'x' } } });
process.exit(0);
