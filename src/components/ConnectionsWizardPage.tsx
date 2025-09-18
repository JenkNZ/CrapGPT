// ConnectionsWizardPage.tsx - Wasp page component for managing connections
// Tests connections before saving and integrates with Supabase

import React, { useState, useEffect } from 'react'
import { useAuth } from '@wasp-lang/auth/client'
import { 
  getUserConnections, 
  createConnection, 
  deleteConnection,
  testConnection
} from '@wasp-lang/actions'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { 
  Plus, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  Settings,
  Globe,
  Shield
} from 'lucide-react'

// Provider configurations
const PROVIDER_TYPES = {
  'openops': {
    name: 'OpenOps',
    description: 'Infrastructure automation and workflow orchestration',
    icon: <Settings className="h-5 w-5 text-blue-400" />,
    fields: [
      { name: 'apiUrl', label: 'API URL', type: 'url', placeholder: 'https://api.openops.com' },
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter your OpenOps API key' }
    ],
    scopes: ['read', 'execute', 'admin']
  },
  'arcade': {
    name: 'Arcade',
    description: 'Secure compute and sandboxed execution',
    icon: <Zap className="h-5 w-5 text-purple-400" />,
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter your Arcade API key' },
      { name: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'] }
    ],
    scopes: ['compute', 'sandbox', 'admin']
  },
  'hexstrike': {
    name: 'HexStrike',
    description: 'Security testing and penetration tools',
    icon: <Shield className="h-5 w-5 text-red-400" />,
    fields: [
      { name: 'serverUrl', label: 'Server URL', type: 'url', placeholder: 'http://localhost:8888' },
      { name: 'clientToken', label: 'Client Token', type: 'password', placeholder: 'Enter client token' }
    ],
    scopes: ['scan', 'exploit', 'report']
  },
  'mcpjungle': {
    name: 'MCP Jungle',
    description: 'Model Context Protocol server',
    icon: <Globe className="h-5 w-5 text-green-400" />,
    fields: [
      { name: 'serverUrl', label: 'Server URL', type: 'url', placeholder: 'http://localhost:7000' },
      { name: 'clientToken', label: 'Client Token', type: 'password', placeholder: 'Optional client token' }
    ],
    scopes: ['read', 'write', 'admin']
  }
}

interface Connection {
  id: string
  type: string
  name: string
  scope: string
  active: boolean
  created_at: string
}

export function ConnectionsWizardPage() {
  const { data: user } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    scope: 'read',
    config: {}
  })
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      setLoading(true)
      if (user) {
        const userConnections = await getUserConnections({ userId: user.id })
        setConnections(userConnections || [])
      }
    } catch (err) {
      setError(`Failed to load connections: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConnection = async () => {
    if (!formData.type || !formData.name) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setError('')
      setSuccess('')
      
      // Test the connection first
      const testResult = await testConnection({
        type: formData.type,
        config: formData.config
      })

      if (!testResult.success) {
        setError(`Connection test failed: ${testResult.error}`)
        return
      }

      // Create the connection
      await createConnection({
        type: formData.type,
        name: formData.name,
        scope: JSON.stringify([formData.scope]),
        config: JSON.stringify(formData.config)
      })

      setSuccess('Connection created successfully!')
      setShowCreateForm(false)
      setFormData({ type: '', name: '', scope: 'read', config: {} })
      loadConnections()
    } catch (err) {
      setError(`Failed to create connection: ${err.message}`)
    }
  }

  const handleTestConnection = async (connection: Connection) => {
    try {
      setTesting(prev => ({ ...prev, [connection.id]: true }))
      setTestResults(prev => ({ ...prev, [connection.id]: null }))

      const result = await testConnection({
        connectionId: connection.id
      })

      setTestResults(prev => ({ ...prev, [connection.id]: result }))
    } catch (err) {
      setTestResults(prev => ({ ...prev, [connection.id]: { 
        success: false, 
        error: err.message 
      }}))
    } finally {
      setTesting(prev => ({ ...prev, [connection.id]: false }))
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return

    try {
      await deleteConnection({ connectionId })
      setSuccess('Connection deleted successfully!')
      loadConnections()
    } catch (err) {
      setError(`Failed to delete connection: ${err.message}`)
    }
  }

  const handleConfigChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }))
  }

  const selectedProvider = PROVIDER_TYPES[formData.type as keyof typeof PROVIDER_TYPES]

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-mono text-cyan-400 mb-4">ACCESS DENIED</h1>
          <p className="text-gray-400">Please log in to manage connections</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-mono font-bold text-cyan-400 mb-2">
              CONNECTION WIZARD
            </h1>
            <p className="text-gray-400 font-mono">
              Manage your external provider connections and API integrations
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-cyan-400 hover:bg-cyan-500 text-black font-mono font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            NEW CONNECTION
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-400 bg-red-950/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-400 font-mono">ERROR</AlertTitle>
            <AlertDescription className="text-gray-300">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-400 bg-green-950/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertTitle className="text-green-400 font-mono">SUCCESS</AlertTitle>
            <AlertDescription className="text-gray-300">{success}</AlertDescription>
          </Alert>
        )}

        {/* Create Connection Form */}
        {showCreateForm && (
          <Card className="mb-8 bg-gray-900/50 border-cyan-400/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 font-mono">CREATE NEW CONNECTION</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Add a new provider connection to enable agent integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Provider Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-white font-mono">PROVIDER TYPE</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white font-mono">
                        <SelectValue placeholder="Select provider..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {Object.entries(PROVIDER_TYPES).map(([key, provider]) => (
                          <SelectItem key={key} value={key} className="font-mono">
                            <div className="flex items-center space-x-2">
                              {provider.icon}
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white font-mono">CONNECTION NAME</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Provider Connection"
                      className="bg-gray-900 border-gray-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-white font-mono">ACCESS SCOPE</Label>
                    <Select value={formData.scope} onValueChange={(value) => setFormData(prev => ({ ...prev, scope: value }))}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {selectedProvider?.scopes.map((scope) => (
                          <SelectItem key={scope} value={scope} className="font-mono">
                            <Badge variant="outline" className="text-xs">
                              {scope.toUpperCase()}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Configuration Fields */}
                <div className="space-y-4">
                  <h4 className="text-lg font-mono text-white">CONFIGURATION</h4>
                  
                  {selectedProvider?.fields.map((field) => (
                    <div key={field.name}>
                      <Label className="text-white font-mono">{field.label}</Label>
                      {field.type === 'select' ? (
                        <Select 
                          value={formData.config[field.name] || ''} 
                          onValueChange={(value) => handleConfigChange(field.name, value)}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white font-mono">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option} className="font-mono">
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          value={formData.config[field.name] || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className="bg-gray-900 border-gray-700 text-white font-mono"
                        />
                      )}
                    </div>
                  ))}

                  {selectedProvider && (
                    <Alert className="border-cyan-400/50 bg-cyan-950/20">
                      <Shield className="h-4 w-4 text-cyan-400" />
                      <AlertDescription className="text-cyan-200 font-mono text-xs">
                        <strong>PROVIDER:</strong> {selectedProvider.description}
                        <br />
                        <strong>SCOPE:</strong> {formData.scope.toUpperCase()} access level
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-6 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ type: '', name: '', scope: 'read', config: {} })
                  }}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  CANCEL
                </Button>
                <Button
                  onClick={handleCreateConnection}
                  disabled={!formData.type || !formData.name}
                  className="bg-green-400 hover:bg-green-500 text-black font-mono font-bold"
                >
                  CREATE CONNECTION
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connections List */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white font-mono">ACTIVE CONNECTIONS</CardTitle>
            <CardDescription className="text-gray-400 font-mono">
              Manage and test your provider connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400 font-mono">
                Loading connections...
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-mono">
                No connections found. Create your first connection to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <Card key={connection.id} className="bg-black/50 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {PROVIDER_TYPES[connection.type as keyof typeof PROVIDER_TYPES]?.icon || 
                           <Settings className="h-5 w-5 text-gray-400" />}
                          <h4 className="font-mono text-white font-bold">
                            {connection.name}
                          </h4>
                        </div>
                        <Badge 
                          variant={connection.active ? "default" : "secondary"}
                          className={`font-mono text-xs ${
                            connection.active ? 'text-green-400 border-green-400' : 'text-gray-400'
                          }`}
                        >
                          {connection.active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-400 font-mono mb-3">
                        {PROVIDER_TYPES[connection.type as keyof typeof PROVIDER_TYPES]?.name || connection.type}
                      </p>

                      {testResults[connection.id] && (
                        <div className={`flex items-center space-x-2 mb-3 p-2 rounded text-xs font-mono ${
                          testResults[connection.id].success 
                            ? 'text-green-400 bg-green-950/20' 
                            : 'text-red-400 bg-red-950/20'
                        }`}>
                          {testResults[connection.id].success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span>
                            {testResults[connection.id].success ? 'CONNECTION OK' : 'CONNECTION FAILED'}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(connection)}
                          disabled={testing[connection.id]}
                          className="border-blue-400 text-blue-400 hover:bg-blue-400/10"
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          {testing[connection.id] ? 'TESTING...' : 'TEST'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="border-red-400 text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          DELETE
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConnectionsWizardPage