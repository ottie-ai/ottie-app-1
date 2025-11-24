// Template loader - dynamically loads template components

import { TemplateConfig, PropertyData } from './types'
import dynamic from 'next/dynamic'

const templateComponents = {
  'modern-minimal': dynamic(() => import('@/components/templates/modern-minimal/Template')),
  'luxury-elegant': dynamic(() => import('@/components/templates/luxury-elegant/Template')),
  'classic-traditional': dynamic(() => import('@/components/templates/classic-traditional/Template')),
  'bold-vibrant': dynamic(() => import('@/components/templates/bold-vibrant/Template')),
}

export function getTemplateComponent(templateId: string) {
  const Component = templateComponents[templateId as keyof typeof templateComponents]
  
  if (!Component) {
    throw new Error(`Template ${templateId} not found`)
  }
  
  return Component
}

export interface TemplateRendererProps {
  templateId: string
  propertyData: PropertyData
}

export function TemplateRenderer({ templateId, propertyData }: TemplateRendererProps) {
  const TemplateComponent = getTemplateComponent(templateId)
  
  return <TemplateComponent propertyData={propertyData} />
}

