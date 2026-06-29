/**
 * Concurrent pairs performance test.
 *
 * Prerequisites:
 *   1. npm run perf:seed   — creates the isolated test pool
 *   2. npm run dev         — app running on localhost:3000
 *   3. Set env vars for 3 counselor accounts:
 *        PERF_USER1=alice   PERF_PASS1=secret1
 *        PERF_USER2=bob     PERF_PASS2=secret2
 *        PERF_USER3=carol   PERF_PASS3=secret3
 *   4. npm run perf:test
 *
 * What it tests:
 *   - 3 browser contexts (3 different counselors) on the same active session
 *   - Each worker adds ~N pairs as fast as the UI allows
 *   - Measures: search latency, submit round-trip, real-time propagation
 */

import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
type Credentials = { username: string; password: string };

const USERS: Credentials[] = [
  { username: process.env.PERF_USER1 ?? "", password: process.env.PERF_PASS1 ?? "" },
  { username: process.env.PERF_USER2 ?? "", password: process.env.PERF_PASS2 ?? "" },
  { username: process.env.PERF_USER3 ?? "", password: process.env.PERF_PASS3 ?? "" },
];

const missing = USERS.map((u, i) => (!u.username || !u.password ? i + 1 : null)).filter(Boolean);
if (missing.length) {
  throw new Error(
    `Missing credentials for worker(s) ${missing.join(", ")}.\n` +
      "Set PERF_USER1/PERF_PASS1, PERF_USER2/PERF_PASS2, PERF_USER3/PERF_PASS3.",
  );
}

const state = JSON.parse(
  readFileSync(join(__dirname, ".perf-state.json"), "utf-8"),
) as { poolId: string; camperCodes: string[] };

const { poolId, camperCodes } = state;

// Partition codes into pairs, then split across 3 workers.
// Cap via PERF_PAIRS_PER_WORKER (default 30) so a single run is ~1-3 minutes.
// Raise the cap for a longer soak test.
const MAX_PER_WORKER = parseInt(process.env.PERF_PAIRS_PER_WORKER ?? "30", 10);

const allPairs: [string, string][] = [];
for (let i = 0; i + 1 < camperCodes.length; i += 2) {
  allPairs.push([camperCodes[i], camperCodes[i + 1]]);
}

const PAIRS_PER_WORKER = Math.min(MAX_PER_WORKER, Math.floor(allPairs.length / 3));
const workerPairs: [string, string][][] = [
  allPairs.slice(0, PAIRS_PER_WORKER),
  allPairs.slice(PAIRS_PER_WORKER, PAIRS_PER_WORKER * 2),
  allPairs.slice(PAIRS_PER_WORKER * 2, PAIRS_PER_WORKER * 3),
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PairMetric = {
  worker: number;
  pairIndex: number;
  searchMs1: number;
  searchMs2: number;
  submitMs: number;
  totalMs: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function login(page: Page, creds: Credentials) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(creds.username);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/pools", { timeout: 15_000 });
}

async function openPoolPage(page: Page, poolUrl: string) {
  await page.goto(poolUrl);
  // Workers 2 and 3 will see the JoinSessionModal because a different user
  // (worker 1) opened the session. Dismiss it if present.
  const joinButton = page.getByRole("button", { name: "Join session" });
  if (await joinButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await joinButton.click();
  }
  // Wait for the Add Pair form to be ready
  await page.locator('input[aria-label="Camper 1"]').waitFor({ state: "visible", timeout: 20_000 });
}

async function addOnePair(
  page: Page,
  code1: string,
  code2: string,
  workerId: number,
  pairIndex: number,
): Promise<PairMetric> {
  const metric: PairMetric = {
    worker: workerId,
    pairIndex,
    searchMs1: 0,
    searchMs2: 0,
    submitMs: 0,
    totalMs: 0,
  };
  const t0 = Date.now();

  try {
    // --- Camper 1 ---
    const t1 = Date.now();
    await page.locator('input[aria-label="Camper 1"]').fill(code1);
    // Auto-resolves after 300ms debounce + server action: chip replaces the input.
    // Detect resolution by waiting for the "Clear selection" button.
    await page
      .locator('button[aria-label="Clear selection"]')
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    metric.searchMs1 = Date.now() - t1;

    // --- Camper 2 ---
    const t2 = Date.now();
    await page.locator('input[aria-label="Camper 2"]').fill(code2);
    await expect(page.locator('button[aria-label="Clear selection"]')).toHaveCount(2, {
      timeout: 15_000,
    });
    metric.searchMs2 = Date.now() - t2;

    // --- Submit ---
    const t3 = Date.now();
    await page.getByRole("button", { name: /Add (pair|trio)/ }).click();
    // Form resets on success (CamperFields remount) — Camper 1 input reappears
    await page
      .locator('input[aria-label="Camper 1"]')
      .waitFor({ state: "visible", timeout: 20_000 });
    metric.submitMs = Date.now() - t3;
  } catch (err) {
    metric.error = String(err);
  }

  metric.totalMs = Date.now() - t0;
  return metric;
}

async function runWorker(
  browser: Browser,
  workerId: number,
  creds: Credentials,
  pairs: [string, string][],
  poolUrl: string,
): Promise<PairMetric[]> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await login(page, creds);
  await openPoolPage(page, poolUrl);

  const metrics: PairMetric[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const [c1, c2] = pairs[i];
    const m = await addOnePair(page, c1, c2, workerId, i + 1);
    metrics.push(m);
    if (m.error) {
      console.error(`Worker ${workerId} pair ${i + 1} error: ${m.error}`);
    }
  }

  await ctx.close();
  return metrics;
}

// ---------------------------------------------------------------------------
// Real-time probe: measures how long it takes for a pair added by user 1
// to appear on user 2's screen via Supabase Realtime.
// ---------------------------------------------------------------------------
async function measureRealtimePropagation(
  browser: Browser,
  poolUrl: string,
  probePair: [string, string],
): Promise<number> {
  const [ctxSender, ctxReceiver] = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [sender, receiver] = await Promise.all([
    ctxSender.newPage(),
    ctxReceiver.newPage(),
  ]);

  await Promise.all([login(sender, USERS[0]), login(receiver, USERS[1])]);
  await Promise.all([openPoolPage(sender, poolUrl), openPoolPage(receiver, poolUrl)]);

  // Give Supabase Realtime WebSocket subscriptions time to complete their handshake.
  // The LiveBoard useEffect sets up the channel synchronously but the SUBSCRIBED callback
  // fires asynchronously — without this wait the sender can add a pair before the
  // receiver's subscription is live and the event gets missed entirely.
  await Promise.all([sender.waitForTimeout(3_000), receiver.waitForTimeout(3_000)]);

  const [c1] = probePair;
  await addOnePair(sender, probePair[0], probePair[1], 0, 0);
  const sentAt = Date.now();

  // Receiver should see the new pair row via Supabase Realtime → 150ms debounce → fetch → render
  await receiver.getByText(c1, { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
  const propagationMs = Date.now() - sentAt;

  await Promise.all([ctxSender.close(), ctxReceiver.close()]);
  return propagationMs;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function printReport(allMetrics: PairMetric[], totalMs: number, realtimeMs: number) {
  const successful = allMetrics.filter((m) => !m.error);
  const errors = allMetrics.filter((m) => m.error);

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
  const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

  console.log("\n" + "=".repeat(60));
  console.log("  BUDDYBOARD CONCURRENT PAIRS PERFORMANCE REPORT");
  console.log("=".repeat(60));
  console.log(`  Workers        : 3`);
  console.log(`  Pairs attempted: ${allMetrics.length}`);
  console.log(`  Pairs succeeded: ${successful.length}`);
  console.log(`  Errors         : ${errors.length}`);
  console.log(`  Total wall time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(
    `  Throughput     : ${Math.round((successful.length / totalMs) * 60_000)} pairs/min`,
  );
  console.log(`  Realtime lag   : ${realtimeMs}ms (sender → receiver)`);
  console.log("");

  for (let w = 1; w <= 3; w++) {
    const wm = successful.filter((m) => m.worker === w);
    if (!wm.length) continue;
    const totals = wm.map((m) => m.totalMs);
    const s1 = wm.map((m) => m.searchMs1);
    const s2 = wm.map((m) => m.searchMs2);
    const sub = wm.map((m) => m.submitMs);
    console.log(`  Worker ${w} — ${USERS[w - 1].username} (${wm.length} pairs)`);
    console.log(
      `    Total/pair : avg ${avg(totals)}ms  min ${min(totals)}ms  max ${max(totals)}ms`,
    );
    console.log(`    Search C1  : avg ${avg(s1)}ms`);
    console.log(`    Search C2  : avg ${avg(s2)}ms`);
    console.log(`    Submit RT  : avg ${avg(sub)}ms`);
  }

  if (errors.length) {
    console.log("\n  ERRORS:");
    for (const e of errors) {
      console.log(`    Worker ${e.worker} pair ${e.pairIndex}: ${e.error}`);
    }
  }

  console.log("=".repeat(60) + "\n");
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------
test("3 concurrent counselors adding pairs under load", async ({ browser }) => {
  const poolUrl = `/pools/${poolId}`;

  // Reserve one pair from worker 3's slice for the realtime probe
  const probePair = workerPairs[2].pop()!;
  expect(probePair).toBeDefined();

  console.log(`\nPool URL    : ${poolUrl}`);
  console.log(`Users       : ${USERS.map((u) => u.username).join(", ")}`);
  console.log(`Pairs/worker: ${workerPairs[0].length}, ${workerPairs[1].length}, ${workerPairs[2].length}`);

  console.log("\nMeasuring real-time propagation (1 probe pair)...");
  const realtimeMs = await measureRealtimePropagation(browser, poolUrl, probePair);
  console.log(`  Realtime lag: ${realtimeMs}ms`);

  console.log("\nStarting concurrent load (3 workers)...");
  const wallStart = Date.now();

  const [m1, m2, m3] = await Promise.all([
    runWorker(browser, 1, USERS[0], workerPairs[0], poolUrl),
    runWorker(browser, 2, USERS[1], workerPairs[1], poolUrl),
    runWorker(browser, 3, USERS[2], workerPairs[2], poolUrl),
  ]);

  const totalMs = Date.now() - wallStart;
  printReport([...m1, ...m2, ...m3], totalMs, realtimeMs);

  const errorCount = [...m1, ...m2, ...m3].filter((m) => m.error).length;
  expect(errorCount, `${errorCount} pairs failed — see error log above`).toBe(0);
});
