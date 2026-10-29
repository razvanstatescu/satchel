/**
 * Recorded RPC answers (shapes from kb/40 §E/§D measurements, 2026-10-21; bodies abridged to the fields we read).
 */

const b64 = (s: string) => Buffer.from(s).toString("base64");

export const MPC_SIG = { scheme: "Secp256k1", big_r: { affine_point: "02145832253c28e50421ce5524f2c67de54d2468c4925993b4e8b33c56c14b4f13" }, s: { scalar: "6878376edae59d3512ce88baafc4e0a3f8d3e6cfe76b229ab2d4fc4ec19e5210" }, recovery_id: 0 };

/** FastNEAR after its 10–30 s hold: HTTP 408 TIMEOUT_ERROR carrying the pending status (nearcore 2.14 shape). */
export const FASTNEAR_408 = {
  http: 408,
  body: {
    jsonrpc: "2.0",
    error: {
      name: "HANDLER_ERROR",
      cause: { name: "TIMEOUT_ERROR", info: { cause: "PENDING", status: { final_execution_status: "INCLUDED_FINAL", status: "Started", receipts_outcome: [] } } },
      code: -32000,
      message: "Server error",
    },
    id: "satchel",
  },
};

/** nearcore master's enum form {"Pending":{"status":…}}. */
export const NEARCORE_MASTER_408 = {
  http: 408,
  body: { jsonrpc: "2.0", error: { name: "HANDLER_ERROR", cause: { name: "TIMEOUT_ERROR", info: { Pending: { status: { final_execution_status: "EXECUTED_OPTIMISTIC", status: "Started" } } } } }, id: "x" },
};

/** dRPC free plan: cuts any request at ≈ 2 s (top-level body, not JSON-RPC). */
export const DRPC_408 = { http: 408, body: { message: "Request timeout on the free plan, please upgrade to paid plan", code: 30 } };

export const UNKNOWN_TX = { http: 200, body: { jsonrpc: "2.0", error: { name: "HANDLER_ERROR", cause: { name: "UNKNOWN_TRANSACTION", info: {} } }, id: "x" } };
export const INVALID_TX = { http: 200, body: { jsonrpc: "2.0", error: { name: "HANDLER_ERROR", cause: { name: "INVALID_TRANSACTION", info: {} } }, id: "x" } };
export const RATE_LIMITED = { http: 429, body: { code: -429, message: "Rate limits exceeded. For higher rate limits get a subscription at https://fastnear.com" } };
export const SERVER_500 = { http: 500, body: null };
export const DRPC_METHOD_NA = { http: 400, body: { message: "method is not available", code: -32601 } };

export const PARTIAL_STARTED = { http: 200, body: { jsonrpc: "2.0", result: { final_execution_status: "INCLUDED_FINAL", status: "Started", transaction: { hash: "B7Hi" }, receipts_outcome: [] }, id: "x" } };

/** sign_for done: SuccessValue = on_signed's array (one MPC JSON per request). */
export const SIGN_FOR_DONE = {
  http: 200,
  body: {
    jsonrpc: "2.0",
    result: {
      final_execution_status: "EXECUTED",
      status: { SuccessValue: b64(JSON.stringify([MPC_SIG])) },
      transaction: { hash: "JCHJ2Kw5RkeyXEk5VVrUkEvkEEeQiCXY3NStifm5mkwX", signer_id: "alice.satchelhq.testnet" },
      receipts_outcome: [
        { id: "r1", outcome: { executor_id: "satchel.satchelhq.testnet", status: { SuccessReceiptId: "r2" }, logs: ['EVENT_JSON:{"standard":"satchel","version":"1.0.0","event":"sign_requested","data":{"token_id":"1","first_seq":2,"count":1}}'] } },
        { id: "r2", outcome: { executor_id: "v1.signer-prod.testnet", status: { SuccessValue: b64(JSON.stringify(MPC_SIG)) }, logs: [] } },
      ],
    },
    id: "x",
  },
};

/** A contract panic: a resolved tx with status.Failure. */
export const SIGN_FOR_PANIC = {
  http: 200,
  body: {
    jsonrpc: "2.0",
    result: {
      final_execution_status: "EXECUTED_OPTIMISTIC",
      status: { Failure: { ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: ERR_FROZEN: token is listed" } } } } },
      transaction: { hash: "Fz1" },
      receipts_outcome: [],
    },
    id: "x",
  },
};

/** on_signed itself failed (a bug): Failure on the tx, but the MPC receipt still holds the signature (kb/90 §5.8). */
export const ON_SIGNED_FAILED = {
  http: 200,
  body: {
    jsonrpc: "2.0",
    result: {
      final_execution_status: "EXECUTED",
      status: { Failure: { ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: "Exceeded the prepaid gas." } } } } },
      transaction: { hash: "Ab9" },
      receipts_outcome: [{ id: "m1", outcome: { executor_id: "v1.signer-prod.testnet", status: { SuccessValue: b64(JSON.stringify(MPC_SIG)) }, logs: [] } }],
    },
    id: "x",
  },
};

/** A fetch mock that replays a scripted list of {http, body} (or throws for "network"). Records the URLs hit. */
export function scriptedFetch(script: ({ http: number; body: unknown } | "network")[]) {
  const calls: string[] = [];
  let i = 0;
  const f = (async (url: string) => {
    calls.push(String(url));
    const step = script[Math.min(i++, script.length - 1)];
    if (step === "network") throw new TypeError("Failed to fetch");
    return new Response(step.body === null ? "" : JSON.stringify(step.body), { status: step.http, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetch: f, calls };
}
