import React, { useState } from 'react'
import { useQuery, useAction } from '@wasp/queries'
import listConnectionsQuery from '@wasp/queries/listConnections'
import runOpenOpsAgentAction from '@wasp/actions/runOpenOpsAgent'

export default function OpenOpsAgentTest() {
  const { data: connections, isLoading, error } = useQuery(listConnectionsQuery)
  const runOpenOpsAgent = useAction(runOpenOpsAgentAction)
  
  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [flowId, setFlowId] = useState('test-flow')
  const [params, setParams] = useState('{"message": "Hello from CrapGPT!"}')
  const [result, setResult] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [executionError, setExecutionError] = useState('')

  // Filter for OpenOps connections only
  const openopsConnections = (connections || []).filter((c: any) => 
    c.type === 'openops' && c.active
  )

  const handleExecute = async () => {
    if (!selectedConnectionId) {
      setExecutionError('Please select an OpenOps connection')
      return
    }

    setExecuting(true)
    setExecutionError('')
    setResult(null)

    try {
      let parsedParams = {}
      if (params.trim()) {
        try {
          parsedParams = JSON.parse(params)
        } catch (e) {
          throw new Error('Invalid JSON in params field')
        }
      }

      const response = await runOpenOpsAgent({
        flowId: flowId.trim() || 'test-flow',
        params: parsedParams,
        connectionId: selectedConnectionId
      })

      setResult(response)
    } catch (error: any) {
      setExecutionError(error.message || 'Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  if (error) {
    return (
      <div className="p-4 border border-red-400 rounded-lg bg-red-950/20">
        <div className="text-red-400 font-semibold">Connection Error</div>
        <div className="text-red-200 text-sm">{String(error)}</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border border-[#39FF14] rounded-lg p-6 bg-black">
        <h2 className="text-xl font-bold text-[#39FF14] mb-4">🚀 OpenOps Agent Test</h2>
        <p className="text-neutral-300 text-sm mb-6">
          Test your connection-aware OpenOps agent. This demonstrates how agents can securely 
          use saved connections to execute workflows on external providers.
        </p>

        {isLoading ? (
          <div className="text-neutral-400">Loading connections...</div>
        ) : openopsConnections.length === 0 ? (
          <div className="p-4 border border-yellow-400/30 rounded-lg bg-yellow-950/20">
            <div className="text-yellow-400 font-semibold">No OpenOps Connections</div>
            <div className="text-yellow-200 text-sm mt-1">
              You need to create an OpenOps connection first.{' '}
              <a href="/connections" target="_blank" className="underline hover:text-yellow-100">
                Create one here
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                OpenOps Connection
              </label>
              <select 
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-[#39FF14] outline-none"
              >
                <option value="">Select a connection...</option>
                {openopsConnections.map((conn: any) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} • {conn.scope}
                  </option>
                ))}
              </select>
            </div>

            {/* Flow ID */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Flow ID
              </label>
              <input 
                type="text"
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                placeholder="test-flow"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-[#39FF14] outline-none"
              />
            </div>

            {/* Parameters */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Parameters (JSON)
              </label>
              <textarea 
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder='{"message": "Hello from CrapGPT!"}'
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-[#39FF14] outline-none font-mono text-sm"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={executing || !selectedConnectionId}
              className="w-full px-4 py-3 bg-[#39FF14] text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#32DD10] transition-colors"
            >
              {executing ? 'Executing OpenOps Flow...' : 'Execute Flow'}
            </button>

            {/* Error Display */}
            {executionError && (
              <div className="p-4 border border-red-400 rounded-lg bg-red-950/20">
                <div className="text-red-400 font-semibold">Execution Error</div>
                <div className="text-red-200 text-sm mt-1">{executionError}</div>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="p-4 border border-[#39FF14] rounded-lg bg-neutral-950">
                <div className="text-[#39FF14] font-semibold mb-2">✅ Execution Successful</div>
                <div className="space-y-2 text-sm">
                  <div className="text-neutral-300">
                    <span className="text-neutral-400">Run ID:</span> {result.runId}
                  </div>
                  <div className="text-neutral-300">
                    <span className="text-neutral-400">Connection Used:</span> {result.connectionUsed}
                  </div>
                  <div className="text-neutral-300">
                    <span className="text-neutral-400">Executed At:</span> {result.executedAt}
                  </div>
                  <div>
                    <div className="text-neutral-400 mb-1">Response Data:</div>
                    <pre className="bg-neutral-900 p-3 rounded border border-neutral-700 text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="text-xs text-neutral-500">
          🔒 All credentials are stored securely server-side. No API keys are exposed to the browser.
        </div>
      </div>
    </div>
  )
}