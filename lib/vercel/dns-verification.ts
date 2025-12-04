import { Resolver } from 'dns/promises'

/**
 * Verify DNS TXT record for domain verification
 */
export async function verifyDNSTXTRecord(
  domain: string,
  expectedValue: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    const resolver = new Resolver()
    const txtRecordName = `_ottie-verify.${domain}`

    // Resolve TXT records
    const records = await resolver.resolveTxt(txtRecordName)

    // Flatten array of arrays (TXT records can be split across multiple strings)
    const allValues = records.flat().join('')

    // Check if expected value is in any TXT record
    const isVerified = allValues.includes(expectedValue)

    return { verified: isVerified }
  } catch (error: any) {
    // DNS resolution failed - record doesn't exist or DNS error
    if (error?.code === 'ENOTFOUND' || error?.code === 'ENODATA') {
      return { verified: false, error: 'DNS record not found' }
    }
    
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : 'DNS verification failed' 
    }
  }
}

/**
 * Generate verification token
 */
export function generateVerificationToken(): string {
  // Use crypto.randomUUID() if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ottie-${crypto.randomUUID()}`
  }
  
  // Fallback for environments without crypto.randomUUID
  return `ottie-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

