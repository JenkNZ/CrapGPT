import React, { useMemo, useState } from 'react'
import { useAction } from '@wasp/actions'
import createConnectionAction from '@wasp/actions/createConnection'
import testProviderConnectivityAction from '@wasp/actions/testProviderConnectivity'

type ProviderType = 'openops' | 'arcade' | 'hexstrike' | 'mcpjungle' | 'toolhive' | 'custom'
type Scope = 'read-only' | 'change-safe' | 'admin'

const PROVIDERS: { id: ProviderType; label: string; hint: string }[] = [
  { id: 'openops', label: 'OpenOps', hint: 'API URL and API key' },
  { id: 'arcade', label: 'Arcade', hint: 'API key' },
  { id: 'hexstrike', label: 'HexStrike (MCP)', hint: 'MCP server URL' },
  { id: 'mcpjungle', label: 'MCPJungle', hint: 'Gateway URL and optional token' },
  { id: 'toolhive', label: 'ToolHive', hint: 'Registry URL' },
  { id: 'custom', label: 'Custom HTTP', hint: 'A simple test URL' }
]

const SCOPES: Scope[] = ['read-only', 'change-safe', 'admin']

export default function ConnectionWizard() {
  const [step, setStep] = useState<number>(1)
  const [type, setType] = useState<ProviderType>('openops')
  const [name, setName] = useState<string>('')
  const [scope, setScope] = useState<Scope>('read-only')
  const [config, setConfig] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; details: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const testConnectivity = useAction(testProviderConnectivityAction)
  const createConnection = useAction(createConnectionAction)

  // Form schema changes by provider
  const Fields = useMemo(() => {
    if (type === 'openops') {
      return (
        <>
          <Text label="API URL" value={config.apiUrl || ''} onChange={(v) => setConfig({ ...config, apiUrl: v })} placeholder="https://api.openops.com" />
          <Secret label="API Key" value={config.apiKey || ''} onChange={(v) => setConfig({ ...config, apiKey: v })} />
          <Text label="Default Account (optional)" value={config.defaultAccount || ''} onChange={(v) => setConfig({ ...config, defaultAccount: v })} />
        </>
      )
    }
    if (type === 'arcade') {
      return (
        <>
          <Secret label="API Key" value={config.apiKey || ''} onChange={(v) => setConfig({ ...config, apiKey: v })} />
          <Text label="Project (optional)" value={config.project || ''} onChange={(v) => setConfig({ ...config, project: v })} />
          <Text label="Region (optional)" value={config.region || ''} onChange={(v) => setConfig({ ...config, region: v })} />
        </>
      )
    }
    if (type === 'mcpjungle') {
      return (
        <>
          <Text label="Gateway URL" value={config.url || ''} onChange={(v) => setConfig({ ...config, url: v })} placeholder="http://localhost:7000" />
          <Secret label="Bearer Token (optional)" value={config.token || ''} onChange={(v) => setConfig({ ...config, token: v })} />
        </>
      )
    }
    if (type === 'hexstrike') {
      return (
        <>
          <Text label="MCP Server URL" value={config.serverUrl || ''} onChange={(v) => setConfig({ ...config, serverUrl: v })} placeholder="http://localhost:8888" />
          <Textarea label="Tool allow list (comma separated)" value={(config.toolWhitelist || []).join(',')} onChange={(v) => setConfig({ ...config, toolWhitelist: v.split(',').map(s => s.trim()).filter(Boolean) })} />
          <Number label="Timeout seconds" value={config.timeoutSec ?? 300} onChange={(n) => setConfig({ ...config, timeoutSec: n })} />
        </>
      )
    }
    if (type === 'toolhive') {
      return (
        <>
          <Text label="Registry URL" value={config.registryUrl || ''} onChange={(v) => setConfig({ ...config, registryUrl: v })} placeholder="https://registry.toolhive.dev" />
          <Text label="Vault namespace (optional)" value={config.namespace || ''} onChange={(v) => setConfig({ ...config, namespace: v })} />
        </>
      )
    }
    // custom
    return (
      <>
        <Text label="Test URL" value={config.testUrl || ''} onChange={(v) => setConfig({ ...config, testUrl: v })} placeholder="https://example.com/health" />
      </>
    )
  }, [type, config])

  async function handleTest() {
    setTesting(true); setTestResult(null)
    const res = await testConnectivity({ type, config })
    setTesting(false)
    setTestResult(res)
  }

  async function handleSave() {
    if (!name.trim()) return alert('Please name this connection')
    setSaving(true)
    try {
      const res = await createConnection({ type, name, scope, config })
      setSavedId(res.id)
      setStep(3)
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight text-[#39FF14]">Connection Wizard</h2>
      <p className="text-sm text-neutral-400 mb-4">Create a secure connection for agents. Secrets are stored server side. Scopes control what agents can do.</p>

      {/* Stepper */}
      <div className="flex gap-2 mb-6">
        <Step n={1} title="Provider" active={step === 1} />
        <Step n={2} title="Configure" active={step === 2} />
        <Step n={3} title="Finish" active={step === 3} />
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setType(p.id)}
                className={`border rounded-xl p-3 text-left hover:bg-neutral-900 ${type === p.id ? 'border-[#39FF14] bg-neutral-900' : 'border-neutral-700'}`}
              >
                <div className="font-semibold">{p.label}</div>
                <div className="text-xs text-neutral-400">{p.hint}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Text label="Connection name" value={name} onChange={setName} placeholder="OpenOps Read Only" />
            <Select label="Scope" value={scope} onChange={(v) => setScope(v as Scope)} options={SCOPES.map(s => ({ label: s, value: s }))} />
          </div>

          <div className="flex justify-end">
            <button className="px-4 py-2 bg-[#39FF14] text-black rounded-lg font-bold" onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">{Fields}</div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-neutral-700 rounded-lg">Back</button>
            <button onClick={handleTest} disabled={testing} className="px-4 py-2 bg-neutral-800 rounded-lg border border-neutral-700">
              {testing ? 'Testing…' : 'Test connectivity'}
            </button>
            {testResult && (
              <span className={`text-sm ${testResult.ok ? 'text-[#39FF14]' : 'text-[#FF0033]'}`}>
                {testResult.details}
              </span>
            )}
            <div className="flex-1"></div>
            <button onClick={handleSave} disabled={!testResult?.ok || saving} className="px-4 py-2 bg-[#39FF14] text-black rounded-lg font-bold">
              {saving ? 'Saving…' : 'Save connection'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="border border-neutral-700 rounded-xl p-4">
            <div className="text-lg font-semibold text-[#39FF14]">All set</div>
            <div className="text-sm text-neutral-300">Connection saved with id <span className="font-mono">{savedId}</span>.</div>
            <div className="text-sm text-neutral-400">Agents can now select this connection when they need it.</div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-neutral-700 rounded-lg" onClick={() => { setStep(1); setName(''); setConfig({}); setTestResult(null); }}>
              Create another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* Small form bits */

function Step({ n, title, active }: { n: number; title: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${active ? 'border-[#39FF14] bg-neutral-900' : 'border-neutral-700'}`}>
      <div className={`w-6 h-6 rounded-full grid place-items-center ${active ? 'bg-[#39FF14] text-black' : 'bg-neutral-800 text-neutral-300'}`}>{n}</div>
      <div className="text-sm">{title}</div>
    </div>
  )
}

function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">{label}</div>
      <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-[#39FF14]"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}
function Secret(props: any) { return <Text {...props} /> }
function Number({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">{label}</div>
      <input type="number" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-[#39FF14]"
        value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">{label}</div>
      <textarea className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-[#39FF14] min-h-[96px]"
        value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">{label}</div>
      <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-[#39FF14]"
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// Scope security levels with colors
const SCOPE_COLORS = {
  'read-only': 'text-green-400 border-green-400',
  'read': 'text-green-400 border-green-400',
  'passive': 'text-green-400 border-green-400',
  'discovery': 'text-green-400 border-green-400',
  'read-secrets': 'text-blue-400 border-blue-400',
  'change-safe': 'text-yellow-400 border-yellow-400',
  'compute': 'text-yellow-400 border-yellow-400',
  'active': 'text-yellow-400 border-yellow-400',
  'execution': 'text-yellow-400 border-yellow-400',
  'write-secrets': 'text-orange-400 border-orange-400',
  'storage': 'text-orange-400 border-orange-400',
  'admin': 'text-red-400 border-red-400',
  'exploit': 'text-red-400 border-red-400'
}

interface ConnectionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (connection: any) => void
  editConnection?: any
}

export function ConnectionWizard({ isOpen, onClose, onSuccess, editConnection }: ConnectionWizardProps) {
  const [step, setStep] = useState(1)
  const [providerTypes, setProviderTypes] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedScope, setSelectedScope] = useState('')
  const [connectionData, setConnectionData] = useState({
    name: '',
    description: '',
    config: {}
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')
  const [showSecrets, setShowSecrets] = useState({})

  useEffect(() => {
    if (isOpen) {
      loadProviderTypes()
      if (editConnection) {
        // Pre-populate for editing
        setSelectedProvider(editConnection.type)
        setSelectedScope(editConnection.scopes?.[0] || 'read-only')
        setConnectionData({
          name: editConnection.name,
          description: editConnection.description || '',
          config: editConnection.config || {}
        })
        setStep(2) // Skip provider selection
      } else {
        // Reset for new connection
        setStep(1)
        setSelectedProvider('')
        setSelectedScope('')
        setConnectionData({ name: '', description: '', config: {} })
        setTestResult(null)
        setError('')
      }
    }
  }, [isOpen, editConnection])

  const loadProviderTypes = async () => {
    try {
      const types = await getAvailableConnectionTypes()
      setProviderTypes(types)
    } catch (err) {
      setError(`Failed to load provider types: ${err.message}`)
    }
  }

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider)
    const providerSpec = providerTypes.find(p => p.type === provider)
    if (providerSpec?.scopes) {
      // Auto-select safest scope
      const scopes = Object.keys(providerSpec.scopes)
      setSelectedScope(scopes[0]) // First scope is usually safest
    }
    setStep(2)
  }

  const handleConfigChange = (field, value) => {
    setConnectionData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }))
  }

  const toggleSecretVisibility = (field) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      const result = await testConnectionAction({
        type: selectedProvider,
        config: connectionData.config
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message
      })
    } finally {
      setTesting(false)
    }
  }

  const handleCreateConnection = async () => {
    setLoading(true)
    setError('')
    
    try {
      const connection = await createConnectionAction({
        type: selectedProvider,
        name: connectionData.name,
        description: connectionData.description,
        config: connectionData.config,
        scopes: [selectedScope]
      })
      
      onSuccess(connection)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const providerSpec = providerTypes.find(p => p.type === selectedProvider)
  const scopeSpec = providerSpec?.scopes?.[selectedScope]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl p-4">
        <Card className="bg-black border-cyan-400 border-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
          <CardHeader className="border-b border-cyan-400/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="h-8 w-8 text-cyan-400" />
                <div>
                  <CardTitle className="text-2xl font-mono text-cyan-400">
                    CONNECTION WIZARD
                  </CardTitle>
                  <CardDescription className="text-gray-400 font-mono">
                    {editConnection ? 'MODIFY EXISTING' : 'NEW INTEGRATION'} // STEP {step}/3
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-red-400 text-red-400 hover:bg-red-400/10"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress bar */}
            <Progress 
              value={(step / 3) * 100} 
              className="mt-4 bg-gray-800"
            />
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-400 bg-red-950/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-red-400 font-mono">CONNECTION ERROR</AlertTitle>
                <AlertDescription className="text-gray-300">{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Provider Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-mono text-cyan-400 mb-4">
                    SELECT PROVIDER TYPE
                  </h3>
                  <p className="text-gray-400 font-mono text-sm mb-6">
                    Choose your integration target. Start with READ-ONLY access.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providerTypes.map((provider) => (
                    <Card
                      key={provider.type}
                      className={`cursor-pointer transition-all bg-gray-900/50 border-gray-700 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]`}
                      onClick={() => handleProviderSelect(provider.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {PROVIDER_ICONS[provider.type] || <Settings className="h-8 w-8 text-gray-400" />}
                          <div>
                            <h4 className="font-mono text-white font-bold">
                              {provider.name}
                            </h4>
                            <p className="text-xs text-gray-400 font-mono">
                              {provider.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 font-mono">
                          {provider.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {provider.scopes && Object.keys(provider.scopes).map((scope) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className={`text-xs font-mono ${SCOPE_COLORS[scope] || 'text-gray-400 border-gray-600'}`}
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && providerSpec && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  {PROVIDER_ICONS[selectedProvider]}
                  <div>
                    <h3 className="text-xl font-mono text-cyan-400">
                      CONFIGURE {providerSpec.name.toUpperCase()}
                    </h3>
                    <p className="text-gray-400 font-mono text-sm">
                      Set up credentials and access scope
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white font-mono">CONNECTION NAME</Label>
                      <Input
                        value={connectionData.name}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={`My ${providerSpec.name} Connection`}
                        className="bg-gray-900 border-gray-700 text-white font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-white font-mono">DESCRIPTION (OPTIONAL)</Label>
                      <Textarea
                        value={connectionData.description}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Purpose and usage notes..."
                        className="bg-gray-900 border-gray-700 text-white font-mono"
                        rows={3}
                      />
                    </div>

                    {/* Scope Selection */}
                    <div>
                      <Label className="text-white font-mono">ACCESS SCOPE</Label>
                      <Select value={selectedScope} onValueChange={setSelectedScope}>
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {providerSpec.scopes && Object.entries(providerSpec.scopes).map(([scope, config]) => (
                            <SelectItem key={scope} value={scope} className="font-mono">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${SCOPE_COLORS[scope] || 'text-gray-400 border-gray-600'}`}
                                >
                                  {config.label}
                                </Badge>
                                <span className="text-sm">{config.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {scopeSpec && (
                        <Alert className="mt-2 border-cyan-400/50 bg-cyan-950/20">
                          <Shield className="h-4 w-4 text-cyan-400" />
                          <AlertDescription className="text-cyan-200 font-mono text-xs">
                            <strong>PERMISSIONS:</strong> {scopeSpec.description}
                            <br />
                            <strong>ACTIONS:</strong> {scopeSpec.actions.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {/* Configuration Fields */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-mono text-white">CREDENTIALS</h4>
                    
                    {providerSpec.configSchema?.required.map((field) => (
                      <div key={field}>
                        <Label className="text-white font-mono">
                          {field.toUpperCase().replace(/([A-Z])/g, ' $1')}
                        </Label>
                        <div className="relative">
                          <Input
                            type={
                              (field.toLowerCase().includes('secret') || 
                               field.toLowerCase().includes('key') || 
                               field.toLowerCase().includes('token')) && 
                              !showSecrets[field] ? 'password' : 'text'
                            }
                            value={connectionData.config[field] || ''}
                            onChange={(e) => handleConfigChange(field, e.target.value)}
                            placeholder={`Enter ${field}...`}
                            className="bg-gray-900 border-gray-700 text-white font-mono pr-10"
                          />
                          {(field.toLowerCase().includes('secret') || 
                            field.toLowerCase().includes('key') || 
                            field.toLowerCase().includes('token')) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => toggleSecretVisibility(field)}
                            >
                              {showSecrets[field] ? 
                                <EyeOff className="h-4 w-4 text-gray-400" /> : 
                                <Eye className="h-4 w-4 text-gray-400" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {providerSpec.configSchema?.optional && (
                      <details className="mt-4">
                        <summary className="text-sm font-mono text-gray-400 cursor-pointer hover:text-white">
                          OPTIONAL SETTINGS
                        </summary>
                        <div className="mt-2 space-y-4">
                          {providerSpec.configSchema.optional.map((field) => (
                            <div key={field}>
                              <Label className="text-white font-mono text-sm">
                                {field.toUpperCase().replace(/([A-Z])/g, ' $1')}
                              </Label>
                              <Input
                                value={connectionData.config[field] || ''}
                                onChange={(e) => handleConfigChange(field, e.target.value)}
                                placeholder={`Enter ${field}...`}
                                className="bg-gray-900 border-gray-700 text-white font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                  >
                    BACK
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testing || !connectionData.name}
                      className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                    >
                      {testing ? 'TESTING...' : 'TEST CONNECTION'}
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!connectionData.name}
                      className="bg-cyan-400 hover:bg-cyan-500 text-black font-mono"
                    >
                      NEXT
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Create */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-mono text-cyan-400">
                  REVIEW & ACTIVATE
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white font-mono">CONNECTION DETAILS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-gray-400 font-mono text-sm">NAME</Label>
                        <p className="text-white font-mono">{connectionData.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400 font-mono text-sm">PROVIDER</Label>
                        <p className="text-white font-mono">{providerSpec?.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400 font-mono text-sm">SCOPE</Label>
                        <Badge className={`font-mono ${SCOPE_COLORS[selectedScope]}`}>
                          {scopeSpec?.label}
                        </Badge>
                      </div>
                      {connectionData.description && (
                        <div>
                          <Label className="text-gray-400 font-mono text-sm">DESCRIPTION</Label>
                          <p className="text-gray-300 font-mono text-sm">{connectionData.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white font-mono">CONNECTION TEST</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResult ? (
                        <div className={`flex items-center space-x-2 p-3 rounded border ${
                          testResult.success 
                            ? 'border-green-400 bg-green-950/20' 
                            : 'border-red-400 bg-red-950/20'
                        }`}>
                          {testResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <p className={`font-mono font-bold ${
                              testResult.success ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {testResult.success ? 'CONNECTION VERIFIED' : 'CONNECTION FAILED'}
                            </p>
                            {testResult.error && (
                              <p className="text-gray-300 font-mono text-sm">{testResult.error}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Alert className="border-yellow-400 bg-yellow-950/20">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-200 font-mono">
                            Test connection before activating
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {scopeSpec && (
                  <Alert className="border-cyan-400/50 bg-cyan-950/20">
                    <Lock className="h-4 w-4 text-cyan-400" />
                    <AlertTitle className="text-cyan-400 font-mono">SECURITY NOTICE</AlertTitle>
                    <AlertDescription className="text-cyan-200 font-mono text-sm">
                      This connection will have <strong>{scopeSpec.label.toLowerCase()}</strong> access.
                      <br />
                      Authorized actions: {scopeSpec.actions.join(', ')}
                      <br />
                      All activities will be logged and monitored.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between pt-6 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                  >
                    BACK
                  </Button>
                  <Button
                    onClick={handleCreateConnection}
                    disabled={loading || !testResult?.success}
                    className="bg-green-400 hover:bg-green-500 text-black font-mono font-bold"
                  >
                    {loading ? 'ACTIVATING...' : 'ACTIVATE CONNECTION'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConnectionWizard