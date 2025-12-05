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
  recommendedIPv4?: string[] | Array<{ rank: number; value: string[] }>
  recommendedCNAME?: string[] | Array<{ rank: number; value: string }>
  nameservers?: string[]
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
 * Sanitize error messages to remove platform-specific references
 * This ensures user-facing errors are generic
 */
function sanitizeErrorMessage(error: string): string {
  return error
    .replace(/Vercel/gi, 'the platform')
    .replace(/vercel\.com/gi, 'the platform')
    .trim()
}

/**
 * Get Vercel API credentials from environment
 */
function getVercelCredentials() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID_OVERRIDE
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token) {
    throw new Error('VERCEL_API_TOKEN is not set. Add it to Vercel environment variables.')
  }

  return { token, projectId, teamId }
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
 * Can optionally add domain with redirect configuration
 */
export async function addVercelDomain(
  domain: string,
  projectId?: string,
  options?: {
    redirect?: string
    redirectStatusCode?: number
  }
): Promise<{ success: true; domain: VercelDomainResponse } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Project ID not found. Please contact support.' }
    }

    // Prepare request body
    const requestBody: {
      name: string
      redirect?: string
      redirectStatusCode?: number
    } = {
      name: domain,
    }

    // Add redirect configuration if provided
    if (options?.redirect) {
      requestBody.redirect = options.redirect
      requestBody.redirectStatusCode = options.redirectStatusCode || 307
      console.log('[Vercel API] Adding domain with redirect:', {
        domain,
        redirect: options.redirect,
        redirectStatusCode: requestBody.redirectStatusCode,
      })
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
        body: JSON.stringify(requestBody),
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

      const errorMessage = error.error?.message || `Failed to add domain: ${response.statusText}`
      return { 
        error: sanitizeErrorMessage(errorMessage)
      }
    }

    return { success: true, domain: data as VercelDomainResponse }
  } catch (error) {
    console.error('[Vercel API] Error adding domain:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error adding domain'
    return { 
      error: sanitizeErrorMessage(errorMessage)
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
      return { error: 'Project ID not found. Please contact support.' }
    }

    // URL encode the domain name to handle special characters like * in wildcard domains
    const encodedDomain = encodeURIComponent(domain)
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${finalProjectId}/domains/${encodedDomain}`,
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
      const errorMessage = data.error?.message || `Failed to remove domain: ${response.statusText}`
      return { 
        error: sanitizeErrorMessage(errorMessage)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Vercel API] Error removing domain:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error removing domain'
    return { 
      error: sanitizeErrorMessage(errorMessage)
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
      return { error: 'Project ID not found. Please contact support.' }
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
        return { error: 'Domain not found' }
      }
      const data = await response.json() as VercelError
      const errorMessage = data.error?.message || `Failed to get domain: ${response.statusText}`
      return { 
        error: sanitizeErrorMessage(errorMessage)
      }
    }

    const data = await response.json() as VercelDomainResponse
    return { success: true, domain: data }
  } catch (error) {
    console.error('[Vercel API] Error getting domain:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error getting domain'
    return { 
      error: sanitizeErrorMessage(errorMessage)
    }
  }
}

/**
 * Get domain DNS configuration from Vercel
 * This returns the recommended DNS records (CNAME/A records) that need to be configured
 */
export async function getVercelDomainConfig(
  domain: string,
  projectId?: string
): Promise<{ success: true; config: VercelDomainConfig } | { error: string }> {
  try {
    const { token, teamId } = getVercelCredentials()

    // v6/domains/{domain}/config is a domain-level endpoint, doesn't require project ID
    // But may require teamId if domain is part of a team
    let url = `https://api.vercel.com/v6/domains/${domain}/config`
    if (teamId) {
      url += `?teamId=${teamId}`
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Vercel API] Error getting domain config for ${domain}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      
      if (response.status === 404) {
        return { error: 'Domain configuration not found. The domain may not be added to your account yet.' }
      }
      
      if (response.status === 403) {
        return { error: 'Access forbidden. Please contact support if you believe this is an error.' }
      }
      
      try {
        const data = await response.json() as VercelError
        const errorMessage = data.error?.message || `Failed to get domain config: ${response.statusText}`
        return { 
          error: sanitizeErrorMessage(errorMessage)
        }
      } catch {
        return { 
          error: sanitizeErrorMessage(`Failed to get domain config: ${response.statusText}`)
        }
      }
    }

    const data = await response.json() as VercelDomainConfig
    console.log(`[Vercel API] Domain config for ${domain}:`, {
      configuredBy: data.configuredBy,
      recommendedIPv4: data.recommendedIPv4,
      aValues: data.aValues,
      cnames: data.cnames,
      nameservers: data.nameservers,
      misconfigured: data.misconfigured,
      fullConfig: JSON.stringify(data, null, 2),
    })
    
    return { success: true, config: data }
  } catch (error) {
    console.error('[Vercel API] Error getting domain config:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error getting domain config'
    return { 
      error: sanitizeErrorMessage(errorMessage)
    }
  }
}

/**
 * Update domain redirect configuration
 * Sets a domain to redirect to another domain with specified status code
 */
export async function updateVercelDomainRedirect(
  domain: string,
  redirectTo: string,
  redirectStatusCode: number = 307,
  projectId?: string
): Promise<{ success: true; domain: VercelDomainResponse } | { error: string }> {
  try {
    const { token } = getVercelCredentials()
    const finalProjectId = projectId || await getProjectId()

    if (!finalProjectId) {
      return { error: 'Project ID not found. Please contact support.' }
    }

    // URL encode the domain name to handle special characters
    const encodedDomain = encodeURIComponent(domain)
    
    // Use v9 API endpoint as per Vercel documentation
    // https://vercel.com/docs/rest-api/reference/endpoints/projects/update-a-project-domain
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${finalProjectId}/domains/${encodedDomain}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirect: redirectTo,
          redirectStatusCode: redirectStatusCode,
        }),
      }
    )

    // Check response status before parsing JSON
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Failed to update domain redirect: ${response.statusText}`
      
      try {
        const errorData = JSON.parse(errorText) as VercelError
        errorMessage = errorData.error?.message || errorMessage
      } catch {
        // If JSON parsing fails, use the error text
        errorMessage = errorText || errorMessage
      }
      
      console.error('[Vercel API] Redirect update failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        domain,
        redirectTo,
      })
      
      return { 
        error: sanitizeErrorMessage(errorMessage)
      }
    }

    const data = await response.json() as VercelDomainResponse
    console.log('[Vercel API] Successfully set redirect:', {
      domain,
      redirectTo,
      redirectStatusCode,
      domainResponse: data,
    })

    return { success: true, domain: data }
  } catch (error) {
    console.error('[Vercel API] Error updating domain redirect:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating domain redirect'
    return { 
      error: sanitizeErrorMessage(errorMessage)
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
      return { error: 'Project ID not found. Please contact support.' }
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
      const errorMessage = data.error?.message || `Failed to list domains: ${response.statusText}`
      return { 
        error: sanitizeErrorMessage(errorMessage)
      }
    }

    const data = await response.json()
    return { success: true, domains: data.domains || [] }
  } catch (error) {
    console.error('[Vercel API] Error listing domains:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error listing domains'
    return { 
      error: sanitizeErrorMessage(errorMessage)
    }
  }
}

