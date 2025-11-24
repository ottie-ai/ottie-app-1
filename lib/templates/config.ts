// Template configurations

import { TemplateConfig } from './types'

export const templates: TemplateConfig[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, modern design with focus on images and key details',
    previewImage: '/templates/modern-minimal-preview.jpg',
    category: 'modern',
    layout: 'hero-focused',
    colorScheme: {
      primary: '#000000',
      secondary: '#666666',
      background: '#FFFFFF',
      text: '#000000',
    },
    features: ['Hero image', 'Key stats', 'Image gallery', 'Contact form'],
  },
  {
    id: 'luxury-elegant',
    name: 'Luxury Elegant',
    description: 'Sophisticated design for high-end properties',
    previewImage: '/templates/luxury-elegant-preview.jpg',
    category: 'luxury',
    layout: 'two-column',
    colorScheme: {
      primary: '#1a1a1a',
      secondary: '#d4af37',
      background: '#f5f5f5',
      text: '#1a1a1a',
    },
    features: ['Full-width hero', 'Detailed specs', 'Virtual tour', 'Testimonials'],
  },
  {
    id: 'classic-traditional',
    name: 'Classic Traditional',
    description: 'Timeless design with traditional real estate layout',
    previewImage: '/templates/classic-traditional-preview.jpg',
    category: 'classic',
    layout: 'single-column',
    colorScheme: {
      primary: '#2c3e50',
      secondary: '#3498db',
      background: '#ffffff',
      text: '#2c3e50',
    },
    features: ['Property details', 'Map location', 'Neighborhood info', 'Schedule viewing'],
  },
  {
    id: 'bold-vibrant',
    name: 'Bold Vibrant',
    description: 'Eye-catching design with bold colors and typography',
    previewImage: '/templates/bold-vibrant-preview.jpg',
    category: 'bold',
    layout: 'grid',
    colorScheme: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      background: '#ffffff',
      text: '#2d3436',
    },
    features: ['Bold typography', 'Color blocks', 'Interactive elements', 'Social sharing'],
  },
]

export function getTemplateById(id: string): TemplateConfig | undefined {
  return templates.find(template => template.id === id)
}

export function getTemplatesByCategory(category: TemplateConfig['category']): TemplateConfig[] {
  return templates.filter(template => template.category === category)
}

