import * as Y from "yjs";
import * as Automerge from "@automerge/automerge";
import { LoroDoc } from "loro-crdt";
import { BenchmarkResult, SimpleBench } from "./simpleBench";

// Define types for Automerge documents
interface AutomergeTextDoc {
    text?: Automerge.Text;
}

interface AutomergeListDoc {
    list?: number[];
}

interface AutomergeMapDoc {
    map?: Record<string, number>;
}

interface AutomergeTreeDoc {
    tree?: Record<string, Record<string, never>>;
}

// Benchmark configuration
export const BENCHMARK_CONFIG = {
    OP_SIZE: 128,
    SYNC_ITERATIONS: 20,
};

// Code snippets for each benchmark operation
export const CODE_SNIPPETS = {
    // Text operations
    "Yjs - Text Insert": `
const doc = new Y.Doc();
const text = doc.getText("text");
for (let i = 0; i < OP_SIZE; i++) {
    text.insert(0, "a");
}`,
    "Automerge - Text Insert": `
let doc = Automerge.init<AutomergeTextDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeTextDoc) => {
        if (!d.text) d.text = new Automerge.Text();
        d.text.insertAt(0, "a");
    });
}`,
    "Loro - Text Insert": `
const doc = new LoroDoc();
const text = doc.getText("text");
for (let i = 0; i < OP_SIZE; i++) {
    text.insert(0, "a");
}`,

    // List operations
    "Yjs - List Operations": `
const doc = new Y.Doc();
const list = doc.getArray("list");
for (let i = 0; i < OP_SIZE; i++) {
    list.push([i]);
}`,
    "Automerge - List Operations": `
let doc = Automerge.init<AutomergeListDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeListDoc) => {
        if (!d.list) d.list = [];
        d.list.push(i);
    });
}`,
    "Loro - List Operations": `
const doc = new LoroDoc();
const list = doc.getList("list");
for (let i = 0; i < OP_SIZE; i++) {
    list.push(i);
}`,

    // Map operations
    "Yjs - Map Operations": `
const doc = new Y.Doc();
const map = doc.getMap("map");
for (let i = 0; i < OP_SIZE; i++) {
    map.set(\`key\${i}\`, i);
}`,
    "Automerge - Map Operations": `
let doc = Automerge.init<AutomergeMapDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
        if (!d.map) d.map = {};
        d.map[\`key\${i}\`] = i;
    });
}`,
    "Loro - Map Operations": `
const doc = new LoroDoc();
const map = doc.getMap("map");
for (let i = 0; i < OP_SIZE; i++) {
    map.set(\`key\${i}\`, i);
}`,

    // Tree operations
    "Yjs - Tree Operations": `
const doc = new Y.Doc();
const map = doc.getMap("tree");
for (let i = 0; i < OP_SIZE; i++) {
    map.set(\`node\${i}\`, new Y.Map());
}`,
    "Automerge - Tree Operations": `
let doc = Automerge.init<AutomergeTreeDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeTreeDoc) => {
        if (!d.tree) d.tree = {};
        d.tree[\`node\${i}\`] = {};
    });
}`,
    "Loro - Tree Operations": `
const doc = new LoroDoc();
const tree = doc.getTree("tree");
for (let i = 0; i < OP_SIZE; i++) {
    tree.createNode();
}`,

    // Sync operations
    "Yjs - Sync Operations": `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const text1 = doc1.getText("text");
    text1.insert(0, "Hello");
    const update = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, update);
}`,
    "Automerge - Sync Operations": `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    let doc1 = Automerge.init<AutomergeTextDoc>();
    doc1 = Automerge.change(doc1, (d: AutomergeTextDoc) => {
        if (!d.text) d.text = new Automerge.Text();
        d.text.insertAt(0, "Hello");
    });
    const doc2 = Automerge.init<AutomergeTextDoc>();
    Automerge.merge(doc2, doc1);
}`,
    "Loro - Sync Operations": `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    const doc1 = new LoroDoc();
    const doc2 = new LoroDoc();
    const text1 = doc1.getText("text");
    text1.insert(0, "Hello");
    const update = doc1.export({ mode: "update" });
    doc2.import(update);
}`,
};

export class CRDTBenchmarks {
    private bench: SimpleBench;
    private results: BenchmarkResult[] = [];
    private onProgress?: (results: BenchmarkResult[]) => void;

    constructor(
        onProgress?: (results: BenchmarkResult[]) => void,
        opSize?: number,
    ) {
        this.bench = new SimpleBench({
            timeoutMs: 500,
            iterations: 50,
        });
        this.onProgress = onProgress;

        // Update OP_SIZE if provided
        if (opSize) {
            BENCHMARK_CONFIG.OP_SIZE = opSize;
        }
    }

    async runAllBenchmarks(): Promise<BenchmarkResult[]> {
        this.results = [];
        console.log(
            "Starting benchmarks with OP_SIZE:",
            BENCHMARK_CONFIG.OP_SIZE,
        );

        // Text operations
        console.log("Running Text Insert benchmarks...");
        await this.benchTextOperations();
        this.onProgress?.(this.results);

        // List operations
        console.log("Running List Operations benchmarks...");
        await this.benchListOperations();
        this.onProgress?.(this.results);

        // Map operations
        console.log("Running Map Operations benchmarks...");
        await this.benchMapOperations();
        this.onProgress?.(this.results);

        // Tree operations
        console.log("Running Tree Operations benchmarks...");
        await this.benchTreeOperations();
        this.onProgress?.(this.results);

        // Sync operations
        console.log("Running Sync Operations benchmarks...");
        await this.benchSyncOperations();
        this.onProgress?.(this.results);

        console.log("All benchmarks completed");
        return this.results;
    }

    private async benchTextOperations() {
        // Clear previous tasks
        this.bench.reset();

        // Yjs text operations
        this.bench.add(
            "Yjs - Text Insert",
            () => {
                const doc = new Y.Doc();
                const text = doc.getText("text");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    text.insert(0, "a");
                }
            },
            CODE_SNIPPETS["Yjs - Text Insert"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Automerge text operations
        this.bench.add(
            "Automerge - Text Insert",
            () => {
                let doc = Automerge.init<AutomergeTextDoc>();
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    doc = Automerge.change(doc, (d: AutomergeTextDoc) => {
                        if (!d.text) d.text = new Automerge.Text();
                        d.text.insertAt(0, "a");
                    });
                }
            },
            CODE_SNIPPETS["Automerge - Text Insert"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Loro text operations
        this.bench.add(
            "Loro - Text Insert",
            () => {
                const doc = new LoroDoc();
                const text = doc.getText("text");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    text.insert(0, "a");
                }
            },
            CODE_SNIPPETS["Loro - Text Insert"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        console.log("Starting Text Insert benchmark run...");
        const results = await this.bench.run();
        this.results.push(...results);
        console.log("Text Insert benchmark completed");
    }

    private async benchListOperations() {
        // Clear previous tasks
        this.bench.reset();

        // Yjs list operations
        this.bench.add(
            "Yjs - List Operations",
            () => {
                const doc = new Y.Doc();
                const list = doc.getArray("list");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    list.push([i]);
                }
            },
            CODE_SNIPPETS["Yjs - List Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Automerge list operations
        this.bench.add(
            "Automerge - List Operations",
            () => {
                let doc = Automerge.init<AutomergeListDoc>();
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    doc = Automerge.change(doc, (d: AutomergeListDoc) => {
                        if (!d.list) d.list = [];
                        d.list.push(i);
                    });
                }
            },
            CODE_SNIPPETS["Automerge - List Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Loro list operations
        this.bench.add(
            "Loro - List Operations",
            () => {
                const doc = new LoroDoc();
                const list = doc.getList("list");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    list.push(i);
                }
            },
            CODE_SNIPPETS["Loro - List Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        console.log("Starting List Operations benchmark run...");
        const results = await this.bench.run();
        this.results.push(...results);
        console.log("List Operations benchmark completed");
    }

    private async benchMapOperations() {
        // Clear previous tasks
        this.bench.reset();

        // Yjs map operations
        this.bench.add(
            "Yjs - Map Operations",
            () => {
                const doc = new Y.Doc();
                const map = doc.getMap("map");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    map.set(`key${i}`, i);
                }
            },
            CODE_SNIPPETS["Yjs - Map Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Automerge map operations
        this.bench.add(
            "Automerge - Map Operations",
            () => {
                let doc = Automerge.init<AutomergeMapDoc>();
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
                        if (!d.map) d.map = {};
                        d.map[`key${i}`] = i;
                    });
                }
            },
            CODE_SNIPPETS["Automerge - Map Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Loro map operations
        this.bench.add(
            "Loro - Map Operations",
            () => {
                const doc = new LoroDoc();
                const map = doc.getMap("map");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    map.set(`key${i}`, i);
                }
            },
            CODE_SNIPPETS["Loro - Map Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        console.log("Starting Map Operations benchmark run...");
        const results = await this.bench.run();
        this.results.push(...results);
        console.log("Map Operations benchmark completed");
    }

    private async benchTreeOperations() {
        // Clear previous tasks
        this.bench.reset();

        // Yjs tree operations
        this.bench.add(
            "Yjs - Tree Operations",
            () => {
                const doc = new Y.Doc();
                const map = doc.getMap("tree");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    map.set(`node${i}`, new Y.Map());
                }
            },
            CODE_SNIPPETS["Yjs - Tree Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Automerge tree operations
        this.bench.add(
            "Automerge - Tree Operations",
            () => {
                let doc = Automerge.init<AutomergeTreeDoc>();
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    doc = Automerge.change(doc, (d: AutomergeTreeDoc) => {
                        if (!d.tree) d.tree = {};
                        d.tree[`node${i}`] = {};
                    });
                }
            },
            CODE_SNIPPETS["Automerge - Tree Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        // Loro tree operations
        this.bench.add(
            "Loro - Tree Operations",
            () => {
                const doc = new LoroDoc();
                const tree = doc.getTree("tree");
                for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                    tree.createNode();
                }
            },
            CODE_SNIPPETS["Loro - Tree Operations"].replace(
                "OP_SIZE",
                BENCHMARK_CONFIG.OP_SIZE.toString(),
            ),
        );

        console.log("Starting Tree Operations benchmark run...");
        const results = await this.bench.run();
        this.results.push(...results);
        console.log("Tree Operations benchmark completed");
    }

    private async benchSyncOperations() {
        // Clear previous tasks
        this.bench.reset();

        // Yjs sync operations
        this.bench.add(
            "Yjs - Sync Operations",
            () => {
                for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                    const doc1 = new Y.Doc();
                    const doc2 = new Y.Doc();
                    const text1 = doc1.getText("text");
                    text1.insert(0, "Hello");
                    const update = Y.encodeStateAsUpdate(doc1);
                    Y.applyUpdate(doc2, update);
                }
            },
            CODE_SNIPPETS["Yjs - Sync Operations"].replace(
                "SYNC_ITERATIONS",
                BENCHMARK_CONFIG.SYNC_ITERATIONS.toString(),
            ),
        );

        // Automerge sync operations
        this.bench.add(
            "Automerge - Sync Operations",
            () => {
                for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                    let doc1 = Automerge.init<AutomergeTextDoc>();
                    doc1 = Automerge.change(doc1, (d: AutomergeTextDoc) => {
                        if (!d.text) d.text = new Automerge.Text();
                        d.text.insertAt(0, "Hello");
                    });
                    const doc2 = Automerge.init<AutomergeTextDoc>();
                    Automerge.merge(doc2, doc1);
                }
            },
            CODE_SNIPPETS["Automerge - Sync Operations"].replace(
                "SYNC_ITERATIONS",
                BENCHMARK_CONFIG.SYNC_ITERATIONS.toString(),
            ),
        );

        // Loro sync operations
        this.bench.add(
            "Loro - Sync Operations",
            () => {
                for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                    const doc1 = new LoroDoc();
                    const doc2 = new LoroDoc();
                    const text1 = doc1.getText("text");
                    text1.insert(0, "Hello");
                    const update = doc1.export({ mode: "update" });
                    doc2.import(update);
                }
            },
            CODE_SNIPPETS["Loro - Sync Operations"].replace(
                "SYNC_ITERATIONS",
                BENCHMARK_CONFIG.SYNC_ITERATIONS.toString(),
            ),
        );

        console.log("Starting Sync Operations benchmark run...");
        const results = await this.bench.run();
        this.results.push(...results);
        console.log("Sync Operations benchmark completed");
    }
}
