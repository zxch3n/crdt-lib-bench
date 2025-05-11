import { CRDTBenchmarks } from "./crdtBenchmarks";

let benchmarks: CRDTBenchmarks | null = null;

self.onmessage = async (e: MessageEvent) => {
    if (e.data === "start") {
        try {
            benchmarks = new CRDTBenchmarks((results) => {
                self.postMessage({ type: "progress", results });
            });
            const results = await benchmarks.runAllBenchmarks();
            self.postMessage({ type: "complete", results });
        } catch (error) {
            if (error instanceof Error) {
                self.postMessage({ type: "error", error: error.message });
            } else {
                self.postMessage({
                    type: "error",
                    error: "An unknown error occurred",
                });
            }
        }
    }
};
