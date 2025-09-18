import React from 'react'
import { useQuery, useAction } from '@wasp/queries'
import listConnectionsQuery from '@wasp/queries/listConnections'
import deactivateConnectionAction from '@wasp/actions/deactivateConnection'

export default function EnhancedConnectionManager() {
  const { data, isFetching, error } = useQuery(listConnectionsQuery)
  const deactivate = useAction(deactivateConnectionAction)

  if (error) return <div className="text-red-500">{String(error)}</div>

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-3 text-[#39FF14]">Your connections</h3>
      {isFetching && <div className="text-sm text-neutral-400">Loading…</div>}
      <div className="grid gap-3">
        {data?.map((c: any) => (
          <div key={c.id} className="border border-neutral-700 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{c.name} <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 ml-2">{c.type}</span></div>
              <div className="text-xs text-neutral-400">Scope: {c.scope}</div>
              <div className="text-[11px] text-neutral-500">Created {new Date(c.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${c.active ? 'bg-[#39FF14] text-black' : 'bg-neutral-800 text-neutral-300'}`}>{c.active ? 'Active' : 'Inactive'}</span>
              {c.active && (
                <button onClick={() => deactivate({ id: c.id })}
                        className="px-3 py-1 border border-neutral-700 rounded-lg hover:bg-neutral-900">
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
