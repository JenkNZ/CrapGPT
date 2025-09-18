import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function getConnectionById(userId: string, connectionId?: string) {
  if (!connectionId) return null
  
  const { data, error } = await sb
    .from('crapgpt_connections')
    .select('id, type, scope, config, active')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single()
    
  if (error) throw new Error(error.message)
  if (!data?.active) throw new Error('Connection is inactive')
  
  return data as { 
    id: string; 
    type: string; 
    scope: string; 
    config: any; 
    active: boolean 
  }
}

export async function getUserConnectionsByType(userId: string, connectionType: string) {
  const { data, error } = await sb
    .from('crapgpt_connections')
    .select('id, name, type, scope, active')
    .eq('user_id', userId)
    .eq('type', connectionType)
    .eq('active', true)
    .order('created_at', { ascending: false })
    
  if (error) throw new Error(error.message)
  return data
}

export async function validateConnectionScope(connection: any, requiredScope: string) {
  const scopeHierarchy = ['read-only', 'change-safe', 'admin']
  const currentLevel = scopeHierarchy.indexOf(connection.scope)
  const requiredLevel = scopeHierarchy.indexOf(requiredScope)
  
  if (currentLevel === -1 || requiredLevel === -1) {
    throw new Error('Invalid scope configuration')
  }
  
  if (currentLevel < requiredLevel) {
    throw new Error(`Connection scope '${connection.scope}' insufficient for required '${requiredScope}'`)
  }
  
  return true
}

// Helper to safely use connection configs without leaking secrets to logs
export function createConnectionClient(connection: any, operation: string) {
  switch (connection.type) {
    case 'openops':
      return {
        baseURL: connection.config.apiUrl,
        headers: {
          'authorization': `Bearer ${connection.config.apiKey}`,
          'content-type': 'application/json'
        },
        defaultAccount: connection.config.defaultAccount
      }
      
    case 'arcade':
      return {
        headers: {
          'authorization': connection.config.apiKey,
          'content-type': 'application/json'
        },
        project: connection.config.project,
        region: connection.config.region
      }
      
    case 'mcpjungle':
      return {
        baseURL: connection.config.url.replace(/\/$/, ''),
        headers: connection.config.token ? {
          'authorization': `Bearer ${connection.config.token}`,
          'content-type': 'application/json'
        } : {
          'content-type': 'application/json'
        }
      }
      
    case 'hexstrike':
      return {
        serverUrl: connection.config.serverUrl,
        toolWhitelist: connection.config.toolWhitelist || [],
        timeoutSec: connection.config.timeoutSec || 300
      }
      
    case 'toolhive':
      return {
        registryUrl: connection.config.registryUrl.replace(/\/$/, ''),
        namespace: connection.config.namespace
      }
      
    case 'custom':
      return {
        testUrl: connection.config.testUrl
      }
      
    default:
      throw new Error(`Unsupported connection type: ${connection.type}`)
  }
}