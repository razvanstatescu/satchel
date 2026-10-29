import { createContext } from "react";
import { JsonRpcProvider, Account, KeyPair, KeyPairSigner, actions, teraToGas, FailoverRpcProvider, } from "near-api-js";
export const NearContext = createContext(undefined);
const STORAGE_KEY = `access_key::plugin`;
const getStoredAccessKey = () => {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized)
        return null;
    try {
        return JSON.parse(serialized);
    }
    catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};
const shouldUseAccessKey = (tx) => {
    const key = getStoredAccessKey();
    if (!key)
        return false;
    if (tx.receiverId !== key.contractId)
        return false;
    for (const action of tx.actions) {
        if (action.type !== "FunctionCall")
            return false;
        if (key.methodNames.length > 0 && !key.methodNames.includes(action.params.methodName))
            return false;
        if (BigInt(action.params.deposit || "0") > 0n)
            return false;
    }
    return true;
};
const signTransactionLocally = async (accountId, provider, tx) => {
    const keyData = getStoredAccessKey();
    if (!keyData) {
        throw new Error("No local access key found");
    }
    const keyPair = KeyPair.fromString(keyData.privateKey);
    const signer = new KeyPairSigner(keyPair);
    const account = new Account(accountId, provider, signer);
    const transactionActions = tx.actions.map((action) => {
        if (action.type === "FunctionCall") {
            return actions.functionCall(action.params.methodName, action.params.args, BigInt(action.params.gas || teraToGas(30)), BigInt(action.params.deposit || "0"));
        }
        throw new Error(`Unsupported action type: ${action.type}`);
    });
    const result = await account.signAndSendTransaction({
        receiverId: tx.receiverId,
        actions: transactionActions,
    });
    return result;
};
const resolveProvider = ({ network, providers = {
    testnet: [],
    mainnet: [],
} }) => {
    const defaultProviders = {
        mainnet: ["https://free.rpc.fastnear.com"],
        testnet: ["https://rpc.testnet.fastnear.com"],
    };
    const networkProviders = providers[network]?.length ? providers[network] : defaultProviders[network];
    return new FailoverRpcProvider(networkProviders.map((url) => new JsonRpcProvider({ url })));
};
const resolveSignerId = async (pluginContext, signerId) => {
    if (signerId)
        return signerId;
    const contextWithAccounts = pluginContext;
    const accounts = await contextWithAccounts.getAccounts?.();
    const accountId = accounts?.[0]?.accountId;
    if (!accountId) {
        throw new Error("No signed-in account found");
    }
    return accountId;
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
export const createAccessKeyPlugin = (params) => {
    const provider = resolveProvider(params);
    return {
        async signOut(_, next) {
            localStorage.removeItem(STORAGE_KEY);
            if (next) {
                await next();
            }
        },
        async signAndSendTransaction(params, next) {
            const accountId = await resolveSignerId(this, params.signerId);
            if (shouldUseAccessKey(params)) {
                return signTransactionLocally(accountId, provider, params);
            }
            return next();
        },
        async signAndSendTransactions(params, next) {
            const allCanUseAccessKey = params.transactions.every((tx) => shouldUseAccessKey(tx));
            const accountId = await resolveSignerId(this, params.signerId);
            if (allCanUseAccessKey) {
                const results = [];
                for (const tx of params.transactions) {
                    const result = await signTransactionLocally(accountId, provider, tx);
                    results.push(result);
                }
                return results;
            }
            return next();
        },
        createLocalKeyFor({ contractId, methodNames, allowance }) {
            const keyPair = KeyPair.fromRandom("ed25519");
            const newPublicKey = keyPair.getPublicKey().toString();
            const privateKey = keyPair.toString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                privateKey,
                contractId,
                methodNames,
                allowance,
            }));
            return newPublicKey;
        },
    };
};
