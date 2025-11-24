// Dynamic route for generated one-pagers

import { notFound } from 'next/navigation'
import { getTemplateById } from '@/lib/templates/config'
import { GeneratedPage } from '@/lib/templates/types'

// This will be replaced with actual data fetching
async function getPageData(slug: string): Promise<GeneratedPage | null> {
  // TODO: Fetch from database/API
  return null
}

export default async function OnePagerPage({
  params,
}: {
  params: { slug: string }
}) {
  const pageData = await getPageData(params.slug)

  if (!pageData) {
    notFound()
  }

  const template = getTemplateById(pageData.templateId)

  if (!template) {
    notFound()
  }

  // Render template component based on templateId
  return (
    <div>
      {/* Template will be rendered here */}
      <p>Template: {template.name}</p>
      <p>Slug: {params.slug}</p>
    </div>
  )
}

