import type { Metadata } from 'next'
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import Navbar from "@/components/marketing/navbar"

export const metadata: Metadata = {
  title: 'Data Processing Addendum',
  description: 'Data Processing Addendum for Ottie - Real Estate Client Portal Generator. Learn how we process your data.',
}

export default function DPAPage() {
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
                  Data Processing Addendum (DPA)
                </Typography>
              </div>
              <Typography variant="muted" className="text-white/70">
                <strong>Effective Date:</strong> January 1, 2025<br />
                <strong>Last Updated:</strong> December 10, 2025
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Preamble */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                Preamble
              </Typography>
              <Typography variant="p" className="text-white/80">
                This Data Processing Addendum ("<strong>DPA</strong>") is entered into between:
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>DATA CONTROLLER:</strong><br />
                The individual or legal entity that engages Ottie to process personal data on its behalf, as identified in the governing Service Agreement (the "<strong>Controller</strong>" or "<strong>You</strong>").
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>DATA PROCESSOR:</strong><br />
                Ottie LLC, a limited liability company located at [Your Business Address] ("<strong>Processor</strong>" or "<strong>We</strong>" or "<strong>Ottie</strong>").
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Collectively referred to as the "Parties".</strong>
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 1 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                1. Purpose and Scope
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                1.1 Applicability
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                This DPA applies when:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Controller uses Ottie's Lead Management, CRM, or related features to collect personal data (names, email addresses, phone numbers, inquiry details) from prospective buyers, renters, or other contacts (the "<strong>Data Subjects</strong>").</li>
                <li>The Controller instructs Ottie to store, organize, manage, and analyze this personal data.</li>
                <li>The Controller may export, integrate, or otherwise use this personal data through Ottie's platform.</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                1.2 Relationship
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                In this scenario:
              </Typography>
              <Typography variant="p" className="text-white/80">
                The <strong>Controller</strong> is responsible for:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Determining what personal data is collected, how it is collected, and for what purpose</li>
                <li>Determining whether to share or export the data to third parties</li>
                <li>Ensuring compliance with data protection laws (GDPR, CCPA, CASL, etc.)</li>
                <li>Obtaining necessary consent or lawful basis for data collection and processing</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                The <strong>Processor (Ottie)</strong> is responsible for:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Storing the personal data securely</li>
                <li>Accessing the data only as instructed by the Controller</li>
                <li>Implementing appropriate security measures</li>
                <li>Assisting the Controller in responding to data subject requests</li>
                <li>Deleting or returning data upon termination of services</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                1.3 Incorporation into Service Agreement
              </Typography>
              <Typography variant="p" className="text-white/80">
                This DPA is incorporated into and forms an integral part of the Service Agreement between the Controller and Processor. In the event of conflict between this DPA and the Service Agreement, this DPA shall take precedence with respect to data processing activities governed by data protection laws.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                1.4 Governed by Data Protection Laws
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                This DPA is intended to comply with:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>GDPR (EU Regulation 2016/679)</strong> - General Data Protection Regulation</li>
                <li><strong>UK GDPR</strong> - United Kingdom data protection laws</li>
                <li><strong>CCPA (California Consumer Privacy Act)</strong> - California privacy law</li>
                <li><strong>CASL (Canada Anti-Spam Legislation)</strong> - Canadian email and data protection</li>
                <li><strong>And other applicable data protection laws</strong></li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 2 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                2. Definitions
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>"Data Subject":</strong> Any natural person (individual) whose personal data is processed, including but not limited to prospective buyers, renters, property inquiries, leads, or contacts.
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>"Personal Data":</strong> Any information relating to an identified or identifiable natural person, including but not limited to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Name, email address, phone number, address</li>
                <li>Property inquiry details and preferences</li>
                <li>Communication history</li>
                <li>Geographic location (if collected)</li>
                <li>Other information that can identify an individual</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2 mb-2">
                <strong>"Processing" / "Process":</strong> Any operation performed on personal data, including collection, storage, organization, retrieval, use, transmission, deletion, or erasure.
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>"Data Protection Law(s)":</strong> Applicable laws and regulations governing the protection of personal data, including GDPR, UK GDPR, CCPA, CASL, and similar laws in the Controller's jurisdiction.
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>"Authorized Instruction":</strong> Written instructions from the Controller to the Processor regarding the Processing of personal data.
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>"Sub-processor":</strong> A third party engaged by the Processor to assist in Processing personal data on behalf of the Controller (e.g., cloud storage, analytics, backup services).
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>"Data Breach":</strong> Unauthorized or unlawful Processing of personal data resulting in accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 3 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                3. Scope of Processing
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                3.1 Processing Activities
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall process personal data only for the following purposes, as instructed by the Controller:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                3.1.1 Lead Management
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Storage and organization of lead data (prospective buyer/renter contact information)</li>
                <li>Segmentation and filtering of leads by property type, location, price range, etc.</li>
                <li>Lead assignment and tracking</li>
                <li>Communication history logging</li>
                <li>Lead scoring and analytics</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                3.1.2 CRM Functions
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Contact management (storing and organizing contact details)</li>
                <li>Interaction tracking (emails, calls, property views)</li>
                <li>Reminder and follow-up management</li>
                <li>Integration with external CRM systems (with Controller authorization)</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                3.1.3 Export and Integration
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Exporting lead data to third-party platforms (HubSpot, Salesforce, email platforms) as authorized by Controller</li>
                <li>API access for authorized third parties</li>
                <li>Backup and recovery operations</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                3.1.4 Platform Analytics and Improvement
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Aggregated analytics on lead metrics (number of leads, conversion rates, engagement metrics)</li>
                <li>Usage analytics for platform optimization</li>
                <li><strong>Note:</strong> This shall not include individual profiling or decision-making without Controller approval</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                3.2 Categories of Data Subjects
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Personal data relates to the following categories of Data Subjects:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Prospective residential property buyers</li>
                <li>Prospective property renters</li>
                <li>Commercial real estate prospects</li>
                <li>Property inquiry respondents</li>
                <li>Any other individuals whose contact information is imported or collected by Controller</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                3.3 Categories of Personal Data
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The types of personal data processed include:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Identifiers (name, email address, phone number, postal address)</li>
                <li>Property interest data (property type, location, price range, preferences)</li>
                <li>Communication data (inquiry messages, call logs, email history)</li>
                <li>Behavioral data (property views, page interactions, engagement metrics)</li>
                <li>Geolocation data (if collected)</li>
                <li>Other data as instructed by Controller</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                3.4 Duration of Processing
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Start Date:</strong> Date of activation of Lead Management features in Controller's account</li>
                <li><strong>End Date:</strong> Upon termination of this DPA or the Service Agreement, whichever is earlier</li>
                <li><strong>Post-Termination:</strong> Data shall be deleted or returned within 30 days of termination (see Section 8)</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 4 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                4. Controller Instructions
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                4.1 Lawful Basis for Processing
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Controller represents and warrants that:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>It has a lawful basis under applicable Data Protection Law to collect and process the personal data (including obtaining consent where required)</li>
                <li>It has provided necessary privacy notices to Data Subjects</li>
                <li>It has not collected personal data unlawfully or in violation of Data Subjects' privacy rights</li>
                <li>All processing instructions comply with Data Protection Laws</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                4.2 Valid Instructions
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall process personal data <strong>only</strong> in accordance with documented instructions from the Controller, which shall be:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Clear and unambiguous</li>
                <li>Communicated in writing (via email, in-app settings, or API configuration)</li>
                <li>Compliant with Data Protection Laws</li>
                <li>Limited to lawful purposes</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                4.3 Unlawful Instructions
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                If the Processor believes that a Controller instruction violates Data Protection Laws, the Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Promptly notify the Controller in writing</li>
                <li>Suspend processing of the instruction pending Controller response (unless prohibited by law)</li>
                <li>Document the objection</li>
                <li>Not execute the instruction if it remains unlawful</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                4.4 Standard Processing Instructions
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Unless the Controller provides contrary written instructions, the Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Store personal data securely with access limited to Controller account users</li>
                <li>Retain personal data until Controller deletion or account termination</li>
                <li>Respond to Data Subject access requests through the Processor</li>
                <li>Maintain audit logs of access and modifications</li>
                <li>Encrypt personal data in transit and at rest</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 5 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                5. Processor Obligations and Security
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                5.1 Confidentiality
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Ensure that all personnel accessing personal data (employees, contractors, agents) are bound by written confidentiality obligations</li>
                <li>Restrict access to personal data only to authorized personnel who need access to provide the Service</li>
                <li>Not disclose personal data to any third party except as permitted in this DPA</li>
                <li>Maintain confidentiality even after termination of employment or engagement</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                5.2 Security Measures (Article 32 GDPR Compliance)
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall implement and maintain appropriate technical and organizational security measures to protect personal data, including:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.2.1 Technical Measures
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Encryption:</strong> TLS/SSL encryption for data in transit; AES-256 encryption for data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access control (RBAC); multi-factor authentication for personnel; strong password requirements</li>
                <li><strong>Firewalls & Network Security:</strong> Network firewalls, intrusion detection systems, DDoS protection</li>
                <li><strong>Database Security:</strong> Secure database configurations, regular security patching, audit logging</li>
                <li><strong>Backup & Recovery:</strong> Regular encrypted backups, tested disaster recovery procedures, redundant storage</li>
                <li><strong>Monitoring:</strong> Real-time monitoring for suspicious activity, automated threat detection</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.2.2 Organizational Measures
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Data Minimization:</strong> Collecting and retaining only necessary personal data</li>
                <li><strong>Purpose Limitation:</strong> Using personal data only for stated purposes</li>
                <li><strong>Access Restrictions:</strong> Limiting access to personnel with need-to-know basis</li>
                <li><strong>Personnel Training:</strong> Regular data protection and security training for all staff</li>
                <li><strong>Incident Response:</strong> Documented procedures for detecting, responding to, and reporting data breaches</li>
                <li><strong>Privacy by Design:</strong> Incorporating data protection principles into product development and operations</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.2.3 Data Location
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Primary data storage: United States (AWS data centers)</li>
                <li>Backup locations: United States (multiple geographic regions)</li>
                <li>The Processor shall not transfer personal data outside the United States without prior written consent from Controller</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.2.4 Security Audits and Certifications
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall conduct regular security audits (at least annually)</li>
                <li>The Processor shall maintain or work toward industry security certifications (e.g., ISO 27001, SOC 2 Type II)</li>
                <li>The Processor shall provide evidence of compliance upon Controller request</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                5.3 Data Integrity and Availability
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Maintain the integrity of personal data (preventing unauthorized alteration)</li>
                <li>Implement version control and change logging for personal data modifications</li>
                <li>Maintain availability of personal data (99% uptime target, excluding scheduled maintenance)</li>
                <li>Provide backups and recovery capabilities</li>
                <li>Test disaster recovery procedures regularly</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                5.4 Sub-Processors
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.4.1 Authorized Sub-Processors
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor uses the following Sub-processors to assist in providing the Service:
              </Typography>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-white/10 text-white/80 text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2 text-left">Sub-Processor</th>
                      <th className="px-4 py-2 text-left">Location</th>
                      <th className="px-4 py-2 text-left">Purpose</th>
                      <th className="px-4 py-2 text-left">Data Protected</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-2"><strong>Amazon Web Services (AWS)</strong></td>
                      <td className="px-4 py-2">United States</td>
                      <td className="px-4 py-2">Cloud hosting, data storage, backup</td>
                      <td className="px-4 py-2">All personal data (encrypted)</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-2"><strong>Stripe / PayPal</strong></td>
                      <td className="px-4 py-2">United States / Various</td>
                      <td className="px-4 py-2">Payment processing</td>
                      <td className="px-4 py-2">Billing data only (not lead data)</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-2"><strong>SendGrid / Resend</strong></td>
                      <td className="px-4 py-2">United States</td>
                      <td className="px-4 py-2">Email delivery (if Controller authorizes email integration)</td>
                      <td className="px-4 py-2">Email addresses, email content metadata</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="px-4 py-2"><strong>Sentry</strong></td>
                      <td className="px-4 py-2">United States</td>
                      <td className="px-4 py-2">Error logging and monitoring</td>
                      <td className="px-4 py-2">Error logs only; anonymized data</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2"><strong>Google Cloud</strong></td>
                      <td className="px-4 py-2">United States</td>
                      <td className="px-4 py-2">Optional analytics (if enabled)</td>
                      <td className="px-4 py-2">Aggregated, anonymized analytics</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.4.2 Notification of Sub-Processor Changes
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall provide the Controller with <strong>at least 30 days' prior written notice</strong> before engaging a new Sub-processor or replacing an existing Sub-processor</li>
                <li>Notice shall include the Sub-processor's name, location, purpose, and data categories processed</li>
                <li>The Controller may object to a new Sub-processor on reasonable data protection grounds</li>
                <li>If the Controller objects, the Processor shall work with the Controller to find an alternative solution or permit the Controller to suspend the Service without penalty</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.4.3 Sub-Processor Agreements
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall ensure all Sub-processors are bound by written data processing agreements (DPA) that:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Impose the same data protection obligations as this DPA</li>
                <li>Restrict Sub-processor use of personal data to the purposes specified</li>
                <li>Include security and confidentiality requirements</li>
                <li>Permit the Sub-processor to engage further Sub-processors only with prior approval</li>
                <li>Include audit rights comparable to those in this DPA</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                5.4.4 Liability
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor remains <strong>fully liable</strong> to the Controller for Sub-processor performance and compliance</li>
                <li>If a Sub-processor breaches its obligations, the Processor shall not be relieved of its liability to the Controller</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 6 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                6. Data Subject Rights and Assistance
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                6.1 Data Subject Rights
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Data Subjects have the following rights under Data Protection Laws (particularly GDPR):
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li><strong>Right of Access:</strong> Access to their personal data</li>
                <li><strong>Right to Rectification:</strong> Correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Deletion of their personal data (Right to Be Forgotten)</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how their data is used</li>
                <li><strong>Right to Data Portability:</strong> Receive their data in machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing</li>
                <li><strong>Rights Related to Automated Decision-Making:</strong> Not be subject to purely automated decisions with legal effects</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                6.2 Processor Assistance
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall assist the Controller in responding to Data Subject requests by:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.1 Access Requests
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Providing the Controller with tools to export or access personal data within the Processor's system</li>
                <li>The Controller is responsible for compiling the complete response, as personal data may exist in multiple systems</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.2 Correction Requests
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Permitting the Controller to correct or update personal data within the Processor's system</li>
                <li>Implementing any corrections instructed by the Controller without undue delay</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.3 Erasure Requests (Right to Be Forgotten)
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Upon documented request from the Controller (verified through appropriate data subject identification), the Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Delete the specified personal data from active systems within 30 days</li>
                <li>Remove personal data from backups within 90 days (or as soon as technically feasible)</li>
                <li>Provide written confirmation of deletion</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Exceptions:</strong> Deletion may be delayed if Data Protection Law permits or requires retention (e.g., tax, accounting, fraud prevention)
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.4 Restriction of Processing
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Upon request from Controller, the Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Stop active processing (though may continue storage)</li>
                <li>Flag data as restricted in audit logs</li>
                <li>Resume processing only upon Controller instruction</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.5 Data Portability
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall provide tools (CSV, JSON export) to enable the Controller to provide personal data to Data Subjects in a structured, commonly used, and machine-readable format</li>
                <li>The Processor shall provide this within 30 days of request</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                6.2.6 Response Timeframe
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall respond to requests for assistance within <strong>10 business days</strong> of Controller request</li>
                <li>The Controller is responsible for meeting Data Subject rights deadlines (typically 30 days under GDPR)</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                6.3 Processor Limitations
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall not independently respond to Data Subject requests</li>
                <li>The Processor shall not engage directly with Data Subjects on behalf of the Controller</li>
                <li>All requests from Data Subjects shall be directed to the Controller</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 7 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                7. Data Protection Impact Assessment (DPIA)
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                7.1 DPIA Assistance
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                If the Controller's use of Ottie's services involves high-risk processing (as determined under GDPR Article 35), the Controller may request that the Processor:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Provide documentation of security measures</li>
                <li>Describe the processing activities and safeguards</li>
                <li>Assist in completing a Data Protection Impact Assessment</li>
              </ul>
              <Typography variant="p" className="text-white/80 mt-2">
                The Processor shall cooperate with the Controller's DPIA requirements within <strong>15 business days</strong> of request.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                7.2 Regulatory Inspections
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall cooperate with:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Data Protection Authority (DPA) inspections and inquiries</li>
                <li>Regulatory audits</li>
                <li>Lawful requests for information from supervisory authorities</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 8 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                8. Data Return and Deletion Upon Termination
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                8.1 Termination Triggers
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                This DPA terminates upon:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Expiration or termination of the Service Agreement</li>
                <li>Deletion of the Controller's account</li>
                <li>Mutual written agreement</li>
                <li>Either party providing notice of termination</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                8.2 Post-Termination Data Handling
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Upon termination, the Processor shall, at the Controller's election:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                Option A: Data Export
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall export all personal data in a structured, commonly used format (CSV, JSON)</li>
                <li>Export shall be completed within <strong>15 business days</strong> of termination request</li>
                <li>The Controller is responsible for downloading the data; the Processor shall not delete data until the Controller confirms receipt</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                Option B: Data Deletion
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall delete all personal data from active systems within <strong>30 days</strong> of termination</li>
                <li>The Processor shall delete personal data from backup systems within <strong>90 days</strong> (or as soon as technically feasible)</li>
                <li>The Processor shall provide written certification of deletion</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                8.3 Legal Retention Exceptions
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Notwithstanding the above, the Processor may retain personal data if:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Required by Data Protection Law or other applicable law</li>
                <li>Necessary for legal defense or dispute resolution</li>
                <li>Necessary for preventing fraud or abuse</li>
                <li>Retention period shall not exceed the minimum required by law</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                8.4 Verification
              </Typography>
              <Typography variant="p" className="text-white/80">
                The Processor shall provide written certification of data deletion or export to the Controller upon request.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 9 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                9. Data Breach Notification
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                9.1 Breach Definition
              </Typography>
              <Typography variant="p" className="text-white/80">
                A "Data Breach" means unauthorized or unlawful Processing of personal data resulting in accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access to personal data.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                9.2 Processor Obligation to Notify
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall notify the Controller <strong>without undue delay and without unreasonable delay (maximum 72 hours)</strong> upon discovering a Data Breach, including:
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                <strong>Information to Include:</strong>
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Nature and scope of the breach</li>
                <li>Categories and approximate number of Data Subjects affected</li>
                <li>Categories and types of personal data affected</li>
                <li>Likely consequences of the breach</li>
                <li>Measures taken or proposed by the Processor to address the breach</li>
                <li>Processor contact point for further information</li>
                <li>Steps the Controller should take to assess and mitigate risks</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                9.3 Investigation
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Promptly investigate the breach and preserve evidence</li>
                <li>Provide the Controller with regular updates on the investigation</li>
                <li>Cooperate fully with the Controller and regulatory authorities</li>
                <li>Document all findings in writing</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                9.4 Cooperation with Regulatory Authorities
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Assist the Controller in notifying supervisory authorities (DPAs) if required</li>
                <li>Assist the Controller in notifying affected Data Subjects</li>
                <li>Respond to regulatory inquiries from DPAs</li>
                <li>Participate in any regulatory investigation</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                9.5 Third-Party Breaches
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                If a Sub-processor or other third party causes a Data Breach, the Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Immediately notify the Controller</li>
                <li>Hold the Sub-processor accountable under the Sub-processor DPA</li>
                <li>Provide the Controller with the Sub-processor's response and remediation plan</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 10 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                10. Audit and Monitoring Rights
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                10.1 Audit Rights
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Controller has the right to:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.1 Information Requests
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Request information about the Processor's data processing, security measures, and compliance</li>
                <li>Obtain responses within <strong>15 business days</strong> of request</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.2 On-Site Audits
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Conduct on-site audits of the Processor's systems and facilities (maximum <strong>once per year</strong> unless required by law)</li>
                <li>Audits must be conducted during normal business hours and with reasonable advance notice</li>
                <li>On-site audits shall not unreasonably interfere with the Processor's business operations</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.3 Third-Party Audits
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Engage third-party auditors or compliance firms to conduct audits on the Controller's behalf</li>
                <li>The Processor shall cooperate with third-party auditors under reasonable confidentiality provisions</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                10.1.4 Certifications
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor shall provide evidence of relevant security certifications (ISO 27001, SOC 2 Type II, etc.) upon request</li>
                <li>Annual recertification or audit reports shall be provided</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                10.2 Audit Scope
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Audits may cover:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Technical security measures (encryption, access controls, firewalls)</li>
                <li>Organizational measures (personnel training, confidentiality agreements)</li>
                <li>Sub-processor compliance</li>
                <li>Data breach incident response procedures</li>
                <li>Data retention and deletion procedures</li>
                <li>Compliance with Data Protection Laws</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                10.3 Audit Costs
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Reasonable audit costs (up to 1 audit per year) are borne by the Controller</li>
                <li>If the Controller requests more than 1 audit per year, the Processor may charge reasonable fees for additional audits</li>
                <li>The Processor shall provide fee estimates in advance</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                10.4 Confidentiality of Audit Findings
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Audit findings shall be treated as confidential</li>
                <li>The Controller may share findings with regulators or supervisory authorities if required</li>
                <li>The Processor may request redaction of proprietary information not directly related to data protection</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 11 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                11. International Data Transfers
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                11.1 Data Location
              </Typography>
              <Typography variant="p" className="text-white/80">
                Personal data is primarily stored in the <strong>United States</strong> (AWS data centers).
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                11.2 GDPR Adequacy and Safeguards
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                For Controllers established in the EU, EEA, or UK, the Processor shall implement safeguards for data transfers:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                11.2.1 EU-U.S. Data Privacy Framework (DPF)
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor commits to complying with the EU-U.S. Data Privacy Framework principles</li>
                <li>The Processor shall self-certify compliance with DPF (or equivalent framework)</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                11.2.2 Standard Contractual Clauses (SCCs)
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>This DPA incorporates Standard Contractual Clauses (Annex B) as approved by the European Commission</li>
                <li>These clauses provide contractual safeguards for data transfers from the EU to the U.S.</li>
                <li>The parties agree that transfers are permitted under these SCCs</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                11.2.3 Supplementary Measures
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor implements encryption, access controls, and audit logging to protect data in transit and at rest</li>
                <li>The Processor restricts Sub-processor locations to countries with appropriate data protection</li>
                <li>The Processor cooperates with Data Subject rights requests</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                11.3 Data Transfer Notices
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Controller acknowledges that data is transferred to and stored in the United States</li>
                <li>The Controller represents that Data Subjects have been notified of this transfer</li>
                <li>The Controller warrants that it has obtained necessary consent or has a lawful basis for the transfer</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 12 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                12. Data Protection Impact Assessment (DPIA)
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                12.1 DPIA Necessity
              </Typography>
              <Typography variant="p" className="text-white/80">
                If the Controller's use of Ottie's services is subject to GDPR Article 35 (Data Protection Impact Assessment requirement), the Controller may require a DPIA.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                12.2 Processor Support
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Provide documentation necessary for the Controller to conduct a DPIA</li>
                <li>Describe security measures and technical safeguards</li>
                <li>Provide information about Sub-processors and data locations</li>
                <li>Respond to DPIA information requests within <strong>15 business days</strong></li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 13 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                13. Limitation of Liability and Indemnification
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                13.1 Liability Cap
              </Typography>
              <Typography variant="p" className="text-white/80">
                Notwithstanding anything in the Service Agreement, each party's total liability arising from or related to this DPA shall be limited to the fees paid by the Controller in the 12 months preceding the claim or $100, whichever is greater.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                13.2 Exceptions to Liability Cap
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Liability limitations do not apply to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Either party's indemnification obligations</li>
                <li>Either party's breaches of confidentiality</li>
                <li>Either party's violation of the other's intellectual property rights</li>
                <li>Claims arising from willful misconduct or gross negligence</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                13.3 Processor Indemnification
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Processor shall indemnify, defend, and hold harmless the Controller from any claims, damages, or liabilities arising from:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Processor's breach of this DPA or Data Protection Laws</li>
                <li>Unauthorized access to personal data due to the Processor's security failure</li>
                <li>The Processor's use of Sub-processors in violation of this DPA</li>
                <li>The Processor's failure to comply with Controller instructions</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                13.4 Controller Indemnification
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                The Controller shall indemnify, defend, and hold harmless the Processor from any claims arising from:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The Controller's unlawful collection of personal data</li>
                <li>The Controller's breach of representations and warranties in this DPA (e.g., having lawful basis for collection)</li>
                <li>The Controller's unauthorized instructions to the Processor</li>
                <li>The Controller's violation of Data Protection Laws in collecting and using personal data</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 14 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                14. Governing Law and Dispute Resolution
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                14.1 Governing Law
              </Typography>
              <Typography variant="p" className="text-white/80">
                This DPA shall be governed by the laws of the <strong>State of Delaware</strong> (United States), without regard to conflict of law principles.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Exception:</strong> For disputes involving GDPR, UK GDPR, or other EU data protection laws:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The applicable data protection laws of the relevant EU Member State or the UK shall apply</li>
                <li>Disputes shall be subject to the jurisdiction of the supervisory authority (DPA) in the relevant Member State</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                14.2 Dispute Resolution
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Any disputes arising from this DPA shall be resolved as follows:
              </Typography>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                Step 1: Negotiation
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The parties shall first attempt to resolve disputes through good-faith negotiation between authorized representatives</li>
                <li>Duration: 30 days</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                Step 2: Escalation
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>If unresolved after 30 days, the dispute shall be escalated to senior management (CEO or equivalent)</li>
                <li>Duration: 15 days</li>
              </ul>

              <Typography variant="h4" className="mt-4 mb-2 font-semibold">
                Step 3: Binding Arbitration
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>If still unresolved, disputes shall be submitted to binding arbitration administered by JAMS</li>
                <li>Arbitration shall be conducted in Wilmington, Delaware</li>
                <li>Arbitration rules: JAMS Comprehensive Arbitration and Mediation Services</li>
                <li>Each party bears its own costs; arbitrator fees are split equally</li>
                <li>Award is final and binding and may be entered as judgment in any court of competent jurisdiction</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                14.3 Regulatory Proceedings
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                Nothing in this DPA prevents either party from:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>Reporting to or cooperating with a supervisory authority (DPA)</li>
                <li>Participating in regulatory investigations or audits</li>
                <li>Complying with lawful requests from regulatory authorities</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 15 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                15. Severability and Waiver
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                15.1 Severability
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                If any provision of this DPA is found to be invalid, illegal, or unenforceable:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The provision shall be modified to the minimum extent necessary to make it valid and enforceable</li>
                <li>If such modification is not possible, the provision shall be severed</li>
                <li>The remaining provisions shall continue in full force and effect</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                15.2 Waiver
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>No waiver of any provision or breach of this DPA is effective unless in writing</li>
                <li>Waiver of one breach does not constitute waiver of any other breach or provision</li>
                <li>Failure to enforce any right does not constitute waiver of that right</li>
              </ul>
            </div>

            <hr className="border-white/10" />

            {/* Section 16 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                16. Entire Agreement and Amendments
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                16.1 Entire Agreement
              </Typography>
              <Typography variant="p" className="text-white/80">
                This DPA, together with the Service Agreement and Privacy Policy, constitutes the entire agreement regarding data processing between the parties and supersedes all prior agreements, understandings, and representations.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                16.2 Amendments
              </Typography>
              <Typography variant="p" className="text-white/80">
                This DPA may be amended only by written agreement signed by authorized representatives of both parties. Material amendments shall be communicated to the Controller at least <strong>30 days</strong> in advance.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 17 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                17. Execution and Effectiveness
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                17.1 Execution
              </Typography>
              <Typography variant="p" className="text-white/80">
                This DPA is executed by electronic signature or acknowledgment of acceptance within the Processor's platform.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>For Processor:</strong><br />
                Ottie LLC, by execution below, agrees to be bound by this DPA.
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>For Controller:</strong><br />
                By activating Lead Management features or importing personal data into Ottie, the Controller agrees to be bound by this DPA.
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                17.2 Effectiveness
              </Typography>
              <Typography variant="p" className="text-white/80 mb-2">
                This DPA becomes effective upon the earliest of:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-white/80">
                <li>The date the Controller activates Lead Management features</li>
                <li>The date personal data is first uploaded to Ottie</li>
                <li>The date both parties sign a written DPA</li>
              </ul>

              <Typography variant="h3" className="mt-6 mb-3">
                17.3 No Additional Signature Required
              </Typography>
              <Typography variant="p" className="text-white/80">
                If this DPA is incorporated by reference in the Service Agreement, no separate signature is required. The Controller's acceptance of the Service Agreement constitutes acceptance of this DPA.
              </Typography>
            </div>

            <hr className="border-white/10" />

            {/* Section 18 */}
            <div className="space-y-3">
              <Typography variant="h2" className="mt-8 mb-4 border-b-0 pb-0">
                18. Contact Information
              </Typography>
              
              <Typography variant="h3" className="mt-6 mb-3">
                18.1 Controller Contact
              </Typography>
              <Typography variant="p" className="text-white/80">
                <strong>Name and Address:</strong> As provided in the Service Agreement
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                <strong>Data Protection Contact:</strong> As designated by Controller in account settings
              </Typography>

              <Typography variant="h3" className="mt-6 mb-3">
                18.2 Processor Contact
              </Typography>
              <div className="ml-4 space-y-2 text-white/80">
                <Typography variant="p">
                  <strong>Ottie LLC</strong><br />
                  Address: [Your Business Address]<br />
                  Email: <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link><br />
                  Data Protection Officer: <Link href="mailto:dpo@ottie.com" className="text-white/90 underline hover:text-white">dpo@ottie.com</Link><br />
                  Security Contact: <Link href="mailto:security@ottie.com" className="text-white/90 underline hover:text-white">security@ottie.com</Link>
                </Typography>
              </div>

              <Typography variant="h3" className="mt-6 mb-3">
                18.3 Sub-Processor List
              </Typography>
              <Typography variant="p" className="text-white/80">
                A current list of Sub-processors is maintained at: <Link href="https://www.ottie.com/subprocessors" className="text-white/90 underline hover:text-white">https://www.ottie.com/subprocessors</Link>
              </Typography>
              <Typography variant="p" className="text-white/80 mt-2">
                Controllers may request updates to this list at <Link href="mailto:privacy@ottie.com" className="text-white/90 underline hover:text-white">privacy@ottie.com</Link>.
              </Typography>
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
