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
import { CheckCircle, Clock, XCircle, Loader2, RefreshCw, Code, Copy, Check, HelpCircle } from 'lucide-react'
import type { BenchmarkResult } from './benchmarks/simpleBench'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { BENCHMARK_CONFIG, BENCHMARK_GROUPS, CODE_SNIPPETS } from './benchmarks/crdtBenchmarks'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Colors for different libraries
const LIBRARY_COLORS: Record<string, string> = {
  'Yjs': '#CCC',     // Changed to white for high contrast
  'Automerge': '#888', // Changed to light gray
  'Loro': '#555555'    // Changed to darker gray
}

// Operation size options
const OP_SIZE_OPTIONS = [32, 128, 512, 2048, 16384, 65536];

function App() {
  const [results, setResults] = useState<BenchmarkResult[]>([])
  console.log({ results })
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set())
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<{ title: string, code: string }>({ title: '', code: '' })
  const [opSize, setOpSize] = useState<number>(BENCHMARK_CONFIG.OP_SIZE)
  const [showDuration, setShowDuration] = useState<boolean>(false)
  const [copying, setCopying] = useState(false)
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
    setStatusMessage(`Starting benchmarks with ${opSize} operations per iteration...`);
    setLogs([]);
    addLog(`Starting benchmark process with operation size: ${opSize}`);
    worker.postMessage({
      type: 'start',
      opSize
    });
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
        ...operationResults.reduce((acc, curr) => {
          if (showDuration) {
            // When showing duration, calculate ms per iteration
            const msPerIteration = curr.executionTime;
            return {
              ...acc,
              [curr.library]: Math.round(msPerIteration * 1000) / 1000 // Round to 3 decimal places
            };
          } else {
            return {
              ...acc,
              [curr.library]: Math.round(curr.iterPerSecond)
            };
          }
        }, {})
      };

      console.log(`Chart data for ${operation}:`, data);
      return data;
    });
  }

  // Function to create the per-operation data for individual charts
  const getLibraryData = (operation: string) => {
    return results
      .filter(r => r.name === operation)
      .map(r => {
        if (showDuration) {
          // Calculate ms per iteration
          const msPerIteration = r.executionTime / r.iteration;
          return {
            library: r.library,
            value: Math.round(msPerIteration * 1000) / 1000, // Round to 3 decimal places
            code: r.code,
            executionTime: Math.round(r.executionTime)
          };
        } else {
          return {
            library: r.library,
            value: Math.round(r.iterPerSecond),
            code: r.code,
            executionTime: Math.round(r.executionTime)
          };
        }
      });
  }

  // Show code dialog
  const showCode = (title: string, code: string) => {
    setSelectedCode({
      title,
      code
    });
    setCodeDialogOpen(true);
  };

  // Copy code to clipboard
  const copyCode = async () => {
    if (selectedCode.code) {
      await navigator.clipboard.writeText(selectedCode.code);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  // Get Y-axis label based on display mode
  const getYAxisLabel = () => {
    if (showDuration) {
      return 'MS per iteration (lower is better)';
    } else {
      return 'Iterations/sec (higher is better)';
    }
  };

  // Get tooltip label based on display mode
  const getTooltipFormatter = (value: number | string) => {
    if (showDuration) {
      return [`${value} ms/iter`, 'MS per iteration'];
    } else {
      return [`${value} iter/sec`, 'Iterations per Second'];
    }
  };

  // Apply custom styling
  useEffect(() => {
    // Create style element for custom code styles
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      /* Custom styles for syntax highlighting */
      .syntax-highlighter {
        border-radius: 0.25rem !important;
        margin: 0 !important;
        padding-right: 4rem !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        font-size: 0.9em !important;
        background: transparent !important;
      }
      
      /* Force scrollbar to be visible on Windows */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen app-background py-6 sm:py-12">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-3 sm:mb-4 text-white">
            CRDT Libraries Benchmarks
          </h1>
          <p className="text-base sm:text-lg text-white max-w-2xl mx-auto mb-6 sm:mb-8 opacity-90">
            Compare performance between Yjs, Automerge, and Loro CRDT implementations
          </p>

          {/* Operation Size Selector */}
          <Card className="max-w-xl p-2 mx-auto mb-6 sm:mb-8 card-gradient">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
              <CardTitle className="flex items-center text-white">
                <span>Operations Size</span>
                <TooltipProvider delayDuration={100}>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 ml-2 rounded-full">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs p-2 bg-black text-white border border-white/20">
                      <p>
                        Controls how many operations each CRDT library performs in a single benchmark iteration.
                        Higher values will test performance with larger data structures.
                      </p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription className="text-white/60">
                Current: {opSize} operations
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
              <div className="pb-3 pt-1 sm:pt-2">
                <Slider
                  defaultValue={[OP_SIZE_OPTIONS.findIndex(size => size === opSize)]}
                  min={0}
                  max={OP_SIZE_OPTIONS.length - 1}
                  step={1}
                  onValueChange={(val: number[]) => {
                    setOpSize(OP_SIZE_OPTIONS[val[0]]);
                  }}
                  disabled={loading}
                  className='mb-3'
                />
                <div className="relative h-6 mt-1">
                  {OP_SIZE_OPTIONS.map((size, i) => {
                    // Calculate percentage position
                    const position = i / (OP_SIZE_OPTIONS.length - 1) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute text-xs text-white/60 transform -translate-x-1/2"
                        style={{
                          left: `${position}%`,
                          width: 'max-content'
                        }}
                      >
                        {size}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={runBenchmarks}
            disabled={loading}
            size="lg"
            className="w-56 h-14 bg-black hover:bg-white hover:text-black text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl border border-white/20"
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

        {/* Status Message - Display only when needed */}
        {statusMessage && (
          <div className="mb-8 text-center">
            <Badge
              variant="outline"
              className="text-xl py-2 px-4 bg-black/50 text-white border-white/20"
            >
              {statusMessage}
            </Badge>
          </div>
        )}

        {/* Test Status Indicators */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-8 text-white">Benchmark Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
            {BENCHMARK_GROUPS.map((operation) => {
              // Determine styling based on status
              const isComplete = completedTests.has(operation);
              const isPending = loading && !completedTests.has(operation);

              let bgClass = "bg-black";
              let statusIcon = <XCircle className="h-5 w-5 text-white/40" />;
              let statusText = "Not Started";
              let statusClass = "text-white/40";
              let borderClass = "border-white/10";
              let shadowEffect = "";

              if (isComplete) {
                bgClass = "bg-black";
                statusIcon = <CheckCircle className="h-5 w-5 text-white" />;
                statusText = "Complete";
                statusClass = "text-white";
                borderClass = "border-white/20";
                shadowEffect = "shadow-md";
              } else if (isPending) {
                bgClass = "bg-black";
                statusIcon = <Clock className="h-5 w-5 text-white/80 animate-pulse" />;
                statusText = "Pending";
                statusClass = "text-white/80";
                borderClass = "border-white/15";
                shadowEffect = "shadow-sm";
              }

              return (
                <div
                  key={operation}
                  className={`relative rounded-xl border ${borderClass} ${bgClass} ${shadowEffect} overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
                >
                  <div className="relative p-4 sm:p-5">
                    <div className="flex flex-col h-full">
                      <h3 className="font-bold text-base sm:text-lg text-white mb-2">{operation}</h3>
                      <div className={`flex items-center gap-1.5 ${statusClass} text-sm font-medium mb-3`}>
                        {statusIcon}
                        <span>{statusText}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Yjs', 'Automerge', 'Loro'].map(lib => {
                          const codeKey = `${lib} - ${operation}` as keyof typeof CODE_SNIPPETS;
                          // Only show libraries that have the operation
                          if (CODE_SNIPPETS[codeKey]) {
                            return (
                              <Badge
                                key={lib}
                                variant="outline"
                                className="bg-black hover:bg-white/10 hover:scale-105 transform transition-all cursor-pointer border-white/20 hover:border-white/40 flex items-center gap-1.5"
                                onClick={() => showCode(codeKey, CODE_SNIPPETS[codeKey].code)}
                              >
                                {lib}
                                <Code className="h-3 w-3 opacity-70" />
                              </Badge>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results Section - Show when we have results */}
        {results.length > 0 && (
          <div className="space-y-6 sm:space-y-12">
            {/* Display Mode Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Label htmlFor="metric-toggle" className={`text-sm ${!showDuration ? 'text-white font-medium' : 'text-white/40'}`}>
                Iterations per Second
              </Label>
              <Switch
                id="metric-toggle"
                checked={showDuration}
                onCheckedChange={setShowDuration}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-black border-white/30"
              />
              <Label htmlFor="metric-toggle" className={`text-sm ${showDuration ? 'text-white font-medium' : 'text-white/40'}`}>
                MS per Iteration
              </Label>
            </div>

            <Card className="card-gradient overflow-hidden p-3 sm:p-6 border-0">
              <CardHeader className="px-0 pb-2 sm:pb-6">
                <CardTitle className="text-center text-xl sm:text-2xl text-white">
                  {showDuration ? 'MS per Iteration - All Libraries' : 'Iterations per Second - All Libraries'}
                </CardTitle>
                <CardDescription className="text-center text-white/60">
                  Each iteration performs {opSize} operations
                </CardDescription>
              </CardHeader>
              <div className="h-[300px] sm:h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart
                    data={getChartData()}
                    margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="name"
                      stroke="#fff"
                      tick={{ fill: '#fff', fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#fff"
                      tick={{ fill: '#fff', fontSize: 12 }}
                      label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft', fill: '#fff', fontSize: 11, dx: 12, dy: 50 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid #ffffff40',
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {Array.from(new Set(results.map(r => r.name))).map(operation => (
                <Card key={operation} className="card-gradient overflow-hidden p-3 sm:p-6 border-0">
                  <CardHeader className="px-0 pb-2 sm:pb-6">
                    <CardTitle className="text-center text-lg sm:text-xl text-white">
                      {operation}
                    </CardTitle>
                    <CardDescription className="text-center text-white/60">
                      Each iteration performs {opSize} operations
                    </CardDescription>
                  </CardHeader>
                  <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer>
                      <BarChart
                        data={getLibraryData(operation)}
                        margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                          dataKey="library"
                          stroke="#fff"
                          tick={{ fill: '#fff', fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#fff"
                          tick={{ fill: '#fff', fontSize: 12 }}
                          label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft', fill: '#fff', fontSize: 11, dx: 12, dy: 50 }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid #ffffff40',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                            color: '#fff'
                          }}
                          formatter={(value: number | string) => getTooltipFormatter(value)}
                        />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          name={showDuration ? "MS per Iteration" : "Iterations per Second"}
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
                  <CardFooter className="flex flex-wrap gap-2 mt-2 sm:mt-4 justify-center">
                    {getLibraryData(operation).map(entry => (
                      <Button
                        key={entry.library}
                        variant="outline"
                        className="flex items-center gap-1 sm:gap-2 border-white/20 hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => showCode(`${entry.library} - ${operation}`, entry.code)}
                      >
                        <Code className="h-3 w-3 sm:h-4 sm:w-4" />
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
          <DialogContent className="max-w-3xl bg-black border border-white/20 text-white">
            <DialogHeader className="pb-3">
              <DialogTitle className="mb-0">
                <span className="text-lg font-medium">{selectedCode.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-black p-4 rounded-md overflow-hidden relative border border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-3 right-3 h-7 px-2 rounded-md hover:bg-white/10 border-white/20 flex items-center gap-1.5 bg-black/90 backdrop-blur-sm z-10 shadow-md opacity-70 hover:opacity-100 transition-opacity"
                onClick={copyCode}
              >
                {copying ? (
                  <>
                    <Check className="h-3 w-3 text-white" />
                    <span className="text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
              <div className="overflow-x-auto max-h-[70vh]">
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{ background: 'transparent' }}
                  className="syntax-highlighter"
                  showLineNumbers={false}
                  wrapLongLines={false}
                >
                  {selectedCode.code}
                </SyntaxHighlighter>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Logs Reference (invisible but used for scrolling) */}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

export default App
