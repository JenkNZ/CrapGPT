import React, { useState } from 'react'
import { useAuth } from '@wasp-lang/auth/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ScrollArea } from './ui/scroll-area'
import {
  User,
  Settings,
  Shield,
  Bell,
  Key,
  Activity,
  Database,
  Globe,
  Mail,
  Smartphone,
  Lock,
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Bot
} from 'lucide-react'
import { cn } from '../lib/utils'

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    agentCompletions: boolean
    securityAlerts: boolean
    maintenanceUpdates: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    requirePasswordChange: boolean
    auditLogRetention: number
  }
  ui: {
    sidebarCollapsed: boolean
    defaultView: string
    itemsPerPage: number
    showAdvancedFeatures: boolean
  }
}

export function EnterpriseSettings() {
  const { data: user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      agentCompletions: true,
      securityAlerts: true,
      maintenanceUpdates: false
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 120,
      requirePasswordChange: false,
      auditLogRetention: 90
    },
    ui: {
      sidebarCollapsed: false,
      defaultView: 'dashboard',
      itemsPerPage: 25,
      showAdvancedFeatures: false
    }
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-96 border-0 shadow-xl">
          <CardContent className="text-center p-8">
            <div className="p-3 bg-blue-600 rounded-xl w-fit mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600 mb-6">
              Please sign in to access your settings
            </p>
            <Button asChild className="w-full">
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Building2 className="h-3 w-3" />
                <span>Enterprise</span>
              </Badge>
              <Button variant="outline" asChild>
                <a href="/">Back to Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1 p-4">
                  {[
                    { id: 'profile', label: 'Profile', icon: User },
                    { id: 'security', label: 'Security', icon: Shield },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'preferences', label: 'Preferences', icon: Settings },
                    { id: 'api', label: 'API Keys', icon: Key },
                    { id: 'audit', label: 'Audit Log', icon: Activity },
                    { id: 'data', label: 'Data & Privacy', icon: Database }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors',
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">2FA Enabled</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Sessions</span>
                  <Badge variant="secondary">3</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your account profile information and email address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-lg">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">{user.name || user.email}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <Badge variant="outline">Enterprise User</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          defaultValue={user.name || ''}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@company.com"
                          defaultValue={user.email}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="username"
                          defaultValue={user.username || ''}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="UTC">UTC</option>
                          <option value="EST">Eastern Time</option>
                          <option value="PST">Pacific Time</option>
                          <option value="GMT">Greenwich Mean Time</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                    <CardDescription>
                      Your organization and role information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-8 w-8 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">AgentForge Enterprise</h4>
                            <p className="text-sm text-gray-600">Administrator</p>
                          </div>
                        </div>
                        <Badge>Admin</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and authentication preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.security.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setPreferences(prev => ({
                            ...prev,
                            security: { ...prev.security, twoFactorEnabled: checked }
                          }))
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Session Timeout</h4>
                          <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                        </div>
                        <select 
                          value={preferences.security.sessionTimeout}
                          onChange={(e) =>
                            setPreferences(prev => ({
                              ...prev,
                              security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                            }))
                          }
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={480}>8 hours</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Password Change Required</h4>
                          <p className="text-sm text-gray-500">Require password change on next login</p>
                        </div>
                        <Switch
                          checked={preferences.security.requirePasswordChange}
                          onCheckedChange={(checked) =>
                            setPreferences(prev => ({
                              ...prev,
                              security: { ...prev.security, requirePasswordChange: checked }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>
                      Manage your active login sessions across devices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { device: 'Chrome on Windows', location: 'New York, NY', lastActive: '2 minutes ago', current: true },
                        { device: 'Safari on iPhone', location: 'New York, NY', lastActive: '1 hour ago', current: false },
                        { device: 'Firefox on MacOS', location: 'San Francisco, CA', lastActive: '3 days ago', current: false }
                      ].map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {session.device.includes('iPhone') ? (
                                <Smartphone className="h-4 w-4 text-gray-600" />
                              ) : (
                                <Globe className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{session.device}</h4>
                              <p className="text-sm text-gray-500">{session.location} • {session.lastActive}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {session.current && (
                              <Badge variant="secondary">Current Session</Badge>
                            )}
                            <Button variant="outline" size="sm">
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about account activity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { 
                      key: 'email', 
                      title: 'Email Notifications', 
                      description: 'Receive notifications via email',
                      icon: Mail 
                    },
                    { 
                      key: 'push', 
                      title: 'Push Notifications', 
                      description: 'Receive browser push notifications',
                      icon: Bell 
                    },
                    { 
                      key: 'agentCompletions', 
                      title: 'Agent Task Completions', 
                      description: 'Notify when agent tasks are completed',
                      icon: Bot 
                    },
                    { 
                      key: 'securityAlerts', 
                      title: 'Security Alerts', 
                      description: 'Important security notifications',
                      icon: Shield 
                    },
                    { 
                      key: 'maintenanceUpdates', 
                      title: 'Maintenance Updates', 
                      description: 'System maintenance and updates',
                      icon: Settings 
                    }
                  ].map((notification) => (
                    <div key={notification.key} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <notification.icon className="h-5 w-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-500">{notification.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.notifications[notification.key as keyof typeof preferences.notifications]}
                        onCheckedChange={(checked) =>
                          setPreferences(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, [notification.key]: checked }
                          }))
                        }
                      />
                    </div>
                  ))}
                  
                  <div className="pt-4">
                    <Button>Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>
                      Control your data and privacy settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Download className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium">Export Data</h4>
                          <p className="text-sm text-gray-500">Download a copy of your data</p>
                        </div>
                      </div>
                      <Button variant="outline">Export</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                          <h4 className="font-medium">Data Retention</h4>
                          <p className="text-sm text-gray-500">Audit logs kept for {preferences.security.auditLogRetention} days</p>
                        </div>
                      </div>
                      <Button variant="outline">Configure</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        <div>
                          <h4 className="font-medium text-red-600">Delete Account</h4>
                          <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                        </div>
                      </div>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}