// Classic Traditional Template Component

import { PropertyData } from '@/lib/templates/types'

interface ClassicTraditionalTemplateProps {
  propertyData: PropertyData
}

export default function ClassicTraditionalTemplate({ propertyData }: ClassicTraditionalTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-semibold mb-4 text-[#2c3e50]">
          {propertyData.address}
        </h1>
        <p className="text-lg text-[#2c3e50] mb-8">{propertyData.description}</p>
      </div>
    </div>
  )
}

