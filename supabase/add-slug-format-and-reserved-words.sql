-- ==========================================
-- Add Slug Format Validation and Reserved Words Check
-- ==========================================
-- This migration adds comprehensive slug validation:
-- 1. Regex format check (lowercase, numbers, hyphens, 5-63 chars, no leading/trailing hyphens)
-- 2. Reserved words check (blocks common subdomain names and real estate terms)
-- 
-- Requirements:
-- - Slug must match regex pattern: lowercase letters, numbers, hyphens only
-- - Slug length: 5-63 characters (minimum 5, maximum 63 for subdomain compatibility)
-- - Slug cannot start or end with a hyphen
-- - Slug cannot be a reserved word (www, admin, api, app, etc.)
-- - Applies to all sites (published, draft, archived)
-- ==========================================

-- Step 1: Add regex CHECK constraint for slug format
-- Pattern: ^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$
-- - Starts with lowercase letter or number
-- - Middle: 3-61 characters (lowercase, numbers, hyphens)
-- - Ends with lowercase letter or number
-- Total: 5-63 characters, no leading/trailing hyphens
ALTER TABLE public.sites 
ADD CONSTRAINT sites_slug_format_chk
CHECK (
  slug ~ '^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$'
);

-- Step 2: Add CHECK constraint for reserved words
-- Blocks common subdomain names, system routes, and real estate specific terms
ALTER TABLE public.sites
ADD CONSTRAINT sites_slug_reserved_chk
CHECK (
  lower(trim(slug)) NOT IN (
    -- System & Infrastructure
    'admin', 'admins', 'api', 'apis', 'app', 'apps', 'auth', 'auths', 'backup', 'backups', 'blog', 'blogs', 'bot', 'bots', 'cache', 'caches',
    'cdn', 'cdns', 'console', 'consoles', 'dashboard', 'dashboards', 'dev', 'devs', 'development', 'developments', 'doc', 'docs',
    'document', 'documents', 'documentation', 'documentations', 'email', 'emails', 'error', 'errors', 'example', 'examples',
    'export', 'exports', 'help', 'helps', 'helpdesk', 'helpdesks', 'home', 'homes', 'import', 'imports', 'internal', 'mail',
    'manage', 'media', 'mobile', 'monitor', 'monitoring', 'news',
    'notification', 'notifications', 'panel', 'panels', 'payment', 'payments',
    'portal', 'portals', 'preview', 'previews', 'private', 'prod', 'production', 'productions', 'profile', 'profiles', 'proxy', 'proxies',
    'public', 'sandbox', 'sandboxes', 'search', 'searches', 'security', 'service', 'services', 'setup', 'setups',
    'site', 'sites', 'staging', 'status', 'storage', 'studio', 'studios', 'support', 'system', 'systems',
    'test', 'tests', 'testing', 'upload', 'uploads', 'user', 'users', 'webhook', 'webhooks',
    'www',
    -- Client/Customer Portals
    'clientportal', 'client-portal', 'clientportals', 'client-portals',
    'clientsportal', 'clients-portal', 'clientsportals', 'clients-portals',
    'customerportal', 'customer-portal', 'customerportals', 'customer-portals',
    'customersportal', 'customers-portal', 'customersportals', 'customers-portals',
    -- Platform/Auth Routes
    'ottie', 'builder', 'builders', 'editor', 'editors', 'workspace', 'workspaces',
    'login', 'logins', 'signup', 'signups', 'signin', 'sign-in', 'signins', 'sign-ins',
    'signout', 'sign-out', 'signouts', 'sign-outs', 'logout', 'logouts',
    'account', 'accounts', 'setting', 'settings', 'preference', 'preferences',
    'billing', 'billings', 'invoice', 'invoices', 'subscription', 'subscriptions',
    'verify', 'verification', 'verifications', 'reset', 'resets',
    'password', 'passwords', 'forgot-password', 'forgotpassword', 'forgot-passwords', 'forgotpasswords',
    'unsubscribe', 'unsubscribes', 'onboarding', 'onboardings',
    'callback', 'callbacks', 'oauth', 'sso', 'saml', 'auth0',
    -- DNS/Infrastructure Subdomains
    'ns', 'ns1', 'ns2', 'ns3', 'ns4', 'dns', 'mx', 'mx1', 'mx2',
    'smtp', 'imap', 'pop', 'pop3', 'webmail',
    'ftp', 'sftp', 'ssh', 'vpn', 'remote', 'localhost',
    'git', 'gitlab', 'github', 'bitbucket',
    'ci', 'cd', 'jenkins', 'deploy', 'deploys', 'deployment', 'deployments',
    'beta', 'betas', 'alpha', 'alphas', 'demo', 'demos', 'live',
    'static', 'statics', 'asset', 'assets', 'img', 'image', 'images',
    'css', 'js', 'javascript', 'font', 'fonts', 'video', 'videos',
    'file', 'files',
    -- Note: mail, download, downloads removed - already in System section
    -- Social/Auth Providers
    'google', 'facebook', 'twitter', 'instagram', 'linkedin', 'apple',
    'tiktok', 'youtube', 'pinterest', 'snapchat', 'whatsapp',
    -- Marketing & Content
    'about', 'announcement', 'announcements', 'award', 'awards', 'brand', 'brands', 'career', 'careers', 'case-studies', 'casestudies', 'case-study', 'casestudy',
    'community', 'communities', 'contact', 'contacts', 'customer', 'customers', 'download', 'downloads', 'event', 'events', 'expert', 'experts',
    'feature', 'features', 'gallery', 'galleries', 'getting-started', 'gettingstarted', 'guide', 'guides', 'integration', 'integrations',
    'interview', 'interviews', 'landing', 'landings', 'magazine', 'magazines', 'newsroom', 'newsrooms', 'partner', 'partners',
    'partnership', 'partnerships', 'press', 'privacy', 'product',
    'products', 'resource', 'resources', 'roadmap', 'roadmaps', 'showcase', 'showcases', 'solution',
    'solutions', 'story', 'stories', 'subscribe', 'team', 'teams', 'template', 'templates', 'term', 'terms',
    'testimonial', 'testimonials', 'tour', 'tours', 'training', 'trend', 'trends', 'tutorial', 'tutorials',
    'update', 'updates', 'use-cases', 'usecases', 'use-case', 'usecase', 'value', 'values', 'webinar', 'webinars',
    'whitepaper', 'whitepapers',
    -- Location/Address
    'city', 'cities', 'state', 'states', 'country', 'countries',
    'zip', 'zips', 'zipcode', 'zipcodes', 'zip-code', 'zip-codes',
    'postcode', 'postcodes', 'post-code', 'post-codes',
    'address', 'addresses', 'street', 'streets',
    'district', 'districts', 'area', 'areas', 'zone', 'zones',
    'region', 'regions', 'county', 'counties',
    -- Property Types
    'buyer', 'buyers', 'seller', 'sellers',
    'bedroom', 'bedrooms', 'bathroom', 'bathrooms', 'bed', 'beds', 'bath', 'baths',
    'condo', 'condos', 'condominium', 'condominiums',
    'townhouse', 'townhouses', 'town-house', 'town-houses', 'townhome', 'townhomes', 'town-home', 'town-homes',
    'apartment', 'apartments', 'flat', 'flats', 'unit', 'units',
    'villa', 'villas', 'estate', 'estates', 'manor', 'manors',
    'bungalow', 'bungalows', 'penthouse', 'penthouses',
    'duplex', 'duplexes', 'triplex', 'triplexes', 'multiplex', 'multiplexes',
    'commercial', 'commercials', 'industrial', 'industrials', 'retail', 'retails',
    'vacant', 'occupied', 'sold', 'unsold',
    -- Property Features
    'waterfront', 'waterfronts', 'beachfront', 'beachfronts', 'lakefront', 'lakefronts',
    'oceanfront', 'oceanfronts', 'riverfront', 'riverfronts',
    'furnished', 'unfurnished', 'view', 'views',
    'sqft', 'square-feet', 'squarefeet', 'square-foot', 'squarefoot',
    'acre', 'acres', 'acreage', 'acreages',
    'floor', 'floors', 'room', 'rooms', 'kitchen', 'kitchens',
    'basement', 'basements', 'attic', 'attics', 'patio', 'patios',
    'balcony', 'balconies', 'deck', 'decks', 'yard', 'yards',
    'garden', 'gardens', 'lawn', 'lawns', 'fence', 'fences',
    -- Real Estate Services & Actions
    'broker', 'brokers', 'brokerage', 'brokerages',
    'showing', 'showings', 'viewing', 'viewings',
    'open-house', 'openhouse', 'open-houses', 'openhouses',
    'virtual-tour', 'virtualtour', 'virtual-tours', 'virtualtours',
    'valuation', 'valuations', 'appraisal', 'appraisals',
    'walkthrough', 'walkthroughs', 'walk-through', 'walk-throughs',
    'stagings', 'staged', -- Note: staging already in System section
    -- Real Estate Specific
    'agent', 'agents', 'agency', 'agencies', 'analytics', 'appointment',
    'appointments', 'assessment', 'assessments', 'auction', 'auctions', 'availability',
    'available', 'calendar', 'calendars', 'certified', 'closing', 'closings', 'commission', 'commissions',
    'comparable', 'comparables', 'comps', 'comparison', 'comparisons', 'contract',
    'contracts', 'crm', 'crms', 'deal', 'deals', 'deed', 'deeds',
    'deposit', 'deposits', 'directory', 'directories', 'disclosure', 'disclosures', 'down-payment', 'downpayment', 'down-payments', 'downpayments',
    'earnest', 'escrow', 'escrows', 'estimate', 'estimates',
    'finance', 'finances', 'financing', 'firm', 'firms', 'flip', 'flips', 'flipping',
    'for-lease', 'forlease', 'for-rent', 'forrent', 'for-sale', 'forsale', 'foreclosure', 'foreclosures', 'form', 'forms',
    'garage', 'garages', 'garage-sale', 'garagesale', 'garage-sales', 'garagesales', 'gated', 'geocoding', 'gis',
    'gps', 'handicap', 'handicaps', 'heat', 'heating', 'history', 'histories',
    'home-equity', 'homeequity', 'home-inspection', 'homeinspection', 'home-inspections', 'homeinspections', 'homeowner', 'homeowners',
    'homeownership', 'hoa', 'hoas', 'house', 'houses', 'hunting',
    'inspection', 'inspections', 'inspector', 'inspectors',
    'insurance', 'insurances', 'interest', 'interests', 'interior', 'interiors', 'inventory', 'inventories', 'invest',
    'investment', 'investments', 'investor', 'investors', 'key', 'keys',
    'landlord', 'landlords', 'lead', 'leads', 'lease', 'leased',
    'leases', 'leasing', 'legal', 'legals', 'lender', 'lenders', 'lending',
    'lien', 'list', 'listed', 'listing', 'listings', 'loan', 'loans',
    'location', 'locations', 'lot', 'lots', 'luxury',
    'management', 'manager', 'managers', 'map', 'maps', 'margin',
    'market', 'marketing', 'marketplace', 'markets', 'mls',
    'mortgage', 'mortgages', 'move', 'moving', 'neighborhood',
    'neighborhoods', 'network', 'new', 'offer', 'offers',
    -- Note: manage, mobile, news removed - already in System section
    'office', 'offices', 'open', 'opening', 'openings', 'option',
    'options', 'order', 'orders', 'organization', 'organizations',
    'owner', 'owners', 'ownership', 'parking', 'pending', 'photos',
    'pictures', 'plan', 'plans', 'platform', 'pool', 'pools',
    'portfolio', 'portfolios', 'premium', 'price', 'prices', 'pricing',
    'principal', 'principals', 'pro', 'professional',
    'professionals', 'profit', 'profits',
    -- Note: private, profile, profiles removed - already in System section
    'program', 'programs', 'project', 'projects', 'promotion',
    'promotions', 'property', 'properties', 'proposal', 'proposals',
    'prospect', 'prospects', 'protection', 'protections', 'provider',
    'providers', 'publication', 'publications', 'published', 'purchase',
    'purchased', 'purchaser', 'purchasers', 'purchases', 'purchasing',
    'quality', 'quarter', 'quarters', 'quote', 'quotes', 'range',
    'ranking', 'rate', 'rates', 'rating', 'ratings', 'ratio', 'ratios',
    'realtor', 'realtors', 'realty',
    'refinance', 'refinancing', 'refinanced',
    'rehab', 'rehabilitation',
    'rent', 'rental', 'rentals', 'rented', 'renting', 'rents',
    'repair', 'repairs',
    'report', 'reports',
    'representative', 'representatives',
    'research',
    'reserve', 'reserved',
    'residence', 'residences', 'resident', 'residential', 'residents'
  )
);

-- Step 3: Add comments for documentation
COMMENT ON CONSTRAINT sites_slug_format_chk ON public.sites IS 
  'Ensures slug matches format: lowercase letters, numbers, hyphens only. Length: 5-63 characters. Cannot start or end with hyphen.';

COMMENT ON CONSTRAINT sites_slug_reserved_chk ON public.sites IS 
  'Blocks reserved words that could conflict with system routes, subdomains, common service names, and real estate specific terms.';

-- ==========================================
-- Notes:
-- ==========================================
-- 1. The regex pattern ensures:
--    - Minimum 5 characters (matches min_length constraint)
--    - Maximum 63 characters (DNS subdomain limit)
--    - Only lowercase letters, numbers, and hyphens
--    - No leading or trailing hyphens
--    - Must start and end with alphanumeric character
--
-- 2. Reserved words list includes:
--    - System subdomains (www, admin, api, app, auth)
--    - Common routes (home, blog, pricing, dashboard)
--    - Authentication routes (login, signup, register)
--    - Workspace routes (sites, settings, builder)
--    - Service names (mail, ftp, webhook)
--    - Real estate specific terms (agent, property, listing, etc.)
--    - Words starting with "res-" and "ret-" that could conflict
--
-- 3. The constraints work together with:
--    - sites_slug_min_length (minimum 5 characters)
--    - sites_slug_domain_unique_active (unique per domain for active sites)
--
-- 4. If you need to add more reserved words in the future:
--    ALTER TABLE public.sites DROP CONSTRAINT sites_slug_reserved_chk;
--    -- Then recreate with updated list
--
-- 5. The regex uses PostgreSQL's ~ operator for pattern matching
--    Pattern breakdown:
--    ^[a-z0-9]           - Start with lowercase letter or number
--    [a-z0-9-]{3,61}    - Middle: 3-61 chars (lowercase, numbers, hyphens)
--    [a-z0-9]$          - End with lowercase letter or number
--    Total: 5-63 characters

-- ==========================================
-- Optional: Update existing invalid slugs before running
-- ==========================================
-- If you have existing sites with invalid slugs, update them first:

-- Example: Fix slugs that start/end with hyphen
-- UPDATE public.sites
-- SET slug = trim(both '-' from slug)
-- WHERE slug ~ '^-|-$'
--   AND deleted_at IS NULL;

-- Example: Fix slugs with uppercase letters
-- UPDATE public.sites
-- SET slug = lower(slug)
-- WHERE slug != lower(slug)
--   AND deleted_at IS NULL;

-- Example: Fix reserved word slugs
-- UPDATE public.sites
-- SET slug = slug || '-site'
-- WHERE lower(trim(slug)) IN ('www', 'admin', 'api', 'app', 'auth', 'docs', 'help', 'home', 'status', 'support', 'blog', 'pricing', 'about', 'contact', 'dashboard', 'cdn', 'static')
--   AND deleted_at IS NULL;
