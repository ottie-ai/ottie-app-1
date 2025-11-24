// Individual template preview/demo page

import { notFound } from 'next/navigation'
import { getTemplateById } from '@/lib/templates/config'

export default function TemplatePreviewPage({
  params,
}: {
  params: { templateId: string }
}) {
  const template = getTemplateById(params.templateId)

  if (!template) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-semibold mb-4">{template.name}</h1>
        <p className="text-muted-foreground mb-8">{template.description}</p>
        
        {/* Template preview will be rendered here */}
        <div className="border rounded-lg p-8 bg-muted/50">
          <p className="text-center text-muted-foreground">
            Template preview for {template.name}
          </p>
        </div>
      </div>
    </div>
  )
}

