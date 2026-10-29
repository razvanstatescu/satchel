/**
 * Accounts, endpoints and contract roles for the release tools (spec §5.1, §8.3, §8.4; D-38 `<team>` = satchelhq).
 * Every value can be overridden by an env var or a flag; nothing here is secret.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'

export type Role = 'dev' | 'rc' | 'final'

/** The deprecated, throttled near.org testnet RPC is refused (spec §8.3). Written as a regex so the literal host never
 * appears in the repo (the CI grep must find nothing). */
const FORBIDDEN_RPC_RE = /rpc\.testnet\.near\.org/i
export const isForbiddenRpc = (url: string): boolean => FORBIDDEN_RPC_RE.test(url)

export const DEFAULT_TEAM = 'satchelhq'
export const MPC_TESTNET = 'v1.signer-prod.testnet'
export const USDC_TESTNET = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af'

export const DEFAULT_NEAR_RPCS = ['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org'] as const
export const DEFAULT_NEAR_TX_API = 'https://tx.test.fastnear.com'
export const DEFAULT_SEPOLIA_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.ethpandaops.io',
  'https://0xrpc.io/sep',
  'https://sepolia.gateway.tenderly.co',
] as const
export const DEFAULT_BTC_APIS = ['https://mempool.space/testnet4/api', 'https://mempool.emzy.de/testnet4/api'] as const
export const DEFAULT_SOL_RPCS = ['https://api.devnet.solana.com'] as const

export interface ToolConfig {
  network: 'testnet'
  team: string
  /** `<team>.testnet`: parent of dev/rc/final, pays the keyless births */
  teamAccount: string
  role: Role
  /** the Satchel contract the e2e scripts talk to */
  contract: string
  personas: { alice: string; bob: string; carol: string }
  mpc: string
  usdc: string
  nearRpcs: string[]
  nearTxApi: string
  sepoliaRpcs: string[]
  btcApis: string[]
  solRpcs: string[]
  /** server-side FastNEAR key (optional, H-06); sent only to fastnear hosts, never printed */
  fastnearApiKey: string | null
  /** expected SHA-256 hex of the deployed wasm (required for rc/final clean-history runs) */
  expectedCodeHash: string | null
  credentialsDir: string
}

export type Env = Record<string, string | undefined>

const list = (v: string | undefined, fallback: readonly string[]): string[] =>
  v && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : [...fallback]

const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/
export function assertAccountId(id: string, what = 'account id'): string {
  if (id.length < 2 || id.length > 64 || !ACCOUNT_RE.test(id)) throw new Error(`invalid ${what}: ${JSON.stringify(id)}`)
  return id
}

/** `dev1.<team>.testnet` / `rc.<team>.testnet` / `satchel.<team>.testnet` (spec §5.1). */
export function contractForRole(role: Role, team: string, devIndex = 1): string {
  if (role === 'dev') return `dev${devIndex}.${team}.testnet`
  if (role === 'rc') return `rc.${team}.testnet`
  return `satchel.${team}.testnet`
}

export function roleOfContract(contract: string, team: string): Role | null {
  if (contract === `satchel.${team}.testnet`) return 'final'
  if (/^rc\d*\./.test(contract) && contract.endsWith(`.${team}.testnet`)) return 'rc'
  if (/^dev\d+\./.test(contract) && contract.endsWith(`.${team}.testnet`)) return 'dev'
  return null
}

export interface ConfigFlags {
  team?: string
  role?: string
  contract?: string
  alice?: string
  bob?: string
  carol?: string
}

/**
 * Precedence: flag > env > default. Env names: SATCHEL_TEAM, SATCHEL_ROLE, SATCHEL_CONTRACT, SATCHEL_ALICE/BOB/CAROL,
 * SATCHEL_NEAR_RPCS (or NEXT_PUBLIC_NEAR_RPCS), SATCHEL_NEAR_TX_API, SATCHEL_SEPOLIA_RPCS, SATCHEL_BTC_APIS,
 * SATCHEL_SOL_RPCS, FASTNEAR_API_KEY, SATCHEL_EXPECTED_CODE_HASH (or NEXT_PUBLIC_EXPECTED_CODE_HASH), NEAR_CREDENTIALS_DIR.
 */
export function loadConfig(flags: ConfigFlags = {}, env: Env = process.env): ToolConfig {
  const team = assertAccountId(flags.team ?? env.SATCHEL_TEAM ?? DEFAULT_TEAM, 'team')
  const roleRaw = flags.role ?? env.SATCHEL_ROLE ?? env.NEXT_PUBLIC_CONTRACT_ROLE ?? 'dev'
  if (roleRaw !== 'dev' && roleRaw !== 'rc' && roleRaw !== 'final') throw new Error(`--role must be dev|rc|final, got ${roleRaw}`)
  const role: Role = roleRaw
  const contract = assertAccountId(flags.contract ?? env.SATCHEL_CONTRACT ?? contractForRole(role, team), 'contract')
  const persona = (name: 'alice' | 'bob' | 'carol', flag?: string) =>
    assertAccountId(flag ?? env[`SATCHEL_${name.toUpperCase()}`] ?? `${name}.${team}.testnet`, name)
  const nearRpcs = list(env.SATCHEL_NEAR_RPCS ?? env.NEXT_PUBLIC_NEAR_RPCS, DEFAULT_NEAR_RPCS)
  const all = [...nearRpcs, env.SATCHEL_NEAR_TX_API ?? '', env.NEXT_PUBLIC_NEAR_TX_API ?? '']
  const bad = all.find(isForbiddenRpc)
  if (bad) throw new Error(`refusing the deprecated near.org testnet RPC (${bad}); use FastNEAR or dRPC (spec §8.3)`)
  const hash = env.SATCHEL_EXPECTED_CODE_HASH ?? env.NEXT_PUBLIC_EXPECTED_CODE_HASH
  if (hash && !/^[0-9a-fA-F]{64}$/.test(hash)) throw new Error('SATCHEL_EXPECTED_CODE_HASH must be 64 hex chars')
  return {
    network: 'testnet',
    team,
    teamAccount: `${team}.testnet`,
    role,
    contract,
    personas: { alice: persona('alice', flags.alice), bob: persona('bob', flags.bob), carol: persona('carol', flags.carol) },
    mpc: assertAccountId(env.SATCHEL_MPC_CONTRACT ?? env.NEXT_PUBLIC_MPC_CONTRACT ?? MPC_TESTNET, 'mpc'),
    usdc: assertAccountId(env.SATCHEL_USDC_CONTRACT ?? env.NEXT_PUBLIC_USDC_CONTRACT ?? USDC_TESTNET, 'usdc'),
    nearRpcs,
    nearTxApi: (env.SATCHEL_NEAR_TX_API ?? env.NEXT_PUBLIC_NEAR_TX_API ?? DEFAULT_NEAR_TX_API).replace(/\/$/, ''),
    sepoliaRpcs: list(env.SATCHEL_SEPOLIA_RPCS ?? env.NEXT_PUBLIC_SEPOLIA_RPCS, DEFAULT_SEPOLIA_RPCS),
    btcApis: list(env.SATCHEL_BTC_APIS ?? env.NEXT_PUBLIC_BTC_APIS, DEFAULT_BTC_APIS),
    solRpcs: list(env.SATCHEL_SOL_RPCS ?? env.NEXT_PUBLIC_SOL_RPCS, DEFAULT_SOL_RPCS),
    fastnearApiKey: env.FASTNEAR_API_KEY?.trim() || null,
    expectedCodeHash: hash ? hash.toLowerCase() : null,
    credentialsDir: env.NEAR_CREDENTIALS_DIR ?? join(homedir(), '.near-credentials'),
  }
}

/** Resolve a persona name (`alice`) or pass a full account id through. */
export function resolveAccount(cfg: ToolConfig, nameOrId: string): string {
  if (nameOrId === 'alice' || nameOrId === 'bob' || nameOrId === 'carol') return cfg.personas[nameOrId]
  if (nameOrId === 'team') return cfg.teamAccount
  return assertAccountId(nameOrId)
}
