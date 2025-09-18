import HttpError from '@wasp/core/HttpError.js'
import { createClient } from '@supabase/supabase-js'

// service client for server actions
const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

type ProviderType = 'openops' | 'arcade' | 'hexstrike' | 'mcpjungle' | 'toolhive' | 'custom'

// Helpers
async function assertAuthed(ctx: any) {
  if (!ctx.user) throw new HttpError(401, 'Not signed in')
}

/**
 * Basic provider sanity checks.
 * Only pings public health endpoints or makes a harmless authenticated call.
 * Do not store secrets in Session or return them to the client.
 */
export async function testProviderConnectivity(args: {
  type: ProviderType
  config: Record<string, any>
}, ctx: any) {
  await assertAuthed(ctx)

  const { type, config } = args
  try {
    if (type === 'openops') {
      if (!config.apiUrl || !config.apiKey) throw new Error('Missing apiUrl or apiKey')
      const res = await fetch(`${config.apiUrl}/health`, {
        headers: { authorization: `Bearer ${config.apiKey}` }
      })
      if (!res.ok) throw new Error(`OpenOps health failed ${res.status}`)
      return { ok: true, details: 'OpenOps reachable' }
    }

    if (type === 'arcade') {
      if (!config.apiKey) throw new Error('Missing apiKey')
      // sample harmless call path, replace with your real endpoint
      const res = await fetch('https://api.arcade.software/ping', {
        headers: { authorization: config.apiKey }
      })
      if (!res.ok) throw new Error(`Arcade ping failed ${res.status}`)
      return { ok: true, details: 'Arcade reachable' }
    }

    if (type === 'mcpjungle') {
      if (!config.url) throw new Error('Missing url')
      const res = await fetch(`${config.url.replace(/\/$/, '')}/health`, {
        headers: config.token ? { authorization: `Bearer ${config.token}` } : {}
      })
      if (!res.ok) throw new Error(`MCPJungle health failed ${res.status}`)
      return { ok: true, details: 'MCPJungle reachable' }
    }

    if (type === 'hexstrike') {
      // we do not run tools here, only sanity check the MCP endpoint is up
      const serverUrl = config.serverUrl || (config.mcp && config.mcp.serverUrl)
      if (!serverUrl) throw new Error('Missing serverUrl')
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/health`).catch(() => null)
      if (!res || !res.ok) throw new Error('HexStrike MCP not reachable')
      return { ok: true, details: 'HexStrike MCP reachable' }
    }

    if (type === 'toolhive') {
      if (!config.registryUrl) throw new Error('Missing registryUrl')
      const res = await fetch(`${config.registryUrl.replace(/\/$/, '')}/health`).catch(() => null)
      if (!res || !res.ok) throw new Error('ToolHive registry not reachable')
      return { ok: true, details: 'ToolHive reachable' }
    }

    if (type === 'custom') {
      if (!config.testUrl) throw new Error('Missing testUrl')
      const res = await fetch(config.testUrl).catch(() => null)
      if (!res || !res.ok) throw new Error('Custom endpoint not reachable')
      return { ok: true, details: 'Custom endpoint reachable' }
    }

    throw new Error('Unknown provider type')
  } catch (e: any) {
    return { ok: false, details: e.message || 'Connectivity failed' }
  }
}

export async function createConnection(args: {
  type: ProviderType
  name: string
  scope: 'read-only' | 'change-safe' | 'admin'
  // config may contain secrets; store only on server side
  config: Record<string, any>
}, ctx: any) {
  await assertAuthed(ctx)
  const userId = ctx.user.id

  // final connectivity check before save
  const check = await testProviderConnectivity({ type: args.type, config: args.config }, ctx)
  if (!check.ok) throw new HttpError(400, `Connectivity check failed: ${check.details}`)

  // store config JSON as is. If you prefer, encrypt here first.
  const { data, error } = await sb
    .from('crapgpt_connections')
    .insert({
      user_id: userId,
      type: args.type,
      name: args.name || `${args.type} connection`,
      scope: args.scope,
      config: args.config,
      active: true
    })
    .select('*')
    .single()

  if (error) throw new HttpError(500, error.message)
  // never return secrets but returning full row is fine if config only lives server side
  return { id: data.id, type: data.type, name: data.name, scope: data.scope, active: data.active }
}

export async function listConnections(_args: {}, ctx: any) {
  await assertAuthed(ctx)
  const { data, error } = await sb
    .from('crapgpt_connections')
    .select('id, type, name, scope, active, created_at, updated_at')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
  if (error) throw new HttpError(500, error.message)
  return data
}

export async function deactivateConnection(args: { id: string }, ctx: any) {
  await assertAuthed(ctx)
  const { error } = await sb
    .from('crapgpt_connections')
    .update({ active: false })
    .eq('id', args.id)
    .eq('user_id', ctx.user.id)
  if (error) throw new HttpError(500, error.message)
  return { ok: true }
}