import { Bench, TaskResult } from "tinybench";
import * as Y from "yjs";
import * as Automerge from "@automerge/automerge";
import { LoroDoc } from "loro-crdt";

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

export interface BenchmarkResult {
    name: string;
    library: string;
    opsPerSecond: number;
    error: number;
    samples: number;
}

export class CRDTBenchmarks {
    private bench: Bench;
    private results: BenchmarkResult[] = [];
    private onProgress?: (results: BenchmarkResult[]) => void;

    constructor(onProgress?: (results: BenchmarkResult[]) => void) {
        this.bench = new Bench({
            time: 1000, // 1 second per benchmark
            iterations: 100, // 100 iterations per benchmark
        });
        this.onProgress = onProgress;
    }

    async runAllBenchmarks(): Promise<BenchmarkResult[]> {
        this.results = [];

        // Text operations
        await this.benchTextOperations();
        this.onProgress?.(this.results);

        // List operations
        await this.benchListOperations();
        this.onProgress?.(this.results);

        // Map operations
        await this.benchMapOperations();
        this.onProgress?.(this.results);

        // Tree operations
        await this.benchTreeOperations();
        this.onProgress?.(this.results);

        // Sync operations
        await this.benchSyncOperations();
        this.onProgress?.(this.results);

        return this.results;
    }

    private async benchTextOperations() {
        // Yjs text operations
        this.bench.add("Yjs - Text Insert", () => {
            const doc = new Y.Doc();
            const text = doc.getText("text");
            for (let i = 0; i < 1000; i++) {
                text.insert(0, "a");
            }
        });

        // Automerge text operations
        this.bench.add("Automerge - Text Insert", () => {
            let doc = Automerge.init<AutomergeTextDoc>();
            for (let i = 0; i < 1000; i++) {
                doc = Automerge.change(doc, (d: AutomergeTextDoc) => {
                    if (!d.text) d.text = new Automerge.Text();
                    d.text.insertAt(0, "a");
                });
            }
        });

        // Loro text operations
        this.bench.add("Loro - Text Insert", () => {
            const doc = new LoroDoc();
            const text = doc.getText("text");
            for (let i = 0; i < 1000; i++) {
                text.insert(0, "a");
            }
        });

        await this.bench.run();
        this.collectResults("Text Insert");
    }

    private async benchListOperations() {
        // Yjs list operations
        this.bench.add("Yjs - List Operations", () => {
            const doc = new Y.Doc();
            const list = doc.getArray("list");
            for (let i = 0; i < 1000; i++) {
                list.push([i]);
            }
        });

        // Automerge list operations
        this.bench.add("Automerge - List Operations", () => {
            let doc = Automerge.init<AutomergeListDoc>();
            for (let i = 0; i < 1000; i++) {
                doc = Automerge.change(doc, (d: AutomergeListDoc) => {
                    if (!d.list) d.list = [];
                    d.list.push(i);
                });
            }
        });

        // Loro list operations
        this.bench.add("Loro - List Operations", () => {
            const doc = new LoroDoc();
            const list = doc.getList("list");
            for (let i = 0; i < 1000; i++) {
                list.push(i);
            }
        });

        await this.bench.run();
        this.collectResults("List Operations");
    }

    private async benchMapOperations() {
        // Yjs map operations
        this.bench.add("Yjs - Map Operations", () => {
            const doc = new Y.Doc();
            const map = doc.getMap("map");
            for (let i = 0; i < 1000; i++) {
                map.set(`key${i}`, i);
            }
        });

        // Automerge map operations
        this.bench.add("Automerge - Map Operations", () => {
            let doc = Automerge.init<AutomergeMapDoc>();
            for (let i = 0; i < 1000; i++) {
                doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
                    if (!d.map) d.map = {};
                    d.map[`key${i}`] = i;
                });
            }
        });

        // Loro map operations
        this.bench.add("Loro - Map Operations", () => {
            const doc = new LoroDoc();
            const map = doc.getMap("map");
            for (let i = 0; i < 1000; i++) {
                map.set(`key${i}`, i);
            }
        });

        await this.bench.run();
        this.collectResults("Map Operations");
    }

    private async benchTreeOperations() {
        // Yjs tree operations
        this.bench.add("Yjs - Tree Operations", () => {
            const doc = new Y.Doc();
            const map = doc.getMap("tree");
            for (let i = 0; i < 1000; i++) {
                map.set(`node${i}`, new Y.Map());
            }
        });

        // Automerge tree operations
        this.bench.add("Automerge - Tree Operations", () => {
            let doc = Automerge.init<AutomergeTreeDoc>();
            for (let i = 0; i < 1000; i++) {
                doc = Automerge.change(doc, (d: AutomergeTreeDoc) => {
                    if (!d.tree) d.tree = {};
                    d.tree[`node${i}`] = {};
                });
            }
        });

        // Loro tree operations
        this.bench.add("Loro - Tree Operations", () => {
            const doc = new LoroDoc();
            const tree = doc.getTree("tree");
            for (let i = 0; i < 1000; i++) {
                tree.createNode();
            }
        });

        await this.bench.run();
        this.collectResults("Tree Operations");
    }

    private async benchSyncOperations() {
        // Yjs sync operations
        this.bench.add("Yjs - Sync Operations", () => {
            const doc1 = new Y.Doc();
            const doc2 = new Y.Doc();
            const text1 = doc1.getText("text");
            text1.insert(0, "Hello");
            const update = Y.encodeStateAsUpdate(doc1);
            Y.applyUpdate(doc2, update);
        });

        // Automerge sync operations
        this.bench.add("Automerge - Sync Operations", () => {
            let doc1 = Automerge.init<AutomergeTextDoc>();
            doc1 = Automerge.change(doc1, (d: AutomergeTextDoc) => {
                if (!d.text) d.text = new Automerge.Text();
                d.text.insertAt(0, "Hello");
            });
            const doc2 = Automerge.init<AutomergeTextDoc>();
            Automerge.merge(doc2, doc1);
        });

        // Loro sync operations
        this.bench.add("Loro - Sync Operations", () => {
            const doc1 = new LoroDoc();
            const doc2 = new LoroDoc();
            const text1 = doc1.getText("text");
            text1.insert(0, "Hello");
            const update = doc1.export({ mode: "update" });
            doc2.import(update);
        });

        await this.bench.run();
        this.collectResults("Sync Operations");
    }

    private collectResults(operation: string) {
        const results = this.bench.results;
        results.forEach((result: TaskResult | undefined) => {
            if (result && "name" in result) {
                const taskName = result.name;
                if (typeof taskName === "string" && taskName.includes(" - ")) {
                    this.results.push({
                        name: operation,
                        library: taskName.split(" - ")[0],
                        opsPerSecond: result.hz,
                        error: result.rme,
                        samples: result.samples.length,
                    });
                }
            }
        });
    }
}
