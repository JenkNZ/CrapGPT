// Connection Management Component
// Provides UI for managing external service connections

import React, { useState, useEffect } from 'react'
import { 
  getUserConnections, 
  getConnectionById, 
  createConnection, 
  updateConnection, 
  deleteConnection, 
  testConnection,
  revokeConnection,
  linkAgentConnection,
  unlinkAgentConnection,
  getAvailableConnectionTypes 
} from '@wasp-lang/queries'
import { 
  createConnection as createConnectionAction,
  updateConnection as updateConnectionAction,
  deleteConnection as deleteConnectionAction,
  testConnection as testConnectionAction,
  revokeConnection as revokeConnectionAction,
  linkAgentConnection as linkAgentConnectionAction,
  unlinkAgentConnection as unlinkAgentConnectionAction
} from '@wasp-lang/actions'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { 
  Plus, 
  Settings, 
  Trash2, 
  TestTube, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Link, 
  Unlink,
  Key,
  Database,
  Cloud,
  Code,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Connection {
  id: string
  type: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'revoked'
  scopes: string[]
  lastUsed?: string
  createdAt: string
  metadata?: any
}

interface ConnectionType {
  type: string
  name: string
  description: string
  category: string
  defaultScopes: string[]
  requiredFields: string[]
  oauthSupported: boolean
}

const CONNECTION_ICONS = {
  openrouter: <Zap className="h-5 w-5" />,
  fal: <Zap className="h-5 w-5" />,
  modelslab: <Zap className="h-5 w-5" />,
  github: <Code className="h-5 w-5" />,
  aws: <Cloud className="h-5 w-5" />,
  azure: <Cloud className="h-5 w-5" />,
  gcp: <Cloud className="h-5 w-5" />,
  supabase: <Database className="h-5 w-5" />,
  toolhive: <Settings className="h-5 w-5" />,
  openops: <Settings className="h-5 w-5" />,
  arcade: <Settings className="h-5 w-5" />,
  mcpjungle: <Link className="h-5 w-5" />,
}

const CONNECTION_CATEGORIES = {
  'ai-providers': 'AI Providers',
  'development': 'Development Tools',
  'infrastructure': 'Infrastructure & Ops',
  'communication': 'Agent Communication',
  'storage': 'Storage & Database'
}

export function ConnectionManager() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionTypes, setConnectionTypes] = useState<ConnectionType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('connections')
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  // Load connections and types
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [connectionsData, typesData] = await Promise.all([
        getUserConnections(),
        getAvailableConnectionTypes()
      ])
      setConnections(connectionsData)
      setConnectionTypes(typesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (connectionId: string) => {
    try {
      const result = await testConnectionAction({ connectionId })
      setTestResults(prev => ({
        ...prev,
        [connectionId]: result
      }))
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [connectionId]: { success: false, error: err.message }
      }))
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return
    
    try {
      await deleteConnectionAction({ connectionId })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRevokeConnection = async (connectionId: string, reason?: string) => {
    try {
      await revokeConnectionAction({ connectionId, reason })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Connection Management</h1>
          <p className="text-muted-foreground">
            Manage external service connections for your agents
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateConnectionDialog 
              connectionTypes={connectionTypes}
              onSuccess={() => {
                setShowCreateDialog(false)
                loadData()
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connections">My Connections</TabsTrigger>
          <TabsTrigger value="agents">Agent Links</TabsTrigger>
          <TabsTrigger value="security">Security & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <ConnectionList 
            connections={connections}
            testResults={testResults}
            onTest={handleTestConnection}
            onDelete={handleDeleteConnection}
            onRevoke={handleRevokeConnection}
            onEdit={setSelectedConnection}
          />
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <AgentConnectionList 
            connections={connections}
            onLink={linkAgentConnectionAction}
            onUnlink={unlinkAgentConnectionAction}
            onReload={loadData}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityAuditPanel connections={connections} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ConnectionListProps {
  connections: Connection[]
  testResults: Record<string, any>
  onTest: (id: string) => void
  onDelete: (id: string) => void
  onRevoke: (id: string, reason?: string) => void
  onEdit: (connection: Connection) => void
}

function ConnectionList({ connections, testResults, onTest, onDelete, onRevoke, onEdit }: ConnectionListProps) {
  const groupedConnections = connections.reduce((acc, connection) => {
    const category = getConnectionCategory(connection.type)
    if (!acc[category]) acc[category] = []
    acc[category].push(connection)
    return acc
  }, {} as Record<string, Connection[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedConnections).map(([category, categoryConnections]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3">
            {CONNECTION_CATEGORIES[category] || category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                testResult={testResults[connection.id]}
                onTest={onTest}
                onDelete={onDelete}
                onRevoke={onRevoke}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
      
      {connections.length === 0 && (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No connections</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new connection to external services.
          </p>
        </div>
      )}
    </div>
  )
}

interface ConnectionCardProps {
  connection: Connection
  testResult?: any
  onTest: (id: string) => void
  onDelete: (id: string) => void
  onRevoke: (id: string, reason?: string) => void
  onEdit: (connection: Connection) => void
}

function ConnectionCard({ connection, testResult, onTest, onDelete, onRevoke, onEdit }: ConnectionCardProps) {
  const getStatusIcon = () => {
    if (testResult) {
      return testResult.success ? 
        <CheckCircle className="h-4 w-4 text-green-500" /> :
        <XCircle className="h-4 w-4 text-red-500" />
    }
    
    switch (connection.status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-500" />
      case 'revoked': return <ShieldX className="h-4 w-4 text-red-500" />
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = () => {
    switch (connection.status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'revoked': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {CONNECTION_ICONS[connection.type] || <Key className="h-5 w-5" />}
            <CardTitle className="text-lg">{connection.name}</CardTitle>
          </div>
          {getStatusIcon()}
        </div>
        <CardDescription className="text-sm">
          {connection.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusBadgeVariant()}>
            {connection.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {connection.type}
          </span>
        </div>
        
        {connection.scopes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connection.scopes.slice(0, 3).map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
            {connection.scopes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{connection.scopes.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {connection.lastUsed && (
          <p className="text-xs text-muted-foreground">
            Last used: {new Date(connection.lastUsed).toLocaleDateString()}
          </p>
        )}
        
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <AlertDescription className="text-xs">
              {testResult.success ? 'Connection test passed' : `Test failed: ${testResult.error}`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-3">
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(connection.id)}
            disabled={connection.status === 'revoked'}
          >
            <TestTube className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(connection)}
            disabled={connection.status === 'revoked'}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex space-x-1">
          {connection.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevoke(connection.id)}
            >
              <ShieldX className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(connection.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

interface CreateConnectionDialogProps {
  connectionTypes: ConnectionType[]
  onSuccess: () => void
  onCancel: () => void
}

function CreateConnectionDialog({ connectionTypes, onSuccess, onCancel }: CreateConnectionDialogProps) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [connectionData, setConnectionData] = useState({
    name: '',
    description: '',
    config: {} as Record<string, any>,
    scopes: [] as string[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedConnectionType = connectionTypes.find(t => t.type === selectedType)

  const handleCreate = async () => {
    if (!selectedType || !connectionData.name) return

    try {
      setLoading(true)
      await createConnectionAction({
        type: selectedType,
        name: connectionData.name,
        description: connectionData.description,
        config: connectionData.config,
        scopes: connectionData.scopes.length > 0 ? connectionData.scopes : selectedConnectionType?.defaultScopes
      })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Connection</DialogTitle>
        <DialogDescription>
          Connect to external services to enhance your agents' capabilities.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="connectionType">Connection Type</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a connection type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(
                connectionTypes.reduce((acc, type) => {
                  if (!acc[type.category]) acc[type.category] = []
                  acc[type.category].push(type)
                  return acc
                }, {} as Record<string, ConnectionType[]>)
              ).map(([category, types]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                    {CONNECTION_CATEGORIES[category] || category}
                  </div>
                  {types.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex items-center space-x-2">
                        {CONNECTION_ICONS[type.type] || <Key className="h-4 w-4" />}
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedConnectionType && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder={`My ${selectedConnectionType.name} Connection`}
                value={connectionData.name}
                onChange={(e) => setConnectionData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this connection's purpose..."
                value={connectionData.description}
                onChange={(e) => setConnectionData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <ConnectionConfigForm
              connectionType={selectedConnectionType}
              config={connectionData.config}
              onConfigChange={(config) => setConnectionData(prev => ({ ...prev, config }))}
            />
          </>
        )}
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreate} 
          disabled={loading || !selectedType || !connectionData.name}
        >
          {loading ? 'Creating...' : 'Create Connection'}
        </Button>
      </DialogFooter>
    </>
  )
}

interface ConnectionConfigFormProps {
  connectionType: ConnectionType
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

function ConnectionConfigForm({ connectionType, config, onConfigChange }: ConnectionConfigFormProps) {
  const handleFieldChange = (field: string, value: string) => {
    onConfigChange({
      ...config,
      [field]: value
    })
  }

  if (connectionType.oauthSupported) {
    return (
      <div className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>OAuth Authentication</AlertTitle>
          <AlertDescription>
            This connection supports OAuth. You'll be redirected to authorize access after creation.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Configuration</Label>
        <div className="space-y-3">
          {connectionType.requiredFields.map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={field} className="text-xs">
                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              </Label>
              <Input
                id={field}
                type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') ? 'password' : 'text'}
                placeholder={`Enter ${field}...`}
                value={config[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getConnectionCategory(type: string): string {
  const categoryMap = {
    openrouter: 'ai-providers',
    fal: 'ai-providers', 
    modelslab: 'ai-providers',
    github: 'development',
    toolhive: 'development',
    aws: 'infrastructure',
    azure: 'infrastructure',
    gcp: 'infrastructure',
    openops: 'infrastructure',
    arcade: 'infrastructure',
    mcpjungle: 'communication',
    supabase: 'storage'
  }
  return categoryMap[type] || 'other'
}

// Placeholder components for other tabs
function AgentConnectionList({ connections, onLink, onUnlink, onReload }: any) {
  return (
    <div className="text-center py-12">
      <Link className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">Agent Connections</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Link your connections to agents to enable enhanced functionality.
      </p>
    </div>
  )
}

function SecurityAuditPanel({ connections }: any) {
  return (
    <div className="text-center py-12">
      <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">Security & Audit Logs</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        View connection usage logs and security events.
      </p>
    </div>
  )
}

export default ConnectionManager