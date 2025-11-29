'use client'

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import Navbar from "@/components/marketing/navbar"

export default function Terms() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Link 
                  href="/"
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors"
                  aria-label="Back to homepage"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </Link>
                <Typography variant="h1" className="mb-0">
                  Terms and Conditions
                </Typography>
              </div>
              <Typography variant="muted" className="text-muted-foreground">
                Last updated: {lastUpdated}
              </Typography>
            </div>

            {/* Introduction */}
            <div className="space-y-4">
              <Typography variant="p" className="text-muted-foreground">
                These Terms and Conditions ("Terms") govern your use of the Ottie service ("Service") operated by Ottie Group LLC ("we", "our", or "us"). By accessing or using our Service, you agree to be bound by these Terms.
              </Typography>
            </div>

            {/* Section 1 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                1. Acceptance of Terms
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                By creating an account or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
              </Typography>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                2. Service Description
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                Ottie provides a platform for real estate agents and property owners to create and manage property listing websites. The Service includes tools for creating, editing, and publishing property listings.
              </Typography>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                3. User Accounts
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree to provide accurate and complete information when creating an account.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must notify us immediately of any unauthorized use of your account.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                4. Acceptable Use
              </Typography>
              <Typography variant="p" className="text-muted-foreground mb-2">
                You agree not to:
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>Violate any laws in your jurisdiction.</li>
                <li>Infringe upon the rights of others, including intellectual property rights.</li>
                <li>Upload malicious code, viruses, or harmful content.</li>
                <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
                <li>Use the Service to spam, harass, or harm others.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                5. Content Ownership
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                You retain ownership of all content you upload or create using the Service. By using the Service, you grant us a license to host, display, and distribute your content as necessary to provide the Service.
              </Typography>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                6. Service Availability
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances.
              </Typography>
            </div>

            {/* Section 7 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                7. Limitation of Liability
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                To the maximum extent permitted by law, Ottie Group LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </Typography>
            </div>

            {/* Section 8 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                8. Termination
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                We reserve the right to suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time through your account settings.
              </Typography>
            </div>

            {/* Section 9 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                9. Changes to Terms
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the modified Terms.
              </Typography>
            </div>

            {/* Section 10 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                10. Contact Information
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                For questions about these Terms, please contact our support team through the Service or via email.
              </Typography>
            </div>

            {/* Back Button */}
            <div className="flex justify-center mt-12 pt-8 border-t border-border">
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

