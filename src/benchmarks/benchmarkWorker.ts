import { CRDTBenchmarks } from "./crdtBenchmarks";

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
                    } of 5 benchmark suites`,
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
                    message: "Re-sending final results to ensure receipt",
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
