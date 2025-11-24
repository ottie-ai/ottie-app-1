import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import Navbar from "@/components/navbar"

export default function Privacy() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-foreground">
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
                  Privacy Policy
                </Typography>
              </div>
              <Typography variant="muted" className="text-muted-foreground">
                Last updated: {lastUpdated}
              </Typography>
            </div>

            {/* Introduction */}
            <div className="space-y-4">
              <Typography variant="p" className="text-muted-foreground">
                Ottie Group LLC ("we", "our", or "us") operates the Ottie website ("Service") offering agents and property owners instant, free listing sites with agent-first privacy.
              </Typography>
            </div>

            {/* Section 1 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                1. What data we collect
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>Basic account information (name, email) for registration.</li>
                <li>Property details you enter or import (property address, description, images, contact info).</li>
                <li>Technical usage data (browser type, device, IP, page views) for analytics and service improvement.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                2. How we use your data
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>To create and host your property listing site.</li>
                <li>To contact you regarding your account or support requests.</li>
                <li>For internal analytics to improve the Service.</li>
                <li className="font-semibold text-foreground">We do NOT sell or share your data with third parties for marketing.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                3. Who can see your data
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>Only you (the account owner) and anyone with the direct link to your published listing may view property details.</li>
                <li>Your account data is never sold, shared, or displayed to other users or external partners.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                4. Data ownership and control
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>You own all data you provide. You can delete your account and listings at any time.</li>
                <li>If you wish to export or remove your data, contact support and we will assist promptly.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                5. Third-party services
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>We use secure cloud services (e.g. Vercel, Supabase) for hosting and storage, which maintain industry-standard security.</li>
                <li>No data is shared with advertisers or unrelated parties.</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                6. Cookies and analytics
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>We use minimal cookies for authentication and simple site analytics (no tracking for advertising purposes).</li>
                <li>You may control or disable cookies in your browser settings.</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                7. Children's Privacy
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                The Service is intended for professional users aged 18 or older; we do not knowingly collect data from children.
              </Typography>
            </div>

            {/* Section 8 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                8. Security practices
              </Typography>
              <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                <li>Data is protected with encryption and access controls.</li>
                <li>We regularly review our security procedures and comply with best practices.</li>
              </ul>
            </div>

            {/* Section 9 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                9. Changes to this Policy
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                Updates to this Privacy Policy will be posted on this page. We will notify you of significant changes by email.
              </Typography>
            </div>

            {/* Section 10 */}
            <div className="space-y-3">
              <Typography variant="h3" className="mt-8 mb-4">
                10. Contact us
              </Typography>
              <Typography variant="p" className="text-muted-foreground">
                For privacy questions or requests, contact our support team.
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

