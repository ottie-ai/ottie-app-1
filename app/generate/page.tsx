// Generate one-pager page

import { Suspense } from 'react'
import GenerateForm from './generate-form'
import Navbar from '@/components/navbar'

export default function GeneratePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Suspense fallback={<GeneratePageSkeleton />}>
            <GenerateForm />
          </Suspense>
        </div>
      </main>
    </>
  )
}

function GeneratePageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-muted rounded w-64 mb-2" />
        <div className="h-4 bg-muted rounded w-48" />
      </div>
      <div className="bg-card border rounded-lg p-6">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}
