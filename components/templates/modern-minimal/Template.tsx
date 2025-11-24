// Modern Minimal Template Component

import { PropertyData } from '@/lib/templates/types'

interface ModernMinimalTemplateProps {
  propertyData: PropertyData
}

export default function ModernMinimalTemplate({ propertyData }: ModernMinimalTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Template-specific styles and layout */}
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-5xl font-medium mb-4">{propertyData.address}</h1>
        <p className="text-xl text-gray-600 mb-8">{propertyData.description}</p>
        
        {/* Template content */}
      </div>
    </div>
  )
}

