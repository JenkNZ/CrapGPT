import React, { useState, useEffect } from 'react'
import { useAuth } from '@wasp-lang/auth/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { ScrollArea } from './ui/scroll-area'
import {
  BarChart3,
  TrendingUp,
  Users,
  Bot,
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { cn } from '../lib/utils'

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalAgents: number
    totalConversations: number
    averageResponseTime: number
    uptime: number
  }
  usage: {
    dailyActiveUsers: Array<{ date: string; count: number }>
    conversationsPerDay: Array<{ date: string; count: number }>
    agentUsage: Array<{ name: string; count: number; percentage: number }>
    providerUsage: Array<{ provider: string; requests: number; cost: number }>
  }
  performance: {
    responseTimeMetrics: Array<{ time: string; avgTime: number; p95: number }>
    errorRate: number
    throughput: number
    resourceUsage: {
      cpu: number
      memory: number
      storage: number
    }
  }
  security: {
    failedLogins: number
    suspiciousActivity: number
    dataExports: number
    securityEvents: Array<{
      id: string
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      timestamp: Date
      description: string
    }>
  }
}

export function EnterpriseAnalytics() {
  const { data: user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      // In production, this would fetch from analytics API
      const mockData: AnalyticsData = {
        overview: {
          totalUsers: 1247,
          activeUsers: 892,
          totalAgents: 12,
          totalConversations: 5439,
          averageResponseTime: 1.2,
          uptime: 99.97
        },
        usage: {
          dailyActiveUsers: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 200) + 600
          })).reverse(),
          conversationsPerDay: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 100) + 150
          })).reverse(),
          agentUsage: [
            { name: 'Assistant', count: 2156, percentage: 45 },
            { name: 'Code Assistant', count: 1278, percentage: 27 },
            { name: 'Data Analyst', count: 856, percentage: 18 },
            { name: 'Creative Writer', count: 478, percentage: 10 }
          ],
          providerUsage: [
            { provider: 'OpenAI', requests: 12547, cost: 2847.23 },
            { provider: 'Anthropic', requests: 7832, cost: 1654.87 },
            { provider: 'OpenRouter', requests: 5921, cost: 892.45 }
          ]
        },
        performance: {
          responseTimeMetrics: Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            avgTime: Math.random() * 2 + 0.8,
            p95: Math.random() * 3 + 2
          })),
          errorRate: 0.12,
          throughput: 1247,
          resourceUsage: {
            cpu: 67,
            memory: 78,
            storage: 45
          }
        },
        security: {
          failedLogins: 23,
          suspiciousActivity: 2,
          dataExports: 8,
          securityEvents: [
            {
              id: '1',
              type: 'Failed Login Attempt',
              severity: 'medium',
              timestamp: new Date(),
              description: 'Multiple failed login attempts from IP 192.168.1.100'
            },
            {
              id: '2',
              type: 'Unusual API Usage',
              severity: 'high',
              timestamp: new Date(),
              description: 'Abnormal API usage pattern detected for user ID 1247'
            }
          ]
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
      setData(mockData)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-96 border-0 shadow-xl">
          <CardContent className="text-center p-8">
            <div className="p-3 bg-blue-600 rounded-xl w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h3>
            <p className="text-gray-600 mb-6">
              Please sign in to access analytics dashboard
            </p>
            <Button asChild className="w-full">
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
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
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-600">Enterprise insights and reporting</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button variant="outline" onClick={loadAnalyticsData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.totalConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+23.1%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.averageResponseTime}s</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">-15.3%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status and uptime</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uptime</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-bold">{data?.overview.uptime}%</span>
                    </div>
                  </div>
                  <Progress value={data?.overview.uptime} className="h-2" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="text-sm font-medium">{data?.performance.resourceUsage.cpu}%</span>
                    </div>
                    <Progress value={data?.performance.resourceUsage.cpu} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">{data?.performance.resourceUsage.memory}%</span>
                    </div>
                    <Progress value={data?.performance.resourceUsage.memory} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>Most popular AI agents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.usage.agentUsage.map((agent) => (
                      <div key={agent.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{agent.count}</span>
                          <Badge variant="secondary">{agent.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Usage & Costs</CardTitle>
                  <CardDescription>API usage and associated costs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.usage.providerUsage.map((provider) => (
                      <div key={provider.provider} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{provider.provider}</div>
                          <div className="text-sm text-gray-600">{provider.requests.toLocaleString()} requests</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${provider.cost.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">this month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>Daily active users and conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Interactive charts would be displayed here</p>
                      <p className="text-sm text-gray-500 mt-2">Integration with charting libraries like Chart.js or D3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Rate</CardTitle>
                  <CardDescription>System error percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{data?.performance.errorRate}%</div>
                  <p className="text-sm text-gray-600 mt-2">Well below 1% threshold</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Throughput</CardTitle>
                  <CardDescription>Requests per minute</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{data?.performance.throughput}</div>
                  <p className="text-sm text-gray-600 mt-2">Average over last hour</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time</CardTitle>
                  <CardDescription>P95 response time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">2.1s</div>
                  <p className="text-sm text-gray-600 mt-2">95th percentile</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Failed Logins</CardTitle>
                  <CardDescription>Last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{data?.security.failedLogins}</div>
                  <p className="text-sm text-gray-600 mt-2">Normal levels</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suspicious Activity</CardTitle>
                  <CardDescription>Flagged events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{data?.security.suspiciousActivity}</div>
                  <p className="text-sm text-gray-600 mt-2">Requires investigation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Exports</CardTitle>
                  <CardDescription>GDPR requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{data?.security.dataExports}</div>
                  <p className="text-sm text-gray-600 mt-2">This month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Recent security incidents and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {data?.security.securityEvents.map((event) => (
                      <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className={cn(
                          "p-1 rounded-full",
                          event.severity === 'critical' && "bg-red-100",
                          event.severity === 'high' && "bg-orange-100",
                          event.severity === 'medium' && "bg-yellow-100",
                          event.severity === 'low' && "bg-blue-100"
                        )}>
                          <AlertTriangle className={cn(
                            "h-3 w-3",
                            event.severity === 'critical' && "text-red-600",
                            event.severity === 'high' && "text-orange-600",
                            event.severity === 'medium' && "text-yellow-600",
                            event.severity === 'low' && "text-blue-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{event.type}</h4>
                            <Badge variant={
                              event.severity === 'critical' ? 'destructive' : 
                              event.severity === 'high' ? 'destructive' : 'secondary'
                            }>
                              {event.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {event.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}