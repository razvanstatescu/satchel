import { JsonRpcProvider, Account, KeyPair, KeyPairSigner, actions, FailoverRpcProvider, } from "near-api-js";
import { nearActionsToConnectorActions, } from "@hot-labs/near-connect";
import { AccessKeyDoesNotExistError, AccessKeyNotEnoughAllowanceActionError, AccessKeyNotFoundActionError, } from "near-api-js/rpc-errors";
const DEFAULT_ALLOWANCE = "250000000000000000000000";
const storageKeyFor = (network, accountId) => `access_key::plugin::${network}::${accountId}`;
const getStoredAccessKey = (network, accountId) => {
    if (typeof localStorage === "undefined")
        return null;
    const storageKey = storageKeyFor(network, accountId);
    const serialized = localStorage.getItem(storageKey);
    if (!serialized)
        return null;
    try {
        return JSON.parse(serialized);
    }
    catch {
        localStorage.removeItem(storageKey);
        return null;
    }
};
const storeAccessKey = (network, accountId, key) => {
    if (typeof localStorage === "undefined")
        return;
    localStorage.setItem(storageKeyFor(network, accountId), JSON.stringify(key));
};
const removeStoredAccessKey = (network, accountId) => {
    if (typeof localStorage === "undefined")
        return;
    console.log("Removing stored access key for account:", accountId);
    localStorage.removeItem(storageKeyFor(network, accountId));
};
const shouldUseAccessKey = (key, tx) => {
    if (tx.receiverId !== key.contractId)
        return false;
    for (const action of nearActionsToConnectorActions(tx.actions)) {
        if (action.type !== "FunctionCall")
            return false;
        if (key.methodNames.length > 0 &&
            !key.methodNames.includes(action.params.methodName)) {
            return false;
        }
        if (BigInt(action.params.deposit) > 0n)
            return false;
    }
    return true;
};
const recoverableAccessKeyError = (error) => {
    if (error instanceof AccessKeyNotEnoughAllowanceActionError) {
        return "allowance";
    }
    if (error instanceof AccessKeyDoesNotExistError ||
        error instanceof AccessKeyNotFoundActionError) {
        return "missing";
    }
    return null;
};
const signTransactionLocally = async (accountId, provider, keyData, tx) => {
    const keyPair = KeyPair.fromString(keyData.privateKey);
    const signer = new KeyPairSigner(keyPair);
    const account = new Account(accountId, provider, signer);
    const transactionActions = tx.actions.map((action) => {
        if (!("type" in action)) {
            return action;
        }
        if (action.type === "FunctionCall") {
            return actions.functionCall(action.params.methodName, action.params.args, BigInt(action.params.gas), BigInt(action.params.deposit));
        }
        throw new Error("Unsupported action type");
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
}, }) => {
    const defaultProviders = {
        mainnet: ["https://free.rpc.fastnear.com"],
        testnet: ["https://rpc.testnet.fastnear.com"],
    };
    const networkProviders = providers[network]?.length
        ? providers[network]
        : defaultProviders[network];
    if (networkProviders.length === 1) {
        return new JsonRpcProvider({ url: networkProviders[0] });
    }
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
 * @returns A wallet plugin that automatically creates and registers a local function-call key during sign-in.
 */
export const createAccessKeyPlugin = (params) => {
    const network = params.network;
    const provider = resolveProvider(params);
    const signInParams = params.signIn
        ? {
            contractId: params.signIn.contractId,
            methodNames: params.signIn.methodNames ?? [],
            allowance: params.signIn.allowance ?? DEFAULT_ALLOWANCE,
        }
        : null;
    return {
        async signIn(data, next) {
            if (!signInParams || !data) {
                return next();
            }
            const keyPair = KeyPair.fromRandom("ed25519");
            data.addFunctionCallKey = {
                contractId: signInParams.contractId,
                publicKey: keyPair.getPublicKey().toString(),
                allowMethods: signInParams.methodNames.length
                    ? {
                        anyMethod: false,
                        methodNames: signInParams.methodNames,
                    }
                    : { anyMethod: true },
                gasAllowance: signInParams.allowance === "0"
                    ? { kind: "unlimited" }
                    : {
                        kind: "limited",
                        amount: signInParams.allowance,
                    },
            };
            const accounts = await next();
            const accountId = accounts[0]?.accountId;
            if (accountId) {
                storeAccessKey(network, accountId, {
                    privateKey: keyPair.toString(),
                    contractId: signInParams.contractId,
                    methodNames: signInParams.methodNames,
                });
            }
            return accounts;
        },
        async signOut(_, next) {
            const contextWithAccounts = this;
            const accounts = await contextWithAccounts.getAccounts?.() ?? [];
            if (next) {
                await next();
            }
            for (const { accountId } of accounts) {
                removeStoredAccessKey(network, accountId);
            }
        },
        async signAndSendTransaction(params, next) {
            const accountId = await resolveSignerId(this, params.signerId);
            const keyData = getStoredAccessKey(network, accountId);
            if (!keyData || !shouldUseAccessKey(keyData, params)) {
                return next();
            }
            try {
                return await signTransactionLocally(accountId, provider, keyData, params);
            }
            catch (error) {
                const recoverableError = recoverableAccessKeyError(error);
                if (!recoverableError)
                    throw error;
                if (recoverableError === "missing") {
                    removeStoredAccessKey(network, accountId);
                }
                return next();
            }
        },
        async signAndSendTransactions(params, next) {
            const accountId = await resolveSignerId(this, params.signerId);
            const keyData = getStoredAccessKey(network, accountId);
            if (!keyData ||
                !params.transactions.every((tx) => shouldUseAccessKey(keyData, tx))) {
                return next();
            }
            const results = [];
            try {
                for (const tx of params.transactions) {
                    const result = await signTransactionLocally(accountId, provider, keyData, tx);
                    results.push(result);
                }
                return results;
            }
            catch (error) {
                const recoverableError = recoverableAccessKeyError(error);
                if (!recoverableError)
                    throw error;
                if (recoverableError === "missing") {
                    removeStoredAccessKey(network, accountId);
                }
                const transactions = params.transactions;
                params.transactions = transactions.slice(results.length);
                try {
                    return [...results, ...(await next())];
                }
                finally {
                    params.transactions = transactions;
                }
            }
        },
    };
};
