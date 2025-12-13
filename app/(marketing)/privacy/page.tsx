import type { Metadata } from 'next'
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import Navbar from "@/components/marketing/navbar"

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Ottie - Real Estate Client Portal Generator. Learn how we protect your data and privacy.',
}

export default function Privacy() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--dark-bg)] text-white">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Link 
                  href="/"
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Back to homepage"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </Link>
                <Typography variant="h1" className="mb-0">
                  Ottie - Privacy Policy
                </Typography>
              </div>
              <Typography variant="muted" className="text-white/70">
                <strong>Effective Date:</strong> January 1, 2025<br />
                <strong>Last Updated:</strong> December 10, 2025
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 1 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                1. Introduction and Scope
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie Group LLC ("Ottie", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy ("Policy") explains how we collect, use, disclose, and safeguard your information when you use our Software-as-a-Service (SaaS) platform (the "Service" or "Platform"), including our website, property listing generator, client portal tools, and related services.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                By using the Service, you agree to the collection and use of information in accordance with this Policy. If you do not agree with our policies and practices, please do not use the Service.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                1.1 Definitions
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>"Personal Data"</strong> means any information that can identify you directly or indirectly, such as your name, email address, IP address, or property details.</li>
                <li><strong>"User Content"</strong> means all content you upload, create, or input into the Platform, including property listings, images, descriptions, and contact information.</li>
                <li><strong>"Service Data"</strong> means technical data we collect automatically, such as usage patterns, device information, and log files.</li>
                <li><strong>"Data Controller"</strong> means Ottie, which determines the purposes and means of processing your Personal Data.</li>
                <li><strong>"Data Processor"</strong> means third-party service providers that process data on our behalf (e.g., hosting providers, analytics services).</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 2 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                2. Information We Collect
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                2.1 Information You Provide Directly
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We collect information that you voluntarily provide when you:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Create an Account:</strong> Name, email address, password (hashed), phone number (optional), business name, and billing information</li>
                <li><strong>Use Property Listing Features:</strong> Property addresses, descriptions, images, pricing information, property specifications (bedrooms, bathrooms, square footage), contact information, and marketing materials</li>
                <li><strong>Import Content via URL:</strong> Content extracted from third-party URLs you provide (text, images, property data)</li>
                <li><strong>Contact Support:</strong> Support tickets, messages, feedback, and any information you include in communications with us</li>
                <li><strong>Manage Leads:</strong> Lead contact information (names, email addresses, phone numbers) that you import or enter into the Platform</li>
                <li><strong>Use Marketing Tools:</strong> Email campaign content, recipient lists, and marketing preferences</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                2.2 Automatically Collected Information
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                When you use the Service, we automatically collect certain technical information:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Device Information:</strong> Device type, operating system, browser type and version, screen resolution, and device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, click patterns, search queries, and interaction with the Platform</li>
                <li><strong>Log Data:</strong> IP address, access times, error logs, and request/response data</li>
                <li><strong>Location Data:</strong> General location information derived from IP address (country, region, city level, not precise GPS coordinates)</li>
                <li><strong>Cookies and Tracking Technologies:</strong> See Section 7 for detailed information about cookies</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                2.3 Information from Third-Party Sources
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We may receive information about you from:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Authentication Providers:</strong> If you sign in using OAuth (e.g., Google, Microsoft), we receive basic profile information</li>
                <li><strong>Payment Processors:</strong> Billing information and transaction details (we do not store full credit card numbers)</li>
                <li><strong>URL Import Feature:</strong> Content extracted from third-party websites you authorize us to access</li>
                <li><strong>Integrated Services:</strong> If you connect third-party services (CRM, email providers), we may receive data from those services</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 3 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                3. How We Use Your Information
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                3.1 Primary Uses
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We use your information to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Provide and Operate the Service:</strong> Create and host property listing sites, generate marketing materials, manage client portals, and deliver all Platform features</li>
                <li><strong>Process Transactions:</strong> Process payments, manage subscriptions, send invoices, and handle billing inquiries</li>
                <li><strong>Communicate with You:</strong> Send account notifications, service updates, support responses, and important policy changes</li>
                <li><strong>Improve the Platform:</strong> Analyze usage patterns, identify bugs, optimize performance, and develop new features</li>
                <li><strong>Ensure Security:</strong> Detect and prevent fraud, unauthorized access, abuse, and security threats</li>
                <li><strong>Comply with Legal Obligations:</strong> Respond to legal requests, enforce our Terms of Service, and comply with applicable laws</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                3.2 Marketing and Promotional Communications
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>We do NOT sell your Personal Data to third parties for marketing purposes.</strong> We may send you marketing emails about Ottie features, updates, or promotions if you have opted in. You can unsubscribe at any time using the link in our emails or by contacting us.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                3.3 Aggregated and De-identified Data
              </Typography>
              <Typography variant="p" className="text-white/80">
                We may aggregate and de-identify your data (remove personally identifiable information) to create anonymized statistics, analytics, and insights. This aggregated data cannot be used to identify you and may be used for research, product improvement, or shared with partners for industry analysis.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 4 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                4. Data Sharing and Disclosure
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                4.1 Service Providers (Data Processors)
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We share your information with trusted third-party service providers who perform services on our behalf:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Hosting and Infrastructure:</strong> Vercel (hosting), Supabase (database and authentication), and cloud storage providers</li>
                <li><strong>Payment Processing:</strong> Stripe or other payment processors (we do not store full credit card numbers)</li>
                <li><strong>Analytics:</strong> Service usage analytics to improve the Platform (we use privacy-focused analytics that minimize data collection)</li>
                <li><strong>Email Services:</strong> Transactional and marketing email delivery services</li>
                <li><strong>Content Delivery:</strong> CDN providers for fast content delivery</li>
                <li><strong>Scraping Services:</strong> Firecrawl, Apify, or similar services when you use the URL import feature</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                These service providers are contractually obligated to protect your data and use it only for the purposes we specify. They are not permitted to sell or use your data for their own marketing purposes.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                4.2 Public Property Listings
              </Typography>
              <Typography variant="p" className="text-white/80">
                When you publish a property listing site, the content you choose to make public (property details, images, descriptions) is accessible to anyone with the direct link. You control what information is included in your public listings. We do not index or display your listings in public directories without your explicit consent.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                4.3 Legal Requirements and Protection
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We may disclose your information if required by law or to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Comply with subpoenas, court orders, or legal processes</li>
                <li>Respond to government requests or regulatory inquiries</li>
                <li>Enforce our Terms of Service or protect our rights</li>
                <li>Prevent fraud, security threats, or illegal activity</li>
                <li>Protect the safety of users or the public</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                4.4 Business Transfers
              </Typography>
              <Typography variant="p" className="text-white/80">
                If Ottie is involved in a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control of your Personal Data.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                4.5 With Your Consent
              </Typography>
              <Typography variant="p" className="text-white/80">
                We may share your information with third parties when you explicitly consent to such sharing, such as when you authorize integrations with third-party services (CRM platforms, email marketing tools).
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 5 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                5. Data Security
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                5.1 Security Measures
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We implement industry-standard security measures to protect your information:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Encryption:</strong> Data in transit is encrypted using TLS/SSL. Sensitive data at rest is encrypted</li>
                <li><strong>Access Controls:</strong> Role-based access controls limit employee access to Personal Data on a need-to-know basis</li>
                <li><strong>Authentication:</strong> Secure password hashing (bcrypt) and optional two-factor authentication (2FA)</li>
                <li><strong>Regular Security Audits:</strong> We conduct security assessments and vulnerability scans</li>
                <li><strong>Secure Infrastructure:</strong> Our hosting providers (Vercel, Supabase) maintain SOC 2 Type II compliance and industry-standard security certifications</li>
                <li><strong>Incident Response:</strong> We have procedures in place to detect, respond to, and notify users of security breaches</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                5.2 Data Breach Notification
              </Typography>
              <Typography variant="p" className="text-white/80">
                In the event of a data breach that poses a risk to your Personal Data, we will notify affected users and relevant authorities as required by applicable law (e.g., within 72 hours under GDPR). Notifications will include information about the nature of the breach, data affected, and steps we are taking to address it.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                5.3 Your Responsibility
              </Typography>
              <Typography variant="p" className="text-white/80">
                While we implement strong security measures, no method of transmission over the internet or electronic storage is 100% secure. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please use strong, unique passwords and enable two-factor authentication when available.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 6 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                6. Your Privacy Rights
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                6.1 General Rights
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Depending on your location, you may have the following rights regarding your Personal Data:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Access:</strong> Request a copy of the Personal Data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your Personal Data (subject to legal retention requirements)</li>
                <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> Object to processing of your data for certain purposes (e.g., direct marketing)</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                6.2 GDPR Rights (European Union, UK, EEA)
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you are located in the European Union, United Kingdom, or European Economic Area, you have additional rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with your local data protection authority. To exercise your GDPR rights, contact us at <Link href="mailto:dpo@ottie.com" className="text-white/90 underline hover:text-white">dpo@ottie.com</Link>.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                6.3 CCPA Rights (California)
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA), including the right to know what Personal Data we collect, the right to delete Personal Data, the right to opt-out of the sale of Personal Data (we do not sell your data), and the right to non-discrimination. To exercise your CCPA rights, contact us at <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link>.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                6.4 How to Exercise Your Rights
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                To exercise any of these rights:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Log into your account and use the account settings to update or delete information</li>
                <li>Email us at <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link> with your request</li>
                <li>For GDPR requests, contact our Data Protection Officer at <Link href="mailto:dpo@ottie.com" className="text-white/90 underline hover:text-white">dpo@ottie.com</Link></li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                We will respond to your request within 30 days (or as required by applicable law). We may need to verify your identity before processing certain requests.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 7 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                7. Cookies and Tracking Technologies
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                7.1 Types of Cookies We Use
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We use the following types of cookies and similar technologies:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                7.1.1 Essential Cookies
              </Typography>
              <Typography variant="p" className="text-white/80">
                Required for the Platform to function. These include authentication cookies, session management, and security features. You cannot opt-out of essential cookies.
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                7.1.2 Analytics Cookies
              </Typography>
              <Typography variant="p" className="text-white/80">
                Help us understand how users interact with the Platform (page views, feature usage, error rates). We use privacy-focused analytics that minimize data collection and do not track individuals across websites.
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                7.1.3 Functional Cookies
              </Typography>
              <Typography variant="p" className="text-white/80">
                Remember your preferences (language, theme, settings) to enhance your experience.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                7.2 Third-Party Cookies
              </Typography>
              <Typography variant="p" className="text-white/80">
                We do not use third-party advertising cookies or tracking pixels for marketing purposes. Third-party cookies may be set by our service providers (e.g., payment processors, hosting providers) for essential functionality.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                7.3 Managing Cookies
              </Typography>
              <Typography variant="p" className="text-white/80">
                You can control cookies through your browser settings. Most browsers allow you to refuse or delete cookies. Note that disabling cookies may limit your ability to use certain features of the Platform.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 8 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                8. Data Retention
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                8.1 Retention Periods
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                We retain your Personal Data for as long as necessary to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Provide the Service to you</li>
                <li>Comply with legal obligations (e.g., tax records, legal holds)</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Maintain security and prevent fraud</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                8.2 Account Deletion
              </Typography>
              <Typography variant="p" className="text-white/80">
                When you delete your account, we will delete or anonymize your Personal Data within 30 days, except where we are required to retain data by law (e.g., for tax purposes, legal holds, or dispute resolution). Backups may retain data for up to 90 days before permanent deletion.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                8.3 Public Content
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you have published property listings that are publicly accessible, we may retain cached or archived versions for a limited period after account deletion to ensure continuity of public links, unless you request immediate removal.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 9 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                9. International Data Transfers
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                9.1 Data Processing Locations
              </Typography>
              <Typography variant="p" className="text-white/80">
                Your information may be processed and stored in the United States, European Union, or other countries where our service providers operate. By using the Service, you consent to the transfer of your information to these locations.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                9.2 Adequate Safeguards
              </Typography>
              <Typography variant="p" className="text-white/80">
                When transferring data from the EU/UK to the US or other countries, we rely on appropriate safeguards, including Standard Contractual Clauses (SCCs) approved by the European Commission, and ensure our service providers maintain adequate data protection standards.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 10 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                10. Children's Privacy
              </Typography>
              <Typography variant="p" className="text-white/80">
                The Service is intended for professional users aged 18 or older. We do not knowingly collect Personal Data from children under 18. If you believe we have inadvertently collected information from a child, please contact us immediately at <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link>, and we will delete such information promptly.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 11 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                11. Third-Party Links and Services
              </Typography>
              <Typography variant="p" className="text-white/80">
                The Service may contain links to third-party websites or integrate with third-party services (CRM platforms, email providers, payment processors). This Privacy Policy does not apply to third-party websites or services. We encourage you to review the privacy policies of any third-party services you use. We are not responsible for the privacy practices of third parties.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 12 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                12. Do Not Track Signals
              </Typography>
              <Typography variant="p" className="text-white/80">
                Some browsers include a "Do Not Track" (DNT) feature that signals websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted. We do not respond to DNT signals at this time, but we limit tracking and data collection as described in this Policy.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 13 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                13. Changes to This Privacy Policy
              </Typography>
              <Typography variant="p" className="text-white/80">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other reasons. We will notify you of material changes by:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Posting the updated Policy on this page with a new "Last Updated" date</li>
                <li>Sending an email notification to the email address associated with your account</li>
                <li>Displaying a prominent notice on the Platform</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                Your continued use of the Service after the effective date of the updated Policy constitutes your acceptance of the changes. We encourage you to review this Policy periodically.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 14 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                14. Contact Us
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </Typography>
              <div className="ml-4 space-y-2 text-white/80">
                <Typography variant="p">
                  <strong>Ottie Privacy Team</strong><br />
                  Email: <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link><br />
                  Website: <Link href="https://www.ottie.com" className="text-white/90 underline hover:text-white">www.ottie.com</Link>
                </Typography>
                <Typography variant="p" className="mt-4">
                  <strong>Data Protection Officer (GDPR Inquiries)</strong><br />
                  Email: <Link href="mailto:dpo@ottie.com" className="text-white/90 underline hover:text-white">dpo@ottie.com</Link>
                </Typography>
                <Typography variant="p" className="mt-4">
                  <strong>General Support</strong><br />
                  Email: <Link href="mailto:support@ottie.com" className="text-white/90 underline hover:text-white">support@ottie.com</Link>
                </Typography>
              </div>
            </div>

            <hr className="border-white/10" />

            {/* Back Button */}
            <div className="flex justify-center mt-12 pt-8 border-t border-white/10">
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
