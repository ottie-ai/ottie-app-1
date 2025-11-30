'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { PageTitle } from '@/components/page-title'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Mock data for leads (same as in list page)
const mockLeads = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    property: '21 Maine Street',
    siteSlug: '21-maine-street',
    source: 'Contact Form',
    date: '2024-01-15 14:30',
    status: 'new',
    message: 'I am interested in viewing this property. Please contact me to schedule a tour.',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1 234 567 8901',
    property: 'Luxury Villa Palm Beach',
    siteSlug: 'luxury-villa-palm-beach',
    source: 'WhatsApp',
    date: '2024-01-14 09:15',
    status: 'contacted',
    message: 'Hello, I saw this property online and would like more information.',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1 234 567 8902',
    property: '21 Maine Street',
    siteSlug: '21-maine-street',
    source: 'Phone Call',
    date: '2024-01-13 16:45',
    status: 'qualified',
    message: 'I am ready to make an offer. Please call me back.',
  },
]

// Helper function to get site URL
function getSiteUrl(slug: string): string {
  if (typeof window === 'undefined') return '#'
  const hostname = window.location.hostname
  const port = window.location.port
  const protocol = window.location.protocol
  
  if (hostname.startsWith('app.')) {
    const rootDomain = hostname.replace('app.', '')
    return `${protocol}//${slug}.${rootDomain}${port ? `:${port}` : ''}`
  }
  
  const rootDomain = hostname.includes('localhost') ? 'localhost' : hostname.split('.').slice(-2).join('.')
  return `${protocol}//${slug}.${rootDomain}${port ? `:${port}` : ''}`
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const lead = mockLeads.find(l => l.id === id)

  if (!lead) {
    return (
      <div className="flex flex-col h-full">
        <PageTitle 
          title="Lead Not Found" 
          description="The requested lead could not be found."
        />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Lead Not Found</h1>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Button variant="outline" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Lead Details" 
        description="View and manage lead information."
      />
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leads')}
          className="-ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{lead.name}</h1>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm hover:underline">
                    {lead.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm hover:underline">
                    {lead.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <a
                    href={getSiteUrl(lead.siteSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {lead.property}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-sm">{lead.date}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <Badge
                  className={cn(
                    lead.status === 'new' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                    lead.status === 'contacted' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                    lead.status === 'qualified' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                    !['new', 'contacted', 'qualified'].includes(lead.status) && "bg-muted text-muted-foreground"
                  )}
                >
                  {lead.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Source</p>
                <Badge
                  className={cn(
                    lead.source === 'Contact Form' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                    lead.source === 'WhatsApp' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                    lead.source === 'Phone Call' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                    lead.source === 'Email' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                    !['Contact Form', 'WhatsApp', 'Phone Call', 'Email'].includes(lead.source) && "bg-muted text-muted-foreground"
                  )}
                >
                  {lead.source}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{lead.message}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

