# Stripe Subscriptions Setup Guide

This guide will help you set up Stripe subscriptions for Ottie.

## 🚀 Quick Start

### 1. Install Dependencies

Dependencies are already installed:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_GROWTH_MONTHLY=price_...
STRIPE_PRICE_GROWTH_ANNUAL=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_AGENCY_ANNUAL=price_...

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Run Database Migrations

Run these SQL migrations in your Supabase SQL Editor:

```bash
# 1. Add Stripe subscription fields
supabase/add-stripe-subscription-id.sql

# 2. Add RLS policies for subscription gating
supabase/add-subscription-rls-policies.sql
```

### 4. Configure Stripe Dashboard

#### Create Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create 3 products:
   - **Starter** - $39/month, $33/month (annual)
   - **Growth** - $99/month, $84/month (annual)
   - **Agency** - $199/month, $169/month (annual)
3. Copy the Price IDs to your `.env.local`

#### Set Up Webhooks

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.pending_update_applied`
   - `customer.subscription.pending_update_expired`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.upcoming`
5. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

#### Configure Customer Portal

1. Go to [Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal)
2. Enable portal
3. Configure allowed actions:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscription
   - ✅ Update subscription (upgrade/downgrade)

## 🔄 Switching Between Test and Live Mode

To switch from test to live mode, simply update your environment variables:

| Variable | Test Mode | Live Mode |
|----------|-----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Test webhook secret | Live webhook secret |
| Price IDs | Test price IDs | Live price IDs |

**Important:** 
- Create separate products and prices in live mode
- Create a new webhook endpoint for live mode
- Test thoroughly in test mode before going live

## 📋 Features Implemented

### ✅ Core Features
- [x] Checkout flow with Stripe Checkout
- [x] 14-day free trial for new customers
- [x] Webhook handling for subscription events
- [x] Customer Portal for subscription management
- [x] Upgrade/downgrade with proration
- [x] Success/cancel pages after checkout

### ✅ Frontend Integration
- [x] Pricing dialog connected to Stripe
- [x] Error handling and loading states
- [x] Manage Subscription button in settings
- [x] Trial support (no credit card required)

### ✅ Backend & Security
- [x] RLS policies for subscription gating
- [x] Webhook signature verification
- [x] Idempotency handling
- [x] Server-side only operations

### ✅ Advanced Features
- [x] Proration for plan changes
- [x] Renewal reminders (invoice.upcoming)
- [x] Grace period for payment failures
- [x] Subscription status tracking

## 🧪 Testing Checklist

### Test Mode Testing

- [ ] **New Subscription**
  - Create new workspace
  - Click "Upgrade" in pricing dialog
  - Complete checkout with test card: `4242 4242 4242 4242`
  - Verify subscription is active
  - Check trial period (14 days)

- [ ] **Upgrade**
  - Upgrade from Starter to Growth
  - Verify proration is applied
  - Check webhook events in Stripe Dashboard

- [ ] **Downgrade**
  - Downgrade from Growth to Starter
  - Verify warnings are shown
  - Check sites are archived if over limit

- [ ] **Payment Failure**
  - Use test card: `4000 0000 0000 0341`
  - Verify grace period is set
  - Check workspace status

- [ ] **Cancellation**
  - Open Customer Portal
  - Cancel subscription
  - Verify workspace reverts to free plan

- [ ] **Customer Portal**
  - Click "Manage Subscription" in settings
  - Verify portal opens
  - Test updating payment method

### Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`
- **Payment fails:** `4000 0000 0000 0341`

## 🔍 Monitoring

### Stripe Dashboard
- [Payments](https://dashboard.stripe.com/test/payments)
- [Subscriptions](https://dashboard.stripe.com/test/subscriptions)
- [Webhooks](https://dashboard.stripe.com/test/webhooks)
- [Logs](https://dashboard.stripe.com/test/logs)

### Application Logs
- Check webhook handler logs in your server logs
- Monitor `console.log` statements for debugging

## 🐛 Troubleshooting

### Webhook not receiving events
1. Check webhook URL is correct
2. Verify webhook secret in `.env.local`
3. Check webhook signature verification
4. View webhook logs in Stripe Dashboard

### Checkout session not creating
1. Verify Price IDs are correct
2. Check Stripe API keys
3. Ensure user has workspace access
4. Check server logs for errors

### Customer Portal not opening
1. Verify `stripe_customer_id` exists in workspace
2. Check portal is enabled in Stripe Dashboard
3. Ensure user is workspace owner

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

## 🎉 You're All Set!

Your Stripe integration is now complete. Test thoroughly in test mode before switching to live mode.

For support, contact: support@getottie.com

