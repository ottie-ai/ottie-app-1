import { stripe, getPriceId, type PlanId, type BillingPeriod } from './index'
import { getOrCreateStripeCustomer } from './customer'

interface CreateCheckoutSessionParams {
  workspaceId: string
  userId: string
  planId: PlanId
  billingPeriod: BillingPeriod
  hasUsedTrial: boolean
}

/**
 * Create a Stripe Checkout Session for a new subscription
 */
export async function createCheckoutSession({
  workspaceId,
  userId,
  planId,
  billingPeriod,
  hasUsedTrial,
}: CreateCheckoutSessionParams): Promise<{ url: string } | { error: string }> {
  // Get or create Stripe customer
  const customerResult = await getOrCreateStripeCustomer(workspaceId, userId)
  if ('error' in customerResult) {
    return customerResult
  }

  const priceId = getPriceId(planId, billingPeriod)

  // Get app origin for redirect URLs
  const getAppOrigin = () => {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const port = process.env.NODE_ENV === 'production' ? '' : ':3000'
    
    if (process.env.NODE_ENV === 'production') {
      return `${protocol}://app.${rootDomain}`
    }
    return `${protocol}://app.localhost${port}`
  }

  const appOrigin = getAppOrigin()

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerResult.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appOrigin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/subscription/cancel`,
      metadata: {
        workspaceId,
        userId,
        planId,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          workspaceId,
          planId,
        },
        // Add trial period for new customers who haven't used trial
        ...((!hasUsedTrial && customerResult.isNew) && {
          trial_period_days: 14,
        }),
      },
      allow_promotion_codes: true,
    })

    return { url: session.url! }
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return { error: 'Failed to create checkout session' }
  }
}

