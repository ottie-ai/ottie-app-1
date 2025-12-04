/**
 * Vercel Domain API Integration
 * Automaticky pridáva/odstraňuje custom domény v Vercel projekte
 */

interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  redirect?: string | null
  redirectStatusCode?: number | null
  gitBranch?: string | null
  updatedAt?: number
  createdAt?: number
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
}

interface VercelDomainConfig {
  configuredBy?: string | null
  acceptedChallenges?: string[]
  misconfigured: boolean
  serviceType?: string
  cnames?: string[]
  aValues?: string[]
  conflicts?: Array<{
    name: string
    type: string
    value: string
  }>
}

interface VercelError {
  error: {
    code: string
    message: string
  }
}

/**
 * Get Vercel API credentials from environment
 */
function getVercelCredentials() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID_OVERRIDE

  if (!token) {
    throw new Error('VERCEL_API_TOKEN is not set. Add it to Vercel environment variables.')
  }

  return { token, projectId }
}

/**
 * Get Vercel project ID automatically (if not set in env)
 * Vercel poskytuje VERCEL env variable v production
 */
async function getProjectId(): Promise<string | null> {
  const { projectId } = getVercelCredentials()
  
  if (projectId) {
    return projectId
  }

  // Vercel automaticky poskytuje VERCEL=1 a ďalšie env variables
  // Môžeš použiť VERCEL_URL alebo zistiť project ID cez API
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    // Extract project name from URL
    // napr. ottie-app-1.vercel.app -> ottie-app-1
    const projectName = vercelUrl.split('.')[0]
    
    // Get project ID by name
    try {
      const { token } = getVercelCredentials()
      const response = await fetch('https://api.vercel.com/v9/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const projects = await response.json()
        const project = projects.projects?.find((p: any) => p.name === projectName)
        return project?.id || null
      }
    } catch (error) {
      console.error('[Vercel API] Error fetching project ID:', error)
    }
  }

  return null
}

/**
 * Add domain to Vercel project
 */
export async function addVercelDomain(
  domain: string,
  projectId?: string
): Promise<{ success: true; domain: VercelDomainResponse } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Vercel Project ID not found. Set VERCEL_PROJECT_ID environment variable.' }
    }

    // Add domain to Vercel project
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${finalProjectId}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const error = data as VercelError
      
      // Domain už existuje - to je OK
      if (error.error?.code === 'domain_already_in_use' || error.error?.code === 'domain_already_added') {
        // Skús získať existujúcu doménu
        const existingDomain = await getVercelDomain(domain, finalProjectId)
        if (!('error' in existingDomain)) {
          return { success: true, domain: existingDomain.domain }
        }
      }

      return { 
        error: error.error?.message || `Failed to add domain: ${response.statusText}` 
      }
    }

    return { success: true, domain: data as VercelDomainResponse }
  } catch (error) {
    console.error('[Vercel API] Error adding domain:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error adding domain' 
    }
  }
}

/**
 * Remove domain from Vercel project
 */
export async function removeVercelDomain(
  domain: string,
  projectId?: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Vercel Project ID not found' }
    }

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${finalProjectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      // 404 je OK - domain už neexistuje
      if (response.status === 404) {
        return { success: true }
      }

      const data = await response.json() as VercelError
      return { 
        error: data.error?.message || `Failed to remove domain: ${response.statusText}` 
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Vercel API] Error removing domain:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error removing domain' 
    }
  }
}

/**
 * Get domain status from Vercel
 */
export async function getVercelDomain(
  domain: string,
  projectId?: string
): Promise<{ success: true; domain: VercelDomainResponse } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Vercel Project ID not found' }
    }

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${finalProjectId}/domains/${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Domain not found in Vercel project' }
      }
      const data = await response.json() as VercelError
      return { 
        error: data.error?.message || `Failed to get domain: ${response.statusText}` 
      }
    }

    const data = await response.json() as VercelDomainResponse
    return { success: true, domain: data }
  } catch (error) {
    console.error('[Vercel API] Error getting domain:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error getting domain' 
    }
  }
}

/**
 * List all domains in Vercel project
 */
export async function listVercelDomains(
  projectId?: string
): Promise<{ success: true; domains: VercelDomainResponse[] } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Vercel Project ID not found' }
    }

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${finalProjectId}/domains`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const data = await response.json() as VercelError
      return { 
        error: data.error?.message || `Failed to list domains: ${response.statusText}` 
      }
    }

    const data = await response.json()
    return { success: true, domains: data.domains || [] }
  } catch (error) {
    console.error('[Vercel API] Error listing domains:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error listing domains' 
    }
  }
}

