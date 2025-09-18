import React from 'react'
import { useAuth } from '@wasp-lang/auth/client'
import { EnterpriseChat } from './components/EnterpriseChat'
import { Bot, Users, Zap, Shield, BarChart3 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import './index.css'

export function MainPage() {
  const { data: user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">AgentForge</h1>
              </div>
              <Button asChild>
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-gray-900 tracking-tight">
                Enterprise AI
                <span className="text-blue-600 block">Orchestration Platform</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Deploy intelligent agents, automate complex workflows, and integrate seamlessly with your enterprise infrastructure. Built for scale, security, and performance.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8 py-4 text-lg" asChild>
                <a href="/login">Start Free Trial</a>
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                View Demo
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-2 bg-blue-100 rounded-lg w-fit">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Multi-Agent Delegation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Intelligent agent coordination with automatic task delegation and hierarchical workflows.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-2 bg-green-100 rounded-lg w-fit">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  End-to-end encryption, audit logging, and compliance-ready security controls.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-2 bg-purple-100 rounded-lg w-fit">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Seamless Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with 100+ enterprise tools, APIs, and services with secure credential management.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="p-2 bg-orange-100 rounded-lg w-fit">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Real-time monitoring, performance metrics, and detailed usage analytics.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <EnterpriseChat />
    </div>
  )
}
