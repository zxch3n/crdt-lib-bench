/**
 * A lightweight benchmarking utility to replace tinybench
 */

export interface BenchmarkTask {
    name: string;
    fn: () => void | Promise<void>;
    code: string; // Store the code for display
}

export interface BenchmarkResult {
    name: string;
    library: string;
    opsPerSecond: number;
    error: number;
    samples: number[];
    code: string; // Store the code for display
    executionTime: number; // Total execution time in ms
}

export class SimpleBench {
    private tasks: BenchmarkTask[] = [];
    private results: BenchmarkResult[] = [];
    private timeoutMs: number;
    private iterations: number;

    constructor(options: { timeoutMs?: number; iterations?: number } = {}) {
        this.timeoutMs = options.timeoutMs || 500;
        this.iterations = options.iterations || 50;
    }

    /**
     * Add a benchmark task
     */
    add(
        name: string,
        fn: () => void | Promise<void>,
        code: string,
    ): SimpleBench {
        this.tasks.push({ name, fn, code });
        return this;
    }

    /**
     * Clear all tasks
     */
    reset(): void {
        this.tasks = [];
        this.results = [];
    }

    /**
     * Run a specific benchmark task and return the result
     */
    private async runTask(task: BenchmarkTask): Promise<BenchmarkResult> {
        console.log(`Running benchmark for ${task.name}...`);

        // First, do a warmup run
        const warmupIterations = 5;
        for (let i = 0; i < warmupIterations; i++) {
            await task.fn();
        }

        const samples: number[] = [];
        const startTime = performance.now();

        // Run for a set time or number of iterations, whichever comes first
        const endTime = startTime + this.timeoutMs;
        let totalOps = 0;
        let iteration = 0;

        while (performance.now() < endTime && iteration < this.iterations) {
            const iterationStart = performance.now();
            await task.fn();
            const iterationTime = performance.now() - iterationStart;

            samples.push(iterationTime);
            totalOps++;
            iteration++;
        }

        const totalTime = performance.now() - startTime;

        // Calculate operations per second
        const opsPerSecond = (totalOps / totalTime) * 1000;

        // Calculate error margin (simplified)
        const mean = samples.reduce((sum, val) => sum + val, 0) /
            samples.length;
        const squaredDiffs = samples.map((val) => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) /
            samples.length;
        const stdDev = Math.sqrt(variance);
        const relativeError = (stdDev / mean) * 100;

        // Extract library name from task name (format: "Library - Operation")
        const nameParts = task.name.split(" - ");
        const library = nameParts[0];
        const operation = nameParts.length > 1 ? nameParts[1] : task.name;

        const result: BenchmarkResult = {
            name: operation,
            library,
            opsPerSecond,
            error: relativeError,
            samples,
            code: task.code,
            executionTime: totalTime,
        };

        console.log(
            `Benchmark ${task.name}: ${Math.round(opsPerSecond)} ops/sec (±${
                relativeError.toFixed(2)
            }%)`,
        );

        return result;
    }

    /**
     * Run all benchmark tasks
     */
    async run(): Promise<BenchmarkResult[]> {
        this.results = [];

        for (const task of this.tasks) {
            const result = await this.runTask(task);
            this.results.push(result);
        }

        return this.results;
    }

    /**
     * Get all benchmark results
     */
    getResults(): BenchmarkResult[] {
        return this.results;
    }
}
