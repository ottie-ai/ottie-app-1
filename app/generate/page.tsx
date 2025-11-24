// Generate one-pager page

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { templates, getTemplateById } from '@/lib/templates/config'
import { PropertyData } from '@/lib/templates/types'
import Navbar from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function GeneratePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const templateId = searchParams.get('template') || templates[0].id
  const selectedTemplate = getTemplateById(templateId)

  const [propertyData, setPropertyData] = useState<Partial<PropertyData>>({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    description: '',
    images: [],
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    features: [],
    propertyType: 'house',
  })

  const handleGenerate = async () => {
    // TODO: Implement generation logic
    // This will create a one-pager and redirect to /[slug]
    console.log('Generating with template:', templateId, propertyData)
  }

  if (!selectedTemplate) {
    return <div>Template not found</div>
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">Generate One-Pager</h1>
            <p className="text-muted-foreground">
              Template: <span className="font-medium">{selectedTemplate.name}</span>
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>Fill in the details for your property listing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form fields will go here */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={propertyData.address}
                    onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                  />
                </div>
                {/* More form fields... */}
              </div>

              <Button onClick={handleGenerate} className="w-full" size="lg">
                Generate One-Pager
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

