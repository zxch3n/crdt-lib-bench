import {
    BENCHMARK_CONFIG,
    BENCHMARK_GROUPS,
    CRDTBenchmarks,
} from "./crdtBenchmarks";

let benchmarks: CRDTBenchmarks | null = null;

self.onmessage = async (e: MessageEvent) => {
    if (e.data === "start") {
        try {
            console.log("[Worker] Starting benchmark process");
            self.postMessage({
                type: "status",
                message: "Initializing benchmarks...",
            });

            benchmarks = new CRDTBenchmarks((results) => {
                // Progress update callback
                console.log(
                    `[Worker] Progress update: ${results.length} results so far`,
                );
                self.postMessage({
                    type: "progress",
                    results,
                    message: `Completed ${
                        new Set(results.map((r) => r.name)).size
                    } of ${BENCHMARK_GROUPS.length} benchmark suites`,
                });
            });

            self.postMessage({
                type: "status",
                message: "Running benchmarks...",
            });
            console.time("[Worker] Total benchmark time");

            const results = await benchmarks.runAllBenchmarks();

            console.log("[Worker] Final results:", results);
            console.log("[Worker] Results count:", results.length);
            console.log(
                "[Worker] Operations:",
                new Set(results.map((r) => r.name)),
            );
            console.log(
                "[Worker] Libraries:",
                new Set(results.map((r) => r.library)),
            );

            console.timeEnd("[Worker] Total benchmark time");
            console.log(
                `[Worker] All benchmarks completed with ${results.length} total results`,
            );

            self.postMessage({
                type: "complete",
                results,
                message: "All benchmarks completed successfully",
            });

            // Send results again to ensure they're received
            setTimeout(() => {
                console.log("[Worker] Sending results again to ensure receipt");
                self.postMessage({
                    type: "progress",
                    results,
                    message: "All benchmarks completed successfully",
                });
            }, 500);
        } catch (error) {
            console.error("[Worker] Benchmark error:", error);

            if (error instanceof Error) {
                self.postMessage({
                    type: "error",
                    error: error.message,
                    stack: error.stack,
                });
            } else {
                self.postMessage({
                    type: "error",
                    error: "An unknown error occurred",
                });
            }
        }
    } else if (typeof e.data === "object" && e.data.type === "start") {
        try {
            const opSize = e.data.opSize || BENCHMARK_CONFIG.OP_SIZE;
            console.log(
                `[Worker] Starting benchmark process with OP_SIZE: ${opSize}`,
            );

            self.postMessage({
                type: "status",
                message:
                    `Initializing benchmarks with operation size: ${opSize}...`,
            });

            benchmarks = new CRDTBenchmarks((results) => {
                // Progress update callback
                console.log(
                    `[Worker] Progress update: ${results.length} results so far`,
                );
                self.postMessage({
                    type: "progress",
                    results,
                    message: `Completed ${
                        new Set(results.map((r) => r.name)).size
                    } of ${BENCHMARK_GROUPS.length} benchmark suites`,
                });
            }, opSize);

            self.postMessage({
                type: "status",
                message:
                    `Running benchmarks with ${opSize} operations per iteration...`,
            });
            console.time("[Worker] Total benchmark time");

            const results = await benchmarks.runAllBenchmarks();

            console.log("[Worker] Final results:", results);
            console.log("[Worker] Results count:", results.length);
            console.log(
                "[Worker] Operations:",
                new Set(results.map((r) => r.name)),
            );
            console.log(
                "[Worker] Libraries:",
                new Set(results.map((r) => r.library)),
            );

            console.timeEnd("[Worker] Total benchmark time");
            console.log(
                `[Worker] All benchmarks completed with ${results.length} total results`,
            );

            self.postMessage({
                type: "complete",
                results,
                message:
                    `All benchmarks completed successfully with ${opSize} operations per iteration`,
            });

            // Send results again to ensure they're received
            setTimeout(() => {
                console.log("[Worker] Sending results again to ensure receipt");
                self.postMessage({
                    type: "progress",
                    results,
                    message:
                        `All benchmarks completed successfully with ${opSize} operations per iteration`,
                });
            }, 500);
        } catch (error) {
            console.error("[Worker] Benchmark error:", error);

            if (error instanceof Error) {
                self.postMessage({
                    type: "error",
                    error: error.message,
                    stack: error.stack,
                });
            } else {
                self.postMessage({
                    type: "error",
                    error: "An unknown error occurred",
                });
            }
        }
    }
};
