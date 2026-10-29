// THROWAWAY: create spike.<me> sub-account (key -> legacy keychain, never printed) and deploy+init the spike contract.
// usage: node deploy.mjs <subName> <wasmPath> <initMethod> '<initArgsJson>' [fundNear=3]
import fs from 'node:fs';
import os from 'node:os';
import { KeyPair, actions, PublicKey } from 'near-api-js';
import { loadAccount, submitActions, waitExecuted, summarize, rpc } from './nearlib.mjs';

const PARENT = 'satchel-spk-mpc-e9ea1a.testnet';
const [sub, wasmPath, initMethod, initArgs = '{}', fund = '3'] = process.argv.slice(2);
const acct = `${sub}.${PARENT}`;
const credPath = `${os.homedir()}/.near-credentials/testnet/${acct}.json`;
const exists = !(await rpc('query', { request_type: 'view_account', finality: 'final', account_id: acct })).error;
if (!exists) {
  if (!fs.existsSync(credPath)) {
    const kp = KeyPair.fromRandom('ed25519');
    fs.writeFileSync(credPath, JSON.stringify({ account_id: acct, public_key: kp.getPublicKey().toString(), private_key: kp.toString() }), { mode: 0o600 });
    console.log('saved new key to legacy keychain for', acct, kp.getPublicKey().toString());
  }
  const { public_key } = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const parent = loadAccount(PARENT);
  const yocto = BigInt(Math.round(Number(fund) * 1000)) * 10n ** 21n;
  const { hash } = await submitActions(parent, acct, [actions.createAccount(), actions.transfer(yocto), actions.addFullAccessKey(PublicKey.from(public_key))]);
  const { result } = await waitExecuted(hash, PARENT);
  console.log('create-account tx', hash, JSON.stringify(result.status).slice(0, 200));
}
if (wasmPath) {
  const me = loadAccount(acct);
  const code = fs.readFileSync(wasmPath);
  const acts = [actions.deployContract(code)];
  if (initMethod) acts.push(actions.functionCall(initMethod, JSON.parse(initArgs), 30_000_000_000_000n, 0n));
  const { hash } = await submitActions(me, acct, acts);
  const { result } = await waitExecuted(hash, acct);
  const s = await summarize(result);
  console.log('deploy tx', hash, JSON.stringify(result.status).slice(0, 300), 'burnt', s.totalBurnt.toString());
}
