import React from 'react'
import ConnectionWizard from '../components/ConnectionWizard'
import EnhancedConnectionManager from '../components/EnhancedConnectionManager'
import OpenOpsAgentTest from '../components/OpenOpsAgentTest'

export default function ConnectionsPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-10">
      <ConnectionWizard />
      <EnhancedConnectionManager />
      <div className="border-t border-neutral-700 pt-10">
        <OpenOpsAgentTest />
      </div>
    </div>
  )
}
