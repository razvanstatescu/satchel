// THROWAWAY: smoke test of near-sandbox (JS) 0.3.4
const { Sandbox } = require("near-sandbox");
(async () => {
  const t0 = Date.now();
  const sandbox = await Sandbox.start({});
  console.log("started in", Date.now() - t0, "ms; rpc", sandbox.rpcUrl);
  const r = await fetch(sandbox.rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "status", params: [] }) }).then((x) => x.json());
  console.log("version", r.result.version.version, "protocol", r.result.protocol_version, "chain", r.result.chain_id);
  await sandbox.tearDown();
})().catch((e) => { console.error(e); process.exit(1); });
