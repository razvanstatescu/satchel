/**
 * @satchel/core: framework-free, isomorphic libraries (kb/90 §8.2, D-39).
 * Prefer the subpath imports (`@satchel/core/derive`, `/chains/btc`, …) so chain libraries load lazily;
 * this barrel only re-exports the light modules. Overview and module map: packages/core/README.md.
 * In this package's comments, "spec §N" means kb/90-technical-spec.md §N; D-/H-/R-xx are entries in
 * plan/decisions.md, INV-xx are the invariants in kb/90 §6, and C1–C7 are the feature specs in docs/specs/.
 */
export * as bytes from './bytes'
export * as derive from './derive'
export * as near from './near'
export * as policy from './policy'
export * as card from './card'
export * as format from './format'
