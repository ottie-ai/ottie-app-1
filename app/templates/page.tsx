// Template selection page

import { templates } from '@/lib/templates/config'
import { TemplateConfig } from '@/lib/templates/types'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/navbar'

export default function TemplatesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-semibold mb-4">Choose Your Template</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select a template that matches your property's style. Each template has its own unique design and layout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

function TemplateCard({ template }: { template: TemplateConfig }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted">
        {/* Preview image placeholder */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">Preview Image</span>
        </div>
      </div>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {template.features.map((feature, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground"
              >
                {feature}
              </span>
            ))}
          </div>
          <Button asChild className="w-full">
            <Link href={`/generate?template=${template.id}`}>
              Use This Template
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

