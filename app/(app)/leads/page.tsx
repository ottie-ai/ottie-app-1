'use client'

import { PageTitle } from '@/components/page-title'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { LeadsTable } from '@/components/workspace/leads-table'

export default function LeadsPage() {

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Leads" 
        description="View and manage all leads from your property sites."
      />
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-base font-semibold">Leads</h1>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 overflow-y-auto">
        <LeadsTable showAddButton={true} />
      </main>
    </div>
  )
}

