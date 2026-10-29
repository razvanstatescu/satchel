/**
 * Load a signing key from `~/.near-credentials/<network>/` (near-cli legacy keychain). Two layouts are supported:
 *   <dir>/testnet/<account>.json                       {"account_id","public_key","private_key"}
 *   <dir>/testnet/<account>/<public_key>.json          (near-cli-rs per-key files)
 * The secret never leaves this module except inside a KeyPairSigner; it is never printed or logged.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { KeyPair, KeyPairSigner, type KeyPairString } from 'near-api-js'

export interface LoadedKey {
  accountId: string
  publicKey: string
  file: string
  signer: KeyPairSigner
}

export class MissingCredentialsError extends Error {}

interface KeyFile {
  account_id?: string
  public_key?: string
  private_key?: string
  secret_key?: string
}

/** Candidate key files for an account, most specific first. */
export function credentialFiles(dir: string, network: string, accountId: string): string[] {
  const base = join(dir, network)
  const out: string[] = []
  const single = join(base, `${accountId}.json`)
  if (existsSync(single)) out.push(single)
  const folder = join(base, accountId)
  if (existsSync(folder) && statSync(folder).isDirectory()) {
    for (const f of readdirSync(folder).sort()) if (f.endsWith('.json')) out.push(join(folder, f))
  }
  return out
}

/** Parse a key file without exposing the secret. Throws on a mismatched account or malformed file. */
export function parseKeyFile(text: string, accountId: string, file: string): { publicKey: string; secret: KeyPairString } {
  let j: KeyFile
  try {
    j = JSON.parse(text) as KeyFile
  } catch {
    throw new Error(`malformed key file ${file}`)
  }
  if (j.account_id && j.account_id !== accountId) throw new Error(`key file ${file} belongs to ${j.account_id}, not ${accountId}`)
  const secret = j.private_key ?? j.secret_key
  if (!secret || !/^(ed25519|secp256k1):/.test(secret)) throw new Error(`key file ${file} has no private_key`)
  const kp = KeyPair.fromString(secret as KeyPairString)
  const pub = kp.getPublicKey().toString()
  if (j.public_key && j.public_key !== pub) throw new Error(`key file ${file}: public_key does not match the private key`)
  return { publicKey: pub, secret: secret as KeyPairString }
}

export function loadKey(dir: string, network: string, accountId: string): LoadedKey {
  const files = credentialFiles(dir, network, accountId)
  if (files.length === 0)
    throw new MissingCredentialsError(`no key for ${accountId} in ${join(dir, network)} (expected ${accountId}.json or ${accountId}/<key>.json)`)
  const file = files[0]!
  const { publicKey, secret } = parseKeyFile(readFileSync(file, 'utf8'), accountId, file)
  return { accountId, publicKey, file, signer: KeyPairSigner.fromSecretKey(secret) }
}

/** Public key only (for dry runs): never constructs a signer. Null if no file exists. */
export function peekPublicKey(dir: string, network: string, accountId: string): string | null {
  const files = credentialFiles(dir, network, accountId)
  if (files.length === 0) return null
  try {
    return parseKeyFile(readFileSync(files[0]!, 'utf8'), accountId, files[0]!).publicKey
  } catch {
    return null
  }
}
