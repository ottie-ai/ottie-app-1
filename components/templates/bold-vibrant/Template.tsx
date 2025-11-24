// Bold Vibrant Template Component

import { PropertyData } from '@/lib/templates/types'

interface BoldVibrantTemplateProps {
  propertyData: PropertyData
}

export default function BoldVibrantTemplate({ propertyData }: BoldVibrantTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-6xl font-bold mb-4 text-[#ff6b6b]">
          {propertyData.address}
        </h1>
        <p className="text-xl text-[#2d3436] mb-8">{propertyData.description}</p>
      </div>
    </div>
  )
}

