import { useState, useEffect, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { CheckCircle, Clock, XCircle, Loader2, RefreshCw, Code, X } from 'lucide-react'
import type { BenchmarkResult } from './benchmarks/simpleBench'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'

// Define the benchmark operations that will be run
const BENCHMARK_OPERATIONS = [
  'Text Insert',
  'List Operations',
  'Map Operations',
  'Tree Operations',
  'Sync Operations'
]

// Colors for different libraries
const LIBRARY_COLORS: Record<string, string> = {
  'Yjs': '#333333',
  'Automerge': '#666666',
  'Loro': '#999999'
}

function App() {
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set())
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<{ title: string, code: string }>({ title: '', code: '' })
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Add a log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const newWorker = new Worker(new URL('./benchmarks/benchmarkWorker.ts', import.meta.url), {
      type: 'module'
    })

    newWorker.onmessage = (e) => {
      const { type, results: newResults, error, message, stack } = e.data

      switch (type) {
        case 'status': {
          setStatusMessage(message || "");
          addLog(message);
          break;
        }
        case 'progress': {
          if (newResults && newResults.length > 0) {
            console.log("Progress update with results:", newResults);
            setResults(newResults);
            addLog(`Received ${newResults.length} benchmark results`);
          }

          if (message) {
            setStatusMessage(message);
            addLog(message);
          }

          // Update completed tests
          if (newResults) {
            const completedOps = new Set<string>();
            newResults.forEach((r: BenchmarkResult) => {
              if (typeof r.name === 'string') {
                completedOps.add(r.name);
              }
            });
            setCompletedTests(completedOps);
          }
          break;
        }
        case 'complete': {
          if (newResults && newResults.length > 0) {
            console.log("Complete with results:", newResults);
            setResults(newResults);
            addLog(`Final benchmark results: ${newResults.length} total results`);
          } else {
            addLog("Received complete message but no results were present");
          }

          setLoading(false);
          setStatusMessage(message || "All benchmarks completed successfully");
          addLog(message || "Benchmarks completed");
          break;
        }
        case 'error': {
          console.error('Benchmark error:', error, stack);
          setLoading(false);
          setStatusMessage(`Error: ${error}`);
          addLog(`Error: ${error}`);
          if (stack) {
            addLog(`Stack: ${stack}`);
          }
          break;
        }
      }
    }

    setWorker(newWorker)

    return () => {
      newWorker.terminate()
    }
  }, [])

  const runBenchmarks = () => {
    if (!worker) return;
    setLoading(true);
    setResults([]);
    setCompletedTests(new Set());
    setStatusMessage("Starting benchmarks...");
    setLogs([]);
    addLog("Starting benchmark process");
    worker.postMessage('start');
  }

  const getChartData = () => {
    console.log("Getting chart data from results:", results);
    if (results.length === 0) {
      console.warn("No results available to create chart data");
      return [];
    }

    const operations = Array.from(new Set(results.map(r => r.name)));
    console.log("Operations for chart:", operations);

    return operations.map(operation => {
      const operationResults = results.filter(r => r.name === operation);
      console.log(`Data for ${operation}:`, operationResults);

      const data = {
        name: operation,
        ...operationResults.reduce((acc, curr) => ({
          ...acc,
          [curr.library]: Math.round(curr.opsPerSecond)
        }), {})
      };

      console.log(`Chart data for ${operation}:`, data);
      return data;
    });
  }

  // Function to create the per-operation data for individual charts
  const getLibraryData = (operation: string) => {
    return results
      .filter(r => r.name === operation)
      .map(r => ({
        library: r.library,
        opsPerSecond: Math.round(r.opsPerSecond),
        code: r.code,
        executionTime: Math.round(r.executionTime)
      }));
  }

  // Show code dialog
  const showCode = (title: string, code: string) => {
    setSelectedCode({
      title,
      code
    });
    setCodeDialogOpen(true);
  };

  return (
    <div className="min-h-screen app-background py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            CRDT Library Benchmarks
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8 opacity-90">
            Compare performance between Yjs, Automerge, and Loro CRDT implementations
          </p>

          <Button
            onClick={runBenchmarks}
            disabled={loading}
            size="lg"
            className="w-56 h-14 bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl border border-gray-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Benchmarks...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Run Benchmarks
              </>
            )}
          </Button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-8 text-center">
            <Badge
              variant="outline"
              className={`text-xl py-2 px-4 ${loading ? "bg-black/50 text-white border-gray-500" : "bg-black/50 text-white border-gray-400"}`}
            >
              {statusMessage}
            </Badge>
          </div>
        )}

        {/* Test Status Indicators */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-center mb-8 text-white">Benchmark Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {BENCHMARK_OPERATIONS.map((operation) => (
              <Card
                key={operation}
                className={
                  completedTests.has(operation)
                    ? "card-completed"
                    : loading && !completedTests.has(operation)
                      ? "card-pending"
                      : "card-gradient"
                }
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="font-medium text-white">{operation}</span>
                  {completedTests.has(operation) ? (
                    <Badge variant="outline" className="bg-black/50 text-white border-gray-400 flex items-center gap-1 px-3 py-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Complete</span>
                    </Badge>
                  ) : loading ? (
                    <Badge variant="outline" className="bg-black/50 text-white border-gray-500 flex items-center gap-1 px-3 py-1">
                      <Clock className="h-3.5 w-3.5 animate-pulse" />
                      <span>Pending</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-black/50 text-gray-300 border-gray-700 flex items-center gap-1 px-3 py-1">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Not Started</span>
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Logs Panel */}
        <div className="mb-12">
          <Card className="card-gradient border-0">
            <CardHeader className="px-6 pb-2">
              <CardTitle className="text-xl text-white flex items-center">
                <span className="flex-1">Benchmark Logs</span>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-300" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-black/80 rounded-lg p-4 h-40 overflow-y-auto font-mono text-sm text-gray-300">
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic">No logs yet. Run benchmarks to see output.</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="leading-relaxed">{log}</div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section - Show when we have results */}
        {results.length > 0 && (
          <div className="space-y-12">
            <Card className="card-gradient overflow-hidden p-6 border-0">
              <CardHeader className="px-0 pb-6">
                <CardTitle className="text-center text-2xl text-white">
                  Operations per Second - All Libraries
                </CardTitle>
              </CardHeader>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="name"
                      stroke="#ccc"
                      tick={{ fill: '#ccc', fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#ccc"
                      tick={{ fill: '#ccc', fontSize: 12 }}
                      label={{ value: 'Operations per second (higher is better)', angle: -90, position: 'insideLeft', fill: '#ccc', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Yjs" fill={LIBRARY_COLORS.Yjs} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Automerge" fill={LIBRARY_COLORS.Automerge} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Loro" fill={LIBRARY_COLORS.Loro} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Array.from(new Set(results.map(r => r.name))).map(operation => (
                <Card key={operation} className="card-gradient overflow-hidden p-6 border-0">
                  <CardHeader className="px-0 pb-6">
                    <CardTitle className="text-center text-xl text-white">
                      {operation}
                    </CardTitle>
                  </CardHeader>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <BarChart data={getLibraryData(operation)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                          dataKey="library"
                          stroke="#ccc"
                          tick={{ fill: '#ccc', fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#ccc"
                          tick={{ fill: '#ccc', fontSize: 12 }}
                          label={{ value: 'Operations per second (higher is better)', angle: -90, position: 'insideLeft', fill: '#ccc', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                            color: '#fff'
                          }}
                          formatter={(value) => {
                            return [`${value} ops/sec`, 'Operations per Second'];
                          }}
                        />
                        <Bar
                          dataKey="opsPerSecond"
                          radius={[6, 6, 0, 0]}
                          name="Operations per Second"
                          fill="#333333"
                        >
                          {getLibraryData(operation).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={LIBRARY_COLORS[entry.library] || LIBRARY_COLORS.Yjs}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Library code buttons */}
                  <CardFooter className="flex flex-wrap gap-2 mt-4 justify-center">
                    {getLibraryData(operation).map(entry => (
                      <Button
                        key={entry.library}
                        variant="outline"
                        className="flex items-center gap-2 border-gray-600 hover:bg-black/40"
                        onClick={() => showCode(`${entry.library} - ${operation}`, entry.code)}
                      >
                        <Code className="h-4 w-4" />
                        <span>View {entry.library} Code</span>
                      </Button>
                    ))}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Code Viewing Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent className="max-w-3xl bg-black border border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedCode.title}</span>
                <DialogClose asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-gray-900 p-4 rounded-md">
              <pre className="font-mono text-sm overflow-x-auto">
                <code className="text-gray-300 whitespace-pre">{selectedCode.code}</code>
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App
