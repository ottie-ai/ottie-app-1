# Vercel Environment Variables Required

## Critical Environment Variables for Stripe Integration

Add these environment variables in your Vercel project settings:
**Project Settings → Environment Variables**

### Supabase Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=sb_secret_...  # ⚠️ REQUIRED FOR WEBHOOKS (Admin/Service Role Key)
```

### Stripe Variables (Sandbox/Test Mode)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs for each plan (Test Mode)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_GROWTH_MONTHLY=price_...
STRIPE_PRICE_GROWTH_ANNUAL=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_AGENCY_ANNUAL=price_...
```

### Other Required Variables
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## How to Get These Values

### 1. Supabase Secret Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy the `service_role` key (starts with `sb_secret_...`) (⚠️ Keep this secret!)
5. Add it as `SUPABASE_SECRET_KEY` in Vercel

### 2. Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Go to **Developers → API Keys**
4. Copy:
   - **Secret key** (starts with `sk_test_`)
   - **Publishable key** (starts with `pk_test_`)

### 3. Stripe Webhook Secret
1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. After creating, copy the **Signing secret** (starts with `whsec_`)

### 4. Stripe Price IDs
1. In Stripe Dashboard, go to **Products**
2. Create 3 products:
   - **Starter** (with monthly and annual prices)
   - **Growth** (with monthly and annual prices)
   - **Agency** (with monthly and annual prices)
3. For each price, copy the Price ID (starts with `price_`)

---

## Adding to Vercel

### Option 1: Via Vercel Dashboard
1. Go to your project on [Vercel](https://vercel.com)
2. Go to **Settings → Environment Variables**
3. Add each variable one by one
4. Select environments: **Production**, **Preview**, **Development**
5. Click **Save**

### Option 2: Via Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Link your project
vercel link

# Add environment variables
vercel env add SUPABASE_SECRET_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
# ... etc
```

### Option 3: Pull from Vercel (if already set)
```bash
vercel env pull .env.local
```

---

## Verification

After adding all variables, redeploy your project:

```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

Or in Vercel Dashboard:
**Deployments → ... → Redeploy**

---

## Security Notes

⚠️ **NEVER commit these values to Git**
- Keep `.env.local` in `.gitignore`
- Only share service role keys with trusted team members
- Use test mode keys for development
- Switch to live mode keys only when ready for production

✅ **Secret Key is Required**
The `SUPABASE_SECRET_KEY` (service role key) is essential for webhook handlers because they need to bypass Row Level Security (RLS) to update workspace subscriptions.

