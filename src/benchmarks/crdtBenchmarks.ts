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

// Benchmark configuration
export const BENCHMARK_CONFIG = {
    OP_SIZE: 128,
    SYNC_ITERATIONS: 20,
    SYNC_CONCURRENT_DOCS: 5,
    SYNC_CONCURRENT_OPS: 10,
};

// Define interface for the benchmark snippet
export interface BenchmarkSnippet {
    code: string;
    fn: () => void;
}

// Code snippets for each benchmark operation
export const CODE_SNIPPETS: Record<string, BenchmarkSnippet> = {
    // Text operations
    "Yjs - Text Insert": {
        code: `
const doc = new Y.Doc();
const text = doc.getText("text");
for (let i = 0; i < OP_SIZE; i++) {
    text.insert(0, "a");
}`,
        fn: () => {
            const doc = new Y.Doc();
            const text = doc.getText("text");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                text.insert(0, "a");
            }
        },
    },
    "Automerge - Text Insert": {
        code: `
let doc = Automerge.init<AutomergeTextDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeTextDoc) => {
        if (!d.text) d.text = new Automerge.Text();
        d.text.insertAt(0, "a");
    });
}`,
        fn: () => {
            let doc = Automerge.init<AutomergeTextDoc>();
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                doc = Automerge.change(doc, (d: AutomergeTextDoc) => {
                    if (!d.text) d.text = new Automerge.Text();
                    d.text.insertAt(0, "a");
                });
            }
        },
    },
    "Loro - Text Insert": {
        code: `
const doc = new LoroDoc();
const text = doc.getText("text");
for (let i = 0; i < OP_SIZE; i++) {
    text.insert(0, "a");
}`,
        fn: () => {
            const doc = new LoroDoc();
            const text = doc.getText("text");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                text.insert(0, "a");
            }
        },
    },

    // List operations
    "Yjs - List Operations": {
        code: `
const doc = new Y.Doc();
const list = doc.getArray("list");
for (let i = 0; i < OP_SIZE; i++) {
    list.push([i]);
}`,
        fn: () => {
            const doc = new Y.Doc();
            const list = doc.getArray("list");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                list.push([i]);
            }
        },
    },
    "Automerge - List Operations": {
        code: `
let doc = Automerge.init<AutomergeListDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeListDoc) => {
        if (!d.list) d.list = [];
        d.list.push(i);
    });
}`,
        fn: () => {
            let doc = Automerge.init<AutomergeListDoc>();
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                doc = Automerge.change(doc, (d: AutomergeListDoc) => {
                    if (!d.list) d.list = [];
                    d.list.push(i);
                });
            }
        },
    },
    "Loro - List Operations": {
        code: `
const doc = new LoroDoc();
const list = doc.getList("list");
for (let i = 0; i < OP_SIZE; i++) {
    list.push(i);
}`,
        fn: () => {
            const doc = new LoroDoc();
            const list = doc.getList("list");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                list.push(i);
            }
        },
    },

    // Map operations
    "Yjs - Map Operations": {
        code: `
const doc = new Y.Doc();
const map = doc.getMap("map");
for (let i = 0; i < OP_SIZE; i++) {
    map.set(\`key\${i}\`, i);
}`,
        fn: () => {
            const doc = new Y.Doc();
            const map = doc.getMap("map");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                map.set(`key${i}`, i);
            }
        },
    },
    "Automerge - Map Operations": {
        code: `
let doc = Automerge.init<AutomergeMapDoc>();
for (let i = 0; i < OP_SIZE; i++) {
    doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
        if (!d.map) d.map = {};
        d.map[\`key\${i}\`] = i;
    });
}`,
        fn: () => {
            let doc = Automerge.init<AutomergeMapDoc>();
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
                    if (!d.map) d.map = {};
                    d.map[`key${i}`] = i;
                });
            }
        },
    },
    "Loro - Map Operations": {
        code: `
const doc = new LoroDoc();
const map = doc.getMap("map");
for (let i = 0; i < OP_SIZE; i++) {
    map.set(\`key\${i}\`, i);
}`,
        fn: () => {
            const doc = new LoroDoc();
            const map = doc.getMap("map");
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                map.set(`key${i}`, i);
            }
        },
    },

    // Add the new concurrent map entry benchmark
    "Yjs - Map Concurrent Same Entry": {
        code: `
const doc = new Y.Doc();
const map = doc.getMap("map");
map.set("key", 0);

// Create 1000 concurrent docs
const concurrentDocs = Array(OP_SIZE).fill(0).map(() => {
    const doc = new Y.Doc();
    // Initialize with the same value
    const map = doc.getMap("map");
    map.set("key", 0);
    return doc;
});

// Each concurrent doc updates the same entry with a different value
concurrentDocs.forEach((concurrentDoc, i) => {
    const map = concurrentDoc.getMap("map");
    map.set("key", i + 1);
});

// Merge all docs back to the original
concurrentDocs.forEach((concurrentDoc) => {
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(concurrentDoc));
});`,
        fn: () => {
            const doc = new Y.Doc();
            const map = doc.getMap("map");
            map.set("key", 0);

            // Create 1000 concurrent docs
            const concurrentDocs = Array(BENCHMARK_CONFIG.OP_SIZE).fill(0).map(
                () => {
                    const doc = new Y.Doc();
                    // Initialize with the same value
                    const map = doc.getMap("map");
                    map.set("key", 0);
                    return doc;
                },
            );

            // Each concurrent doc updates the same entry with a different value
            concurrentDocs.forEach((concurrentDoc, i) => {
                const map = concurrentDoc.getMap("map");
                map.set("key", i + 1);
            });

            // Merge all docs back to the original
            doc.transact(() => {
                concurrentDocs.forEach((concurrentDoc) => {
                    Y.applyUpdate(doc, Y.encodeStateAsUpdate(concurrentDoc));
                });
            });
        },
    },
    "Automerge - Map Concurrent Same Entry": {
        code: `
let doc = Automerge.init<AutomergeMapDoc>();
doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
    if (!d.map) d.map = {};
    d.map["key"] = 0;
});

// Create 1000 concurrent docs
const concurrentDocs = Array(BENCHMARK_CONFIG.OP_SIZE).fill(0).map(() => {
    const newDoc = Automerge.clone(doc);
    return newDoc;
});

// Each concurrent doc updates the same entry with a different value
concurrentDocs.forEach((concurrentDoc, i) => {
    concurrentDocs[i] = Automerge.change(concurrentDoc, (d: AutomergeMapDoc) => {
        if (!d.map) d.map = {};
        d.map["key"] = i + 1;
    });
});

// Merge all docs back to the original
let finalDoc = doc;
concurrentDocs.forEach((concurrentDoc) => {
    finalDoc = Automerge.merge(finalDoc, concurrentDoc);
});`,
        fn: () => {
            let doc = Automerge.init<AutomergeMapDoc>();
            doc = Automerge.change(doc, (d: AutomergeMapDoc) => {
                if (!d.map) d.map = {};
                d.map["key"] = 0;
            });

            // Create 1000 concurrent docs
            const concurrentDocs = Array(BENCHMARK_CONFIG.OP_SIZE).fill(0).map(
                () => {
                    const newDoc = Automerge.clone(doc);
                    return newDoc;
                },
            );

            // Each concurrent doc updates the same entry with a different value
            concurrentDocs.forEach((concurrentDoc, i) => {
                concurrentDocs[i] = Automerge.change(
                    concurrentDoc,
                    (d: AutomergeMapDoc) => {
                        if (!d.map) d.map = {};
                        d.map["key"] = i + 1;
                    },
                );
            });

            // Merge all docs back to the original
            let finalDoc = doc;
            concurrentDocs.forEach((concurrentDoc) => {
                finalDoc = Automerge.merge(finalDoc, concurrentDoc);
            });
        },
    },
    "Loro - Map Concurrent Same Entry": {
        code: `
const doc = new LoroDoc();
const map = doc.getMap("map");
map.set("key", 0);

// Create 1000 concurrent docs
const concurrentDocs = Array(BENCHMARK_CONFIG.OP_SIZE).fill(0).map(() => {
    const doc = new LoroDoc();
    // Initialize with the same value
    const map = doc.getMap("map");
    map.set("key", 0);
    return doc;
});

// Each concurrent doc updates the same entry with a different value
concurrentDocs.forEach((concurrentDoc, i) => {
    const map = concurrentDoc.getMap("map");
    map.set("key", i + 1);
});

// Merge all docs back to the original
doc.importBatch(
    concurrentDocs.map((concurrentDoc) =>
        concurrentDoc.export({ mode: "update" })
    ),
); `,
        fn: () => {
            const doc = new LoroDoc();
            const map = doc.getMap("map");
            map.set("key", 0);

            // Create 1000 concurrent docs
            const concurrentDocs = Array(BENCHMARK_CONFIG.OP_SIZE).fill(0).map(
                () => {
                    const doc = new LoroDoc();
                    // Initialize with the same value
                    const map = doc.getMap("map");
                    map.set("key", 0);
                    return doc;
                },
            );

            // Each concurrent doc updates the same entry with a different value
            concurrentDocs.forEach((concurrentDoc, i) => {
                const map = concurrentDoc.getMap("map");
                map.set("key", i + 1);
            });

            // Merge all docs back to the original
            doc.importBatch(
                concurrentDocs.map((concurrentDoc) =>
                    concurrentDoc.export({ mode: "update" })
                ),
            );
        },
    },

    // Tree operations (only for Loro which has dedicated tree ops)
    "Loro - Tree Operations": {
        code: `
const doc = new LoroDoc();
const tree = doc.getTree("tree");
// Create a tree with multiple nodes
const root = tree.createNode();
for (let i = 0; i < OP_SIZE; i++) {
    const node = tree.createNode();
    node.move(root);
    
    // Add some nested children to create a deeper tree
    if (i % 10 === 0) {
        const childNode = tree.createNode();
        childNode.move(node);
    }
}`,
        fn: () => {
            const doc = new LoroDoc();
            const tree = doc.getTree("tree");
            // Create a tree with multiple nodes
            const root = tree.createNode();
            for (let i = 0; i < BENCHMARK_CONFIG.OP_SIZE; i++) {
                const node = tree.createNode();
                // Move the node to be a child of root instead of using addChild
                node.move(root);

                // Add some nested children to create a deeper tree
                if (i % 10 === 0) {
                    const childNode = tree.createNode();
                    // Move the childNode to be a child of node instead of using addChild
                    childNode.move(node);
                }
            }
        },
    },

    // Simple sync operations
    "Yjs - Simple Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const text1 = doc1.getText("text");
    text1.insert(0, "Hello");
    const update = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, update);
}`,
        fn: () => {
            for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                const doc1 = new Y.Doc();
                const doc2 = new Y.Doc();
                const text1 = doc1.getText("text");
                text1.insert(0, "Hello");
                const update = Y.encodeStateAsUpdate(doc1);
                Y.applyUpdate(doc2, update);
            }
        },
    },

    "Automerge - Simple Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    let doc1 = Automerge.init<AutomergeTextDoc>();
    doc1 = Automerge.change(doc1, (d: AutomergeTextDoc) => {
        if (!d.text) d.text = new Automerge.Text();
        d.text.insertAt(0, "Hello");
    });
    const doc2 = Automerge.init<AutomergeTextDoc>();
    Automerge.merge(doc2, doc1);
}`,
        fn: () => {
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
    },

    "Loro - Simple Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    const doc1 = new LoroDoc();
    const doc2 = new LoroDoc();
    const text1 = doc1.getText("text");
    text1.insert(0, "Hello");
    const update = doc1.export({ mode: "update" });
    doc2.import(update);
}`,
        fn: () => {
            for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                const doc1 = new LoroDoc();
                const doc2 = new LoroDoc();
                const text1 = doc1.getText("text");
                text1.insert(0, "Hello");
                const update = doc1.export({ mode: "update" });
                doc2.import(update);
            }
        },
    },

    // Complex sync operations - concurrent edits
    "Yjs - Concurrent Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    // Create multiple documents to simulate concurrent changes
    const docs = Array(SYNC_CONCURRENT_DOCS).fill(0).map(() => new Y.Doc());
    
    // Make concurrent changes to each document
    docs.forEach((doc, idx) => {
        const text = doc.getText("text");
        for (let j = 0; j < SYNC_CONCURRENT_OPS; j++) {
            text.insert(j, \`Doc\${idx}-Change\${j}\`);
        }
    });
    
    // Sync all documents together
    for (let j = 0; j < docs.length; j++) {
        for (let k = 0; k < docs.length; k++) {
            if (j !== k) {
                const update = Y.encodeStateAsUpdate(docs[j]);
                Y.applyUpdate(docs[k], update);
            }
        }
    }
}`,
        fn: () => {
            for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                // Create multiple documents to simulate concurrent changes
                const docs = Array(BENCHMARK_CONFIG.SYNC_CONCURRENT_DOCS)
                    .fill(0).map(() => new Y.Doc());

                // Make concurrent changes to each document
                docs.forEach((doc, idx) => {
                    const text = doc.getText("text");
                    for (
                        let j = 0;
                        j < BENCHMARK_CONFIG.SYNC_CONCURRENT_OPS;
                        j++
                    ) {
                        text.insert(j, `Doc${idx}-Change${j}`);
                    }
                });

                // Sync all documents together
                for (let j = 0; j < docs.length; j++) {
                    for (let k = 0; k < docs.length; k++) {
                        if (j !== k) {
                            const update = Y.encodeStateAsUpdate(docs[j]);
                            Y.applyUpdate(docs[k], update);
                        }
                    }
                }
            }
        },
    },

    "Automerge - Concurrent Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    // Create multiple documents to simulate concurrent changes
    let docs = Array(SYNC_CONCURRENT_DOCS).fill(0).map(() => Automerge.init<AutomergeTextDoc>());
    
    // Make concurrent changes to each document
    docs = docs.map((doc, idx) => {
        let newDoc = doc;
        for (let j = 0; j < SYNC_CONCURRENT_OPS; j++) {
            newDoc = Automerge.change(newDoc, (d: AutomergeTextDoc) => {
                if (!d.text) d.text = new Automerge.Text();
                d.text.insertAt(j, \`Doc\${idx}-Change\${j}\`);
            });
        }
        return newDoc;
    });
    
    // Merge all documents (result intentionally not used)
    docs.reduce((acc, doc) => Automerge.merge(acc, doc), Automerge.init<AutomergeTextDoc>());
}`,
        fn: () => {
            for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                // Create multiple documents to simulate concurrent changes
                let docs = Array(BENCHMARK_CONFIG.SYNC_CONCURRENT_DOCS)
                    .fill(0).map(() => Automerge.init<AutomergeTextDoc>());

                // Make concurrent changes to each document
                docs = docs.map((doc, idx) => {
                    let newDoc = doc;
                    for (
                        let j = 0;
                        j < BENCHMARK_CONFIG.SYNC_CONCURRENT_OPS;
                        j++
                    ) {
                        newDoc = Automerge.change(
                            newDoc,
                            (d: AutomergeTextDoc) => {
                                if (!d.text) d.text = new Automerge.Text();
                                d.text.insertAt(j, `Doc${idx}-Change${j}`);
                            },
                        );
                    }
                    return newDoc;
                });

                // Merge all documents (result intentionally not used)
                docs.reduce(
                    (acc, doc) => Automerge.merge(acc, doc),
                    Automerge.init<AutomergeTextDoc>(),
                );
            }
        },
    },

    "Loro - Concurrent Sync": {
        code: `
for (let i = 0; i < SYNC_ITERATIONS; i++) {
    // Create multiple documents to simulate concurrent changes
    const docs = Array(SYNC_CONCURRENT_DOCS).fill(0).map(() => new LoroDoc());
    
    // Make concurrent changes to each document
    docs.forEach((doc, idx) => {
        const text = doc.getText("text");
        for (let j = 0; j < SYNC_CONCURRENT_OPS; j++) {
            text.insert(j, \`Doc\${idx}-Change\${j}\`);
        }
    });
    
    // Sync all documents together
    for (let j = 0; j < docs.length; j++) {
        for (let k = 0; k < docs.length; k++) {
            if (j !== k) {
                const update = docs[j].export({ mode: "update" });
                docs[k].import(update);
            }
        }
    }
}`,
        fn: () => {
            for (let i = 0; i < BENCHMARK_CONFIG.SYNC_ITERATIONS; i++) {
                // Create multiple documents to simulate concurrent changes
                const docs = Array(BENCHMARK_CONFIG.SYNC_CONCURRENT_DOCS)
                    .fill(0).map(() => new LoroDoc());

                // Make concurrent changes to each document
                docs.forEach((doc, idx) => {
                    const text = doc.getText("text");
                    for (
                        let j = 0;
                        j < BENCHMARK_CONFIG.SYNC_CONCURRENT_OPS;
                        j++
                    ) {
                        text.insert(j, `Doc${idx}-Change${j}`);
                    }
                });

                // Sync all documents together
                for (let j = 0; j < docs.length; j++) {
                    for (let k = 0; k < docs.length; k++) {
                        if (j !== k) {
                            const update = docs[j].export({
                                mode: "update",
                            });
                            docs[k].import(update);
                        }
                    }
                }
            }
        },
    },
};

export const BENCHMARK_GROUPS = (() => {
    // Extract all unique operation types
    const uniqueOps = new Set<string>();

    Object.keys(CODE_SNIPPETS).forEach((key) => {
        const parts = key.split(" - ");
        if (parts.length > 1) {
            uniqueOps.add(parts[1]);
        }
    });

    // Return sorted array of operations
    return Array.from(uniqueOps).sort();
})();

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

        // Group benchmarks by operation type
        const benchmarkGroups = this.groupBenchmarksByOperation();

        // Run each group of benchmarks
        for (
            const [groupName, benchmarkKeys] of Object.entries(benchmarkGroups)
        ) {
            console.log(`Running ${groupName} benchmarks...`);
            await this.runBenchmarkGroup(groupName, benchmarkKeys);
            this.onProgress?.(this.results);
        }

        console.log("All benchmarks completed");
        return this.results;
    }

    private groupBenchmarksByOperation(): Record<string, string[]> {
        const groups: Record<string, string[]> = {};

        // Iterate through all CODE_SNIPPETS keys and group them by operation type
        Object.keys(CODE_SNIPPETS).forEach((key) => {
            const parts = key.split(" - ");
            if (parts.length > 1) {
                const operationType = parts[1].trim();
                if (!groups[operationType]) {
                    groups[operationType] = [];
                }
                groups[operationType].push(key);
            }
        });

        return groups;
    }

    private async runBenchmarkGroup(
        groupName: string,
        benchmarkKeys: string[],
    ): Promise<void> {
        // Clear previous tasks
        this.bench.reset();

        // Add all benchmarks for this group
        for (const key of benchmarkKeys) {
            const snippet = CODE_SNIPPETS[key];
            if (!snippet) continue;

            // Get the right replacement values for the code display
            let codeDisplay = snippet.code;

            if (key.includes("Sync")) {
                if (key.includes("Concurrent")) {
                    codeDisplay = codeDisplay
                        .replace(
                            "SYNC_ITERATIONS",
                            BENCHMARK_CONFIG.SYNC_ITERATIONS.toString(),
                        )
                        .replace(
                            "SYNC_CONCURRENT_DOCS",
                            BENCHMARK_CONFIG.SYNC_CONCURRENT_DOCS.toString(),
                        )
                        .replace(
                            "SYNC_CONCURRENT_OPS",
                            BENCHMARK_CONFIG.SYNC_CONCURRENT_OPS.toString(),
                        );
                } else {
                    codeDisplay = codeDisplay.replace(
                        "SYNC_ITERATIONS",
                        BENCHMARK_CONFIG.SYNC_ITERATIONS.toString(),
                    );
                }
            } else {
                codeDisplay = codeDisplay.replace(
                    "OP_SIZE",
                    BENCHMARK_CONFIG.OP_SIZE.toString(),
                );
            }

            this.bench.add(key, snippet.fn, codeDisplay);
        }

        console.log(`Starting ${groupName} benchmark run...`);
        const results = await this.bench.run();
        this.results.push(...results);
        console.log(`${groupName} benchmark completed`);
    }
}
