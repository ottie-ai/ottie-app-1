'use client'

import { useState } from 'react'
import { PageTitle } from '@/components/page-title'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SlidersHorizontal, ChevronDown, ExternalLink, Mail, Phone, MapPin, Calendar, Plus, Check } from 'lucide-react'
import { LottieSearchIcon } from '@/components/ui/lottie-search-icon'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Mock data for leads
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
  {
    id: '4',
    name: 'Sarah Connor',
    email: '',
    phone: '+1 555 123 4567',
    property: 'Modern Apartment NYC',
    siteSlug: 'modern-apartment-nyc',
    source: 'WhatsApp',
    date: '2024-01-12 11:20',
    status: 'new',
    message: 'Interested in scheduling a viewing this weekend.',
  },
  {
    id: '5',
    name: 'Michael Brown',
    email: 'michael.b@email.com',
    phone: '',
    property: 'Luxury Villa Palm Beach',
    siteSlug: 'luxury-villa-palm-beach',
    source: 'Contact Form',
    date: '2024-01-11 08:45',
    status: 'contacted',
    message: '',
  },
  {
    id: '6',
    name: 'Anonymous Visitor',
    email: '',
    phone: '',
    property: '21 Maine Street',
    siteSlug: '21-maine-street',
    source: 'Contact Form',
    date: '2024-01-10 15:30',
    status: 'new',
    message: 'Please send me more details about this property.',
  },
]

// Helper function to get site URL
function getSiteUrl(slug: string): string {
  if (typeof window === 'undefined') return '#'
  const hostname = window.location.hostname
  const port = window.location.port
  const protocol = window.location.protocol
  
  // Extract root domain from current hostname
  // If on app.localhost or app.ottie.com, extract root domain
  if (hostname.startsWith('app.')) {
    const rootDomain = hostname.replace('app.', '')
    return `${protocol}//${slug}.${rootDomain}${port ? `:${port}` : ''}`
  }
  
  // Fallback: use current hostname structure
  const rootDomain = hostname.includes('localhost') ? 'localhost' : hostname.split('.').slice(-2).join('.')
  return `${protocol}//${slug}.${rootDomain}${port ? `:${port}` : ''}`
}

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<typeof mockLeads[0] | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [leads, setLeads] = useState(mockLeads)
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    property: '',
    source: '',
    status: 'new',
    message: '',
  })

  const handleRowClick = (lead: typeof mockLeads[0]) => {
    setSelectedLead(lead)
    setIsSheetOpen(true)
  }

  const handleAddLead = () => {
    // TODO: Save to database
    console.log('New lead:', newLead)
    setIsAddDialogOpen(false)
    setNewLead({
      name: '',
      email: '',
      phone: '',
      property: '',
      source: '',
      status: 'new',
      message: '',
    })
  }

  const handleStatusChange = (newStatus: string) => {
    if (!selectedLead) return
    
    const updatedLead = { ...selectedLead, status: newStatus as typeof selectedLead.status }
    setSelectedLead(updatedLead)
    
    // Update in leads array
    setLeads(leads.map(lead => 
      lead.id === selectedLead.id ? updatedLead : lead
    ))
    
    // TODO: Save to database
    console.log('Status updated:', updatedLead)
  }

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Leads" 
        description="View and manage all leads from your property sites."
      />
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Leads</h1>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4" />
          New Lead
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <LottieSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search leads..." 
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Status
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>New</DropdownMenuItem>
                <DropdownMenuItem>Contacted</DropdownMenuItem>
                <DropdownMenuItem>Qualified</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Sort by
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Date (newest)</DropdownMenuItem>
                <DropdownMenuItem>Date (oldest)</DropdownMenuItem>
                <DropdownMenuItem>Name A-Z</DropdownMenuItem>
                <DropdownMenuItem>Name Z-A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow 
                key={lead.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(lead)}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.email || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{lead.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <a
                    href={getSiteUrl(lead.siteSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {lead.property}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      lead.source === 'Contact Form' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                      lead.source === 'WhatsApp' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                      lead.source === 'Phone Call' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                      lead.source === 'Email' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                      !['Contact Form', 'WhatsApp', 'Phone Call', 'Email'].includes(lead.source) && "bg-muted text-muted-foreground"
                    )}
                  >
                    {lead.source}
                  </span>
                </TableCell>
                <TableCell>{lead.date}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1",
                          lead.status === 'new' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:ring-blue-300",
                          lead.status === 'contacted' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:ring-yellow-300",
                          lead.status === 'qualified' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:ring-green-300",
                          !['new', 'contacted', 'qualified'].includes(lead.status) && "bg-muted text-muted-foreground hover:ring-muted"
                        )}
                      >
                        {lead.status}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="start">
                      <div className="grid gap-1">
                        {[
                          { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                          { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
                          { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => {
                              setLeads(leads.map(l => 
                                l.id === lead.id ? { ...l, status: status.value as typeof l.status } : l
                              ))
                            }}
                            className={cn(
                              "flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                              lead.status === status.value && "bg-accent"
                            )}
                          >
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", status.color)}>
                              {status.label}
                            </span>
                            {lead.status === status.value && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>

      {/* Lead Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>
                  Lead details and contact information
                </SheetDescription>
              </SheetHeader>
              
              <div className="grid gap-4 px-4 pb-4">
                {/* Contact Information */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selectedLead.email ? (
                      <a 
                        href={`mailto:${selectedLead.email}`} 
                        className="text-sm hover:underline"
                      >
                        {selectedLead.email}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedLead.phone ? (
                      <a 
                        href={`tel:${selectedLead.phone}`} 
                        className="text-sm hover:underline"
                      >
                        {selectedLead.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={getSiteUrl(selectedLead.siteSlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {selectedLead.property}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedLead.date}</span>
                  </div>
                </div>

                {/* Status & Source */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1",
                          selectedLead.status === 'new' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:ring-blue-300",
                          selectedLead.status === 'contacted' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:ring-yellow-300",
                          selectedLead.status === 'qualified' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:ring-green-300",
                          !['new', 'contacted', 'qualified'].includes(selectedLead.status) && "bg-muted text-muted-foreground hover:ring-muted"
                        )}
                      >
                        {selectedLead.status}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="start">
                      <div className="grid gap-1">
                        {[
                          { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                          { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
                          { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            className={cn(
                              "flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                              selectedLead.status === status.value && "bg-accent"
                            )}
                          >
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", status.color)}>
                              {status.label}
                            </span>
                            {selectedLead.status === status.value && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Badge
                    className={cn(
                      selectedLead.source === 'Contact Form' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                      selectedLead.source === 'WhatsApp' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                      selectedLead.source === 'Phone Call' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                      selectedLead.source === 'Email' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                      !['Contact Form', 'WhatsApp', 'Phone Call', 'Email'].includes(selectedLead.source) && "bg-muted text-muted-foreground"
                    )}
                  >
                    {selectedLead.source}
                  </Badge>
                </div>

                {/* Message */}
                {selectedLead.message && (
                  <div className="grid gap-2">
                    <h4 className="text-sm font-medium">Message</h4>
                    <p className="text-sm text-muted-foreground">{selectedLead.message}</p>
                  </div>
                )}
              </div>
              
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full" onClick={() => {
                  // TODO: Save to database
                  console.log('Save lead:', selectedLead)
                }}>
                  Save
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Lead Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Manually add a new lead to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="property">Property</Label>
              <Input
                id="property"
                value={newLead.property}
                onChange={(e) => setNewLead({ ...newLead, property: e.target.value })}
                placeholder="21 Maine Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={newLead.source}
                  onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contact Form">Contact Form</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newLead.status}
                  onValueChange={(value) => setNewLead({ ...newLead, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={newLead.message}
                onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                placeholder="Add any notes about this lead..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLead} disabled={!newLead.name || !newLead.email}>
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

