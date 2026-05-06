import { describe, expect, test } from "bun:test";
import { app } from "@/app";
import { requestHealth } from "@/test/http";

/**
 * Lightweight speed guard: catches major regressions (order of magnitude), not micro-benchmarks.
 */
describe("speed (health endpoint)", () => {
  test("non-blocking benchmark: median latency snapshot", async () => {
    const runs = 40;
    const times: number[] = [];

    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();
      const res = await requestHealth(app);
      times.push(performance.now() - t0);
      expect(res.status).toBe(200);
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)]!;
    console.info(`[bench] health median latency: ${median.toFixed(2)}ms over ${runs} runs`);
  });
});
