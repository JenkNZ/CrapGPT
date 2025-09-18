import React from 'react'
import { Button } from './components/ui/button'
import { Bot, Github, Building2, Shield, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import './index.css'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col justify-center px-8 xl:px-12">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AgentForge</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Enterprise AI Orchestration
              <span className="text-blue-600 block">Made Simple</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-lg">
              Deploy intelligent agents, automate workflows, and scale your business with enterprise-grade AI orchestration.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enterprise Ready</h3>
                <p className="text-gray-600">SOC 2 compliant with enterprise-grade security and scalability</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure by Design</h3>
                <p className="text-gray-600">End-to-end encryption with comprehensive audit logging</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-gray-600">High-performance infrastructure with real-time orchestration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex justify-center lg:hidden">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">AgentForge</h1>
                </div>
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                <CardDescription className="text-base">
                  Sign in to your AgentForge account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-3">
                <Button 
                  className="w-full flex items-center justify-center space-x-3" 
                  size="lg"
                  asChild
                >
                  <a href="/auth/google">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </a>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center space-x-3" 
                  size="lg"
                  asChild
                >
                  <a href="/auth/github">
                    <Github className="w-5 h-5" />
                    <span>Continue with GitHub</span>
                  </a>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium">
                    Or explore our platform
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                asChild
              >
                <a href="/?demo=true">
                  View Demo
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-800 underline underline-offset-4">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline underline-offset-4">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
