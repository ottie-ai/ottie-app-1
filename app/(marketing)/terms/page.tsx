import type { Metadata } from 'next'
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import Navbar from "@/components/marketing/navbar"

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Ottie - Real Estate Client Portal Generator. Read our terms and conditions.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#08000d] text-white">
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
                  Ottie - Terms of Service
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
              <Typography variant="h2" className="mt-8 mb-4">
                1. Acceptance of Terms
              </Typography>
              <Typography variant="p" className="text-white/80">
                By accessing and using the Ottie platform (the "Service"), including all features, functions, and tools (the "Platform"), you ("User" or "you") accept and agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all additional terms incorporated by reference. If you do not agree to these Terms, you may not use the Service.
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                1.1 Modifications to Terms
              </Typography>
              <Typography variant="p" className="text-white/80">
                We reserve the right to modify these Terms at any time. Modifications become effective upon posting to the Platform. Your continued use of the Service after any modification constitutes your acceptance of the modified Terms. We will provide notice of material changes via email or prominent notification on the Platform.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                1.2 Eligibility
              </Typography>
              <Typography variant="p" className="text-white/80">
                You represent and warrant that you are at least 18 years old and have the legal capacity to enter into this agreement. If you are using the Service on behalf of a business entity, you represent that you have authority to bind that entity to these Terms.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 2 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                2. Description of Service
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie is a Software-as-a-Service (SaaS) platform designed to assist real estate professionals, property managers, and related businesses in creating and managing property marketing materials and client communications. The Service includes, but is not limited to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Property One-Pager Generator:</strong> Automated or assisted creation of single-page property marketing documents</li>
                <li><strong>Web-Based Property Sites:</strong> Generation of standalone websites for property listings</li>
                <li><strong>Lead Management System:</strong> Tools for capturing, organizing, and tracking prospective client inquiries</li>
                <li><strong>URL Import Tool:</strong> Optional feature allowing users to import content from third-party URLs (may include real estate listing portals)</li>
                <li><strong>Content Creation Assistance:</strong> Future features including marketing flyers, social media images, client portals, and additional marketing materials</li>
                <li><strong>Email and Marketing Automation:</strong> Tools for sending marketing campaigns and communications</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-4">
                The Service is provided "AS IS" and "AS AVAILABLE." We do not guarantee uninterrupted operation, error-free functionality, or specific results from use of the Platform.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 3 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                3. User Accounts and Responsibilities
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                3.1 Account Registration
              </Typography>
              <Typography variant="p" className="text-white/80">
                To use the Service, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your login credentials and are liable for all activity that occurs under your account.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                3.2 Prohibited Account Behavior
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                You agree not to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Share your account credentials with unauthorized third parties</li>
                <li>Create accounts for the purpose of violating these Terms or circumventing restrictions</li>
                <li>Use the Service through automated means (bots, scripts, crawlers) to access your own or others' accounts, except as explicitly provided by the Platform's documented APIs</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                3.3 Account Termination
              </Typography>
              <Typography variant="p" className="text-white/80">
                We reserve the right to suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity, or otherwise pose a risk to the Service or other users. Termination may occur without notice in cases of severe violations.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 4 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                4. User-Generated Content and Intellectual Property Rights
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                4.1 Ownership of User Content
              </Typography>
              <Typography variant="p" className="text-white/80">
                All content that you upload, create, or input into the Ottie Platform ("User Content") remains your exclusive property. You retain all intellectual property rights to your User Content.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>You grant Ottie a non-exclusive, worldwide, royalty-free license to:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Host, store, and display your User Content to deliver the Service</li>
                <li>Create backup copies for data security and disaster recovery</li>
                <li>Use de-identified, aggregated data for improving the Platform and analytics (without attribution or personally identifiable information)</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                This license is limited to the duration of your use of the Service and terminates upon account deletion or cancellation of your subscription.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                4.2 Ottie Intellectual Property
              </Typography>
              <Typography variant="p" className="text-white/80">
                All intellectual property in the Platform itself—including but not limited to the software code, design, layout, graphics, logos, text, and underlying algorithms—is owned exclusively by Ottie or our licensors. You receive a limited, non-exclusive, non-transferable license to use the Platform solely in accordance with these Terms.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2 mb-2">
                You agree not to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Platform</li>
                <li>Copy, modify, or create derivative works based on the Platform</li>
                <li>Rent, lease, or resell access to the Platform</li>
                <li>Use the Platform to develop competing services</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                4.3 Feedback and Suggestions
              </Typography>
              <Typography variant="p" className="text-white/80">
                Any feedback, suggestions, ideas, or improvements you provide regarding the Platform ("Feedback") may be used by Ottie without restriction or compensation to you. We may incorporate Feedback into future versions of the Service.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 5 - URL Import */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                5. URL Import and Web Scraping Acknowledgment
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                5.1 General URL Import Disclaimer
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie provides an optional feature that allows users to paste URLs and import content (text, images, property data) from third-party websites. <strong>This feature is intended solely for users importing content from websites they own, manage, or have explicit authorization to access.</strong>
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                5.2 User Responsibility for Third-Party Content
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>You acknowledge and agree that:</strong>
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                You are solely responsible for ensuring that:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>You own the content on the URL you submit for import, OR</li>
                <li>You have obtained explicit written permission from the rightful owner(s) to extract and repurpose that content, OR</li>
                <li>Your use of the imported content complies with the terms of service, privacy policies, and intellectual property rights of the source website</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Ottie does not verify ownership or authorization.</strong> We assume that any URL you submit for import meets the above criteria.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                5.3 Prohibited Uses of Import Feature
              </Typography>
              <Typography variant="p" className="text-white/80">
                You explicitly agree NOT to use the URL import feature to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Import copyrighted content from third-party websites without authorization</li>
                <li>Scrape or extract data from competitors' websites for competitive intelligence</li>
                <li>Bypass authentication, paywalls, or access restrictions on any website</li>
                <li>Violate the Terms of Service, Acceptable Use Policies, or intellectual property rights of any third-party platform</li>
                <li>Circumvent anti-scraping technologies, CAPTCHAs, or rate-limiting mechanisms (Ottie may use proxy services that you acknowledge)</li>
                <li>Extract personal data (email addresses, phone numbers, names) from any source without proper consent</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                5.4 Indemnification for URL Import Violations
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>You agree to indemnify, defend, and hold harmless Ottie, its owners, employees, agents, and successors from any claims, damages, liabilities, costs, or expenses (including reasonable attorney's fees) arising from:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Your use of the URL import feature in violation of this Section 5</li>
                <li>Your use of imported content in violation of third-party intellectual property rights</li>
                <li>Any allegation that content you imported violates the Terms of Service of the source website</li>
                <li>Any cease-and-desist notice, legal action, or claim directed at Ottie arising from your import of content</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                This indemnification applies regardless of whether Ottie had knowledge of the violation.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                5.5 Content Attribution
              </Typography>
              <Typography variant="p" className="text-white/80">
                When importing content, you are responsible for ensuring proper attribution to the original source. If the original content is protected by copyright or other intellectual property rights, and you use that content on a generated website, you must include:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Clear attribution to the original source</li>
                <li>Links back to the original listing (if applicable)</li>
                <li>Appropriate copyright notices</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Ottie does not provide legal advice on proper attribution or fair use.</strong>
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 6 - Acceptable Use */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                6. Acceptable Use Policy
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                6.1 Prohibited Activities
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                You agree not to use the Service for any of the following purposes:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.1.1 Illegal Activities
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Violating any local, state, national, or international law or regulation</li>
                <li>Facilitating, promoting, or engaging in fraud, money laundering, or other financial crimes</li>
                <li>Creating or distributing spam, malware, ransomware, or other malicious code</li>
                <li>Sending unsolicited mass emails or participating in email phishing schemes</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.1.2 Harassment and Abuse
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Sending threatening, harassing, abusive, defamatory, obscene, or sexually explicit content</li>
                <li>Impersonating any person or entity</li>
                <li>Doxing, stalking, or harassing any individual</li>
                <li>Discriminating against individuals based on protected characteristics (race, ethnicity, religion, gender, sexual orientation, disability, national origin)</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.1.3 Data Privacy Violations
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Collecting or transmitting personal data without explicit consent</li>
                <li>Processing health information, financial information, or government-issued IDs without proper authorization</li>
                <li>Violating GDPR, CCPA, CASL, CAN-SPAM, or similar data protection and privacy regulations</li>
                <li>Harvesting email addresses, phone numbers, or other personally identifiable information for unauthorized purposes</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.1.4 Content Misuse
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Uploading or distributing sexually explicit content involving minors</li>
                <li>Distributing content that violates intellectual property rights, including copyrighted images or text</li>
                <li>Creating misleading or fraudulent property listings</li>
                <li>Using the Service to generate counterfeit or unauthorized real estate documents</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.1.5 Attempted Circumvention
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Attempting to reverse engineer, hack, or gain unauthorized access to Ottie systems</li>
                <li>Using multiple accounts to circumvent usage limits or feature restrictions</li>
                <li>Attempting to bypass payment systems or access premium features without proper subscription</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                6.2 CAN-SPAM and Email Compliance
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you use Ottie's email marketing or communication features, you agree to comply with all applicable email marketing laws, including the CAN-SPAM Act (in the U.S.) and CASL (in Canada). Specifically:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Accurate Sender Information:</strong> Your emails must clearly identify you as the sender with accurate contact information</li>
                <li><strong>Clear Subject Lines:</strong> Subject lines must accurately describe the email content</li>
                <li><strong>Commercial Email Labeling:</strong> Clearly mark promotional or marketing emails as such unless you have express consent</li>
                <li><strong>Unsubscribe Mechanism:</strong> Provide a clear, functional unsubscribe option in every marketing email</li>
                <li><strong>Opt-Out Honor:</strong> Process unsubscribe requests within 10 business days and honor them within 30 days</li>
                <li><strong>Physical Address:</strong> Include your valid physical business address in all commercial emails</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                Violation of email marketing laws may result in account termination and potential legal liability for which you are solely responsible.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                6.3 GDPR and International Data Protection
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you use the Service to process personal data of individuals in the European Union, UK, or other GDPR-jurisdictions, you agree to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Obtain explicit consent before collecting or processing personal data</li>
                <li>Provide clear privacy notices disclosing how data is used</li>
                <li>Respect data subject rights (access, deletion, portability)</li>
                <li>Implement appropriate security measures</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                Ottie may act as a Data Processor for your processing activities. For Data Processing Terms, refer to our separate Data Processing Addendum (DPA), which is incorporated into these Terms.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                6.4 Lead Management and Contact Data
              </Typography>
              <Typography variant="p" className="text-white/80">
                If you import or manage lead contact information within Ottie:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>You warrant that you have the right to contact these individuals</li>
                <li>You agree not to engage in harassment, spam, or unauthorized marketing</li>
                <li>You must honor unsubscribe and opt-out requests</li>
                <li>You will not sell, share, or transfer lead data without explicit consent</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 7 - Content Generation */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                7. Content Generation and Liability
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                7.1 AI-Generated and Assisted Content
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie may use artificial intelligence and machine learning to assist in content generation, including property descriptions, marketing copy, and image suggestions. <strong>You acknowledge that:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>AI-generated content may contain errors, inaccuracies, or biases</li>
                <li>You are responsible for reviewing, verifying, and approving all AI-generated content before publication</li>
                <li>Ottie does not guarantee the accuracy, legality, or appropriateness of AI-generated content</li>
                <li>You assume full responsibility for any AI-generated content you publish or distribute</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                7.2 Accuracy of Property Information
              </Typography>
              <Typography variant="p" className="text-white/80">
                When generating property one-pagers or websites, you are solely responsible for:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Accuracy of property details (address, price, square footage, bedrooms, bathrooms)</li>
                <li>Accuracy of property descriptions and claims</li>
                <li>Compliance with fair housing laws (no discriminatory language)</li>
                <li>Disclosure of material facts and defects as required by law</li>
                <li>Proper authorization to represent and market the property</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                7.3 Limitation on Marketing Claims
              </Typography>
              <Typography variant="p" className="text-white/80">
                You agree not to make false, misleading, or exaggerated claims in any marketing materials generated via Ottie, including:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>False pricing claims ("Lowest Price in Area" without factual basis)</li>
                <li>Unsubstantiated health or safety claims</li>
                <li>False scarcity claims ("Only 1 Left!" when false)</li>
                <li>Testimonials or endorsements that are not genuine</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                You are responsible for substantiating any marketing claims in accordance with FTC guidelines and state consumer protection laws.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 8 - Third Party Services */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                8. Third-Party Services and Integrations
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                8.1 Third-Party Integrations
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie may integrate with or allow connections to third-party services (CRM platforms, email providers, payment processors, APIs). Your use of these integrations is subject to the third-party service's terms of service.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Ottie is not responsible for:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Availability, accuracy, or functionality of third-party services</li>
                <li>Data breaches, privacy violations, or service interruptions caused by third parties</li>
                <li>Your compliance with third-party terms or policies</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                8.2 Data Sharing with Third Parties
              </Typography>
              <Typography variant="p" className="text-white/80">
                When you authorize integrations, you grant permission for Ottie to share necessary data with third-party service providers to enable functionality. You are responsible for reviewing and accepting third-party privacy policies.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 9 - Limitation of Liability */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                9. Limitation of Liability and Warranties
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                9.1 Disclaimer of Warranties
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</strong>
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                OTTIE DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Merchantability or fitness for a particular purpose</li>
                <li>Non-infringement of third-party intellectual property rights</li>
                <li>Uninterrupted, error-free, or secure operation of the Platform</li>
                <li>Accuracy, completeness, or reliability of content</li>
                <li>Compatibility with your hardware or software</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                9.2 Limitation of Liability
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, OTTIE SHALL NOT BE LIABLE FOR:</strong>
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Direct, Indirect, or Consequential Damages:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Loss of revenue, profits, data, business opportunity, or anticipated savings</li>
                <li>Reputational harm, emotional distress, or punitive damages</li>
                <li>Loss of use or unavailability of the Platform</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Your Sole Remedy:</strong>
              </Typography>
              <Typography variant="p" className="text-white/80">
                Your exclusive remedy for any claim relating to the Service shall be limited to the fees you paid in the 12 months preceding the claim, or $100, whichever is greater. This limitation applies even if Ottie has been advised of the possibility of such damages.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                9.3 Exceptions to Limitation of Liability
              </Typography>
              <Typography variant="p" className="text-white/80">
                The above limitation does NOT apply to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Death or personal injury caused by negligence</li>
                <li>Fraud or willful misconduct by Ottie</li>
                <li>Indemnification obligations under Section 10</li>
                <li>Breaches of confidentiality</li>
                <li>Infringement of intellectual property rights by Ottie</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                9.4 Aggregation of Liability
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie's total cumulative liability for all claims arising from or related to the Service shall not exceed the fees paid by you in the 12 months preceding the first claim.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 10 - Indemnification */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                10. Indemnification
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                10.1 User Indemnification of Ottie
              </Typography>
              <Typography variant="p" className="text-white/80">
                You agree to indemnify, defend with counsel acceptable to Ottie, and hold harmless Ottie, its owners, employees, agents, and affiliates from and against any claims, damages, liabilities, costs, and expenses (including reasonable attorney's fees) arising from or related to:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.1 Intellectual Property Claims
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Any allegation that your User Content or use of imported content infringes or violates third-party intellectual property rights (copyright, trademark, patent, trade secret)</li>
                <li>Any action by a third party alleging unauthorized use of their content in property listings or marketing materials you created via Ottie</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.2 Privacy and Data Protection Claims
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Violations of privacy laws (GDPR, CCPA, CASL, CAN-SPAM) caused by your use of the Service</li>
                <li>Unauthorized collection, processing, or transmission of personal data by you</li>
                <li>Breach of third-party privacy rights or data protection regulations</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.3 Legal Compliance
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Violation of fair housing laws in your property marketing</li>
                <li>Violation of consumer protection laws or regulations</li>
                <li>Misrepresentation or fraud in property listings or marketing materials</li>
                <li>Failure to comply with third-party terms of service (e.g., Zillow, Realtor.com, Redfin)</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.4 URL Import Violations
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Your use of the URL import feature to extract content from websites you do not own or have authorization to access</li>
                <li>Cease-and-desist notices, legal claims, or actions directed at Ottie arising from your import or use of third-party content</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.5 Third-Party Claims
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Any claim by a third party alleging your use of Ottie violates their rights or obligations</li>
                <li>Damages, settlements, or judgments imposed on Ottie as a result of your actions</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                10.2 Conditions of Indemnification
              </Typography>
              <Typography variant="p" className="text-white/80">
                Your indemnification obligation is conditioned upon:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Ottie promptly notifying you in writing of the claim</li>
                <li>You having sole control of the defense and settlement (provided settlements do not impose obligations on Ottie without its consent)</li>
                <li>Ottie providing reasonable cooperation in the defense</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                10.3 Ottie's Limited Indemnification
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie will indemnify you from claims that the Ottie Platform itself (not your User Content or imported content) infringes third-party intellectual property rights, provided you:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Promptly notify Ottie of the claim</li>
                <li>Grant Ottie sole control of the defense and settlement</li>
                <li>Provide reasonable cooperation</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 11 - Data Protection */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                11. Data Protection and Privacy
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                11.1 Data Processing
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie processes your data in accordance with our Privacy Policy (available at <Link href="https://www.ottie.com" className="text-white/90 underline hover:text-white">www.ottie.com</Link>). By using the Service, you consent to our data processing practices.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                11.2 Data Security
              </Typography>
              <Typography variant="p" className="text-white/80">
                While Ottie implements industry-standard security measures, we cannot guarantee absolute security. You acknowledge the inherent risks of data transmission over the internet.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                11.3 Data Retention and Deletion
              </Typography>
              <Typography variant="p" className="text-white/80">
                Upon account cancellation or deletion, we will delete your User Content within 30 days, except where required to retain data by law or for legitimate business purposes (backups, legal holds).
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                11.4 Subpoenas and Legal Requests
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie may disclose your data in response to lawful subpoenas, court orders, or government requests as required by law.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 12 - Payment */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                12. Payment Terms and Billing
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                12.1 Pricing and Billing
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Plans and pricing are listed on the Ottie website and subject to change upon 30 days' notice</li>
                <li>Billing occurs on a monthly or annual basis depending on your selected plan</li>
                <li>All fees are exclusive of applicable sales tax, VAT, or similar taxes, which you are responsible for paying</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                12.2 Payment Methods
              </Typography>
              <Typography variant="p" className="text-white/80">
                You agree to provide accurate billing information and authorize Ottie to charge your payment method for subscription fees.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                12.3 Failed Payments
              </Typography>
              <Typography variant="p" className="text-white/80">
                If a payment fails, we will attempt to retry. If payment continues to fail after 3 retry attempts, your account may be suspended or terminated.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                12.4 Refund Policy
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Monthly subscriptions: No refunds for partial months. Cancellation takes effect at the end of the current billing period.</li>
                <li>Annual subscriptions: Refunds are not available except where required by law.</li>
                <li>If we materially breach these Terms, you may cancel and receive a pro-rata refund for the unused portion.</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                12.5 Subscription Cancellation
              </Typography>
              <Typography variant="p" className="text-white/80">
                You may cancel your subscription at any time via your account settings. Cancellation takes effect at the end of the current billing period unless otherwise specified.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 13 - Service Availability */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                13. Service Availability and Maintenance
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                13.1 Uptime and Service Level
              </Typography>
              <Typography variant="p" className="text-white/80">
                While we strive to maintain 99% uptime, Ottie does not guarantee uninterrupted service. We are not liable for:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Scheduled maintenance (which we will attempt to announce in advance)</li>
                <li>Unscheduled outages due to technical issues, infrastructure failures, or force majeure events</li>
                <li>Third-party service failures</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                13.2 Planned Maintenance
              </Typography>
              <Typography variant="p" className="text-white/80">
                We will attempt to schedule maintenance during non-business hours and provide 48-hour notice when possible.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 14 - Export Controls */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                14. Export Controls and Sanctions
              </Typography>
              <Typography variant="p" className="text-white/80">
                You agree not to use the Service in violation of U.S. export control laws, including the Export Administration Regulations (EAR) and International Traffic in Arms Regulations (ITAR). The Service is not available to individuals or entities located in countries subject to U.S. sanctions, including Cuba, Iran, North Korea, Syria, and the Crimea region.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 15 - Dispute Resolution */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                15. Dispute Resolution
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                15.1 Governing Law
              </Typography>
              <Typography variant="p" className="text-white/80">
                These Terms are governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any legal action or proceeding arising under these Terms shall be exclusively brought in the state or federal courts located in Delaware, and you consent to the jurisdiction of such courts.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                15.2 Arbitration (Optional - Customize Based on Preference)
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>[OPTION A - Arbitration Clause]</strong>
              </Typography>
              <Typography variant="p" className="text-white/80">
                Any disputes arising out of or relating to these Terms shall be resolved by binding arbitration administered by JAMS under its Comprehensive Arbitration and Mediation Services Rules & Procedures. The arbitration shall be conducted in Wilmington, Delaware, before a single arbitrator. Each party bears its own costs, and the arbitrator's fee is split equally. The arbitration award may be entered as a judgment in any court of competent jurisdiction.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>[OPTION B - Litigation Clause]</strong>
              </Typography>
              <Typography variant="p" className="text-white/80">
                You and Ottie consent to the exclusive jurisdiction and venue of the state and federal courts located in Delaware for resolution of any disputes.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                15.3 Class Action Waiver
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>You waive the right to participate in any class action, class arbitration, or representative action against Ottie.</strong> Disputes must be brought on an individual basis.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                15.4 Informal Resolution
              </Typography>
              <Typography variant="p" className="text-white/80">
                Before initiating arbitration or litigation, you agree to attempt to resolve any dispute through informal negotiation. You must provide Ottie with written notice (email to <Link href="mailto:legal@ottie.com" className="text-white/90 underline hover:text-white">legal@ottie.com</Link>) describing the dispute, and we will attempt to resolve it within 30 days.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 16 - Export Compliance */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                16. Export Compliance and Sanctions
              </Typography>
              <Typography variant="p" className="text-white/80">
                The Service may not be accessed, used, or exported by or to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Any individual or entity located in a country subject to U.S. economic sanctions</li>
                <li>Any individual or entity listed on the U.S. Treasury Department's Office of Foreign Assets Control (OFAC) list</li>
                <li>Any individual or entity that violates export control laws</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                You represent that neither you nor your organization is subject to any such restrictions.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 17 - Termination */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                17. Termination
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                17.1 Termination by You
              </Typography>
              <Typography variant="p" className="text-white/80">
                You may terminate your account and these Terms at any time by logging into your account and selecting "Delete Account" or by emailing <Link href="mailto:support@ottie.com" className="text-white/90 underline hover:text-white">support@ottie.com</Link>.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                17.2 Termination by Ottie
              </Typography>
              <Typography variant="p" className="text-white/80">
                Ottie may terminate your account and these Terms immediately, without notice, if:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>You violate any material provision of these Terms</li>
                <li>You engage in illegal activity or fraud</li>
                <li>You violate third-party intellectual property rights</li>
                <li>You violate data protection or privacy laws</li>
                <li>You harass or abuse other users or Ottie staff</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                17.3 Effects of Termination
              </Typography>
              <Typography variant="p" className="text-white/80">
                Upon termination:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Your account and User Content will be deactivated</li>
                <li>We will delete your data within 30 days, except as required by law</li>
                <li>You remain liable for any fees incurred prior to termination</li>
                <li>Provisions that survive termination include Indemnification, Limitation of Liability, Dispute Resolution, and Confidentiality</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 18 - Severability */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                18. Severability
              </Typography>
              <Typography variant="p" className="text-white/80">
                If any provision of these Terms is found to be invalid, illegal, or unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable, or if such modification is not possible, the provision shall be severed. The remaining provisions shall continue in full force and effect.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 19 - Entire Agreement */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                19. Entire Agreement
              </Typography>
              <Typography variant="p" className="text-white/80">
                These Terms, together with our Privacy Policy and any additional terms posted on the Platform, constitute the entire agreement between you and Ottie regarding the Service and supersede all prior negotiations, representations, and agreements, whether written or oral.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 20 - Contact */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                20. Contact Information
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>For questions about these Terms, please contact:</strong>
              </Typography>
              <div className="ml-4 space-y-2 text-white/80">
                <Typography variant="p">
                  <strong>Ottie Support</strong><br />
                  Email: <Link href="mailto:legal@ottie.com" className="text-white/90 underline hover:text-white">legal@ottie.com</Link><br />
                  Website: <Link href="https://www.ottie.com" className="text-white/90 underline hover:text-white">www.ottie.com</Link>
                </Typography>
                <Typography variant="p" className="mt-4">
                  <strong>For GDPR-related inquiries:</strong><br />
                  Data Protection Officer: <Link href="mailto:dpo@ottie.com" className="text-white/90 underline hover:text-white">dpo@ottie.com</Link>
                </Typography>
              </div>
            </div>

            <hr className="border-white/10" />

            {/* Schedules */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4">
                Schedules and Attachments
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Schedule A:</strong> Data Processing Addendum (DPA) - for GDPR compliance</li>
                <li><strong>Schedule B:</strong> Acceptable Use Policy (detailed)</li>
                <li><strong>Schedule C:</strong> Service Level Agreement (SLA) - optional for enterprise customers</li>
              </ul>
            </div>

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
