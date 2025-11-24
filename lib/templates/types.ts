// Template system types

export interface PropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  description: string
  images: string[]
  agentName: string
  agentEmail: string
  agentPhone: string
  listingUrl?: string
  features: string[]
  yearBuilt?: number
  lotSize?: number
  propertyType: 'house' | 'apartment' | 'condo' | 'townhouse' | 'land'
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  previewImage: string
  category: 'modern' | 'classic' | 'luxury' | 'minimal' | 'bold'
  layout: 'single-column' | 'two-column' | 'grid' | 'hero-focused'
  colorScheme: {
    primary: string
    secondary: string
    background: string
    text: string
  }
  features: string[]
}

export interface GeneratedPage {
  id: string
  slug: string
  templateId: string
  propertyData: PropertyData
  createdAt: Date
  updatedAt: Date
  published: boolean
  customDomain?: string
}

