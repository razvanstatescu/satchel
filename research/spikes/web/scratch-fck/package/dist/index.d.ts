import { type WalletPlugin } from "@hot-labs/near-connect";
export interface CreateAccessKeyPluginParams {
    network: "mainnet" | "testnet";
    providers?: {
        mainnet?: string[];
        testnet?: string[];
    };
    signIn?: {
        contractId: string;
        methodNames?: string[];
        allowance?: string;
    };
}
/**
 * Creates a wallet plugin that can locally sign eligible function-call
 * transactions using a browser-stored access key.
 *
 * @param params Network and optional RPC provider configuration.
 * @param params.network The NEAR network to connect to ("mainnet" or "testnet").
 * @param params.providers Optional custom RPC URLs for each network; if not provided, defaults will be used.
 * @returns A wallet plugin that automatically creates and registers a local function-call key during sign-in.
 */
export declare const createAccessKeyPlugin: (params: CreateAccessKeyPluginParams) => WalletPlugin;
//# sourceMappingURL=index.d.ts.map