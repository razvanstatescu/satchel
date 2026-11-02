import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against `next build && next start` in FIXTURE mode (no testnet transaction; the mock wallet and the
 * in-browser simulation stand in for the wallet, the contract and the chains). Role `final` = the strict gate.
 * Set E2E_BASE_URL to run the read-only judge checks against a deployed URL instead (kb/90 §12.5).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: external ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // The first-time onboarding (Onboarding.tsx) would cover any page a spec signs in on, however it connects the
    // mock wallet: every context starts with it done. onboarding.spec.ts opts back in (useMockWallet { onboarding }).
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(external ?? `http://127.0.0.1:${PORT}`).origin,
          localStorage: [{ name: "satchel:onboarding:v1", value: JSON.stringify({ v: 1, doneAt: 0, skippedSurvey: true, submitted: false }) }],
        },
      ],
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" }, testMatch: /responsive\.spec\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }, testIgnore: /responsive\.spec\.ts/ },
  ],
  webServer: external
    ? undefined
    : {
        command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
        url: `http://127.0.0.1:${PORT}/api/contract`,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_DATA_MODE: "fixture",
          NEXT_PUBLIC_CONTRACT_ROLE: "final",
          NEXT_PUBLIC_SATCHEL_CONTRACT: "satchel.satchelhq.testnet",
          NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
          // Solana: the SOL UI defaults to on (D-46); SOL_SEND is kept explicit for older builds
          NEXT_PUBLIC_SOL_SEND: "on",
          // Defined but empty, so a local .env.production (the Vercel live values) cannot leak its hash into this
          // fixture build: @next/env only fills keys that are undefined, and "" parses as unset (fixture hash).
          NEXT_PUBLIC_EXPECTED_CODE_HASH: "",
          FASTNEAR_API_KEY: "",
        },
      },
});
