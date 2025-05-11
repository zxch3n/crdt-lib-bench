import { useState, useEffect } from 'react'
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
import { CheckCircle } from 'lucide-react'
import type { BenchmarkResult } from './benchmarks/crdtBenchmarks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  'Yjs': '#3f51b5',
  'Automerge': '#7986cb',
  'Loro': '#e91e63'
}

function App() {
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newWorker = new Worker(new URL('./benchmarks/benchmarkWorker.ts', import.meta.url), {
      type: 'module'
    })

    newWorker.onmessage = (e) => {
      const { type, results: newResults, error } = e.data

      switch (type) {
        case 'progress': {
          setResults(newResults)
          // Update completed tests
          const completedOps = new Set(newResults.map((r: BenchmarkResult) => r.name))
          setCompletedTests(completedOps as Set<string>)
          break
        }
        case 'complete': {
          setResults(newResults)
          setLoading(false)
          break
        }
        case 'error': {
          console.error('Benchmark error:', error)
          setLoading(false)
          break
        }
      }
    }

    setWorker(newWorker)

    return () => {
      newWorker.terminate()
    }
  }, [])

  const runBenchmarks = () => {
    if (!worker) return
    setLoading(true)
    setResults([])
    setCompletedTests(new Set())
    worker.postMessage('start')
  }

  const getChartData = () => {
    const operations = Array.from(new Set(results.map(r => r.name)))
    return operations.map(operation => {
      const operationResults = results.filter(r => r.name === operation)
      return {
        name: operation,
        ...operationResults.reduce((acc, curr) => ({
          ...acc,
          [curr.library]: Math.round(curr.opsPerSecond)
        }), {})
      }
    })
  }

  // Function to create the per-operation data for individual charts
  const getLibraryData = (operation: string) => {
    return results
      .filter(r => r.name === operation)
      .map(r => ({
        library: r.library,
        opsPerSecond: Math.round(r.opsPerSecond)
      }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            CRDT Library Benchmarks
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            Compare performance between Yjs, Automerge, and Loro CRDT implementations
          </p>

          <Button
            onClick={runBenchmarks}
            disabled={loading}
            size="lg"
            className="w-48"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              'Run Benchmarks'
            )}
          </Button>
        </div>

        {/* Test Status Indicators */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-center mb-6">Benchmark Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {BENCHMARK_OPERATIONS.map((operation) => (
              <Card
                key={operation}
                className={`transition-all duration-300 ${completedTests.has(operation)
                  ? 'bg-gradient-to-r from-green-900 to-emerald-800 border-green-700'
                  : loading && !completedTests.has(operation)
                    ? 'bg-slate-800 border-slate-700 animate-pulse'
                    : 'bg-slate-800 border-slate-700'
                  }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium">{operation}</span>
                  {completedTests.has(operation) ? (
                    <Badge variant="success" className="flex items-center">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      <span>Complete</span>
                    </Badge>
                  ) : loading ? (
                    <Badge variant="ghost" className="bg-opacity-50">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant="ghost">
                      Not Started
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-12">
            <Card className="bg-slate-900 border-slate-800 p-6 shadow-lg">
              <CardHeader className="px-0 pb-6">
                <CardTitle className="text-center text-2xl">
                  Operations per Second - All Libraries
                </CardTitle>
              </CardHeader>
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Yjs" fill={LIBRARY_COLORS.Yjs} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Automerge" fill={LIBRARY_COLORS.Automerge} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Loro" fill={LIBRARY_COLORS.Loro} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Array.from(new Set(results.map(r => r.name))).map(operation => (
                <Card key={operation} className="bg-slate-900 border-slate-800 p-6 shadow-lg">
                  <CardHeader className="px-0 pb-6">
                    <CardTitle className="text-center text-xl">
                      {operation}
                    </CardTitle>
                  </CardHeader>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <BarChart data={getLibraryData(operation)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="library" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Bar
                          dataKey="opsPerSecond"
                          radius={[4, 4, 0, 0]}
                          name="Operations per Second"
                          fill="#3f51b5"
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
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
