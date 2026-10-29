/** Isomorphic clean-history checker (spec §7). Pure functions with injectable fetchers. */
export * from './types'
export { checkCleanHistory, mergeNearSnapshots, type NearMerge } from './checker'
export { gate, roleBanner, BUY_ENABLED, type GateInput, type GateResult } from './gate'
export { checkEvm, type EvmCheckResult } from './evm'
export { checkBtc, ownBtcScripts, requestStatus, verifiedBtcBalance, type BtcCheckResult } from './btc'
export { checkSol, SYSTEM_PROGRAM_ID, type SolCheckResult } from './sol'
export { jsonRpcEvmSource, esploraBtcSource, solRpcSource, collectNearSnapshot, type NearViews } from './sources'
export { memoryVerdictCache, normalizeCodeHash, cacheKey } from './util'
