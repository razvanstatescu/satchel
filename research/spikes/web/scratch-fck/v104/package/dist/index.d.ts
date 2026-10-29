import type { WalletPlugin } from "@hot-labs/near-connect/build/types/plugin";
export declare const NearContext: import("react").Context<any>;
export interface CreateAccessKeyParams {
    contractId: string;
    methodNames: string[];
    allowance: string;
}
export interface CreateAccessKeyPluginParams {
    network: "mainnet" | "testnet";
    providers?: {
        mainnet?: string[];
        testnet?: string[];
    };
}
export type AccessKeyPlugin = WalletPlugin & {
    /**
     * Generates a local ed25519 key pair and stores its private key alongside
     * access key constraints in localStorage.
     *
     * @param params Access key restrictions for contract, methods, and allowance.
     * @param params.contractId The NEAR account ID of the contract this access key should be restricted to.
     * @param params.methodNames An array of method names this access key can call; use [] to allow all methods.
     * @param params.allowance The maximum amount of NEAR (in yoctoNEAR) that can be spent using this access key; use "0" for unlimited allowance.
     * @returns The generated public key to register on-chain as a function-call access key.
     */
    createLocalKeyFor: (params: CreateAccessKeyParams) => string;
};
/**
 * Creates a wallet plugin that can locally sign eligible function-call
 * transactions using a browser-stored access key.
 *
 * @param params Network and optional RPC provider configuration.
 * @param params.network The NEAR network to connect to ("mainnet" or "testnet").
 * @param params.providers Optional custom RPC URLs for each network; if not provided, defaults will be used.
 * @returns A wallet plugin that intercepts signing flows and exposes `createLocalKeyFor` to generate and persist local key material.
 */
export declare const createAccessKeyPlugin: (params: CreateAccessKeyPluginParams) => AccessKeyPlugin;
//# sourceMappingURL=index.d.ts.map