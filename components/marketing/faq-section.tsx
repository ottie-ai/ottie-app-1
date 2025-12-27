'use client'

import { memo } from 'react'
import { Typography } from '@/components/ui/typography'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { WordReveal } from '@/components/ui/word-reveal'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'Works with any property listing link?',
    answer: 'Yes! Paste any listing URL from Zillow, Realtor.com, your MLS, or agency website. Ottie extracts photos, details, and descriptions automatically.',
  },
  {
    question: 'Can I add my logo?',
    answer: 'Yes, takes just 5 seconds. Upload your logo in the editor and it appears on all your property pages. Included in Free tier.',
  },
  {
    question: 'How do I share on Facebook?',
    answer: 'One-click copy link. Paste it anywhere — Facebook, WhatsApp, email, ads. The link works forever and looks great when shared.',
  },
  {
    question: "What's included in free plan?",
    answer: '3 property websites per month with all features: photos, map, contact form, analytics. No credit card required. Upgrade anytime.',
  },
  {
    question: 'How do I get buyer contacts?',
    answer: 'Every property page has a built-in contact form. When buyers fill it out, you get an email + see leads in your dashboard. Available on all tiers.',
  },
  {
    question: 'Can I use my own domain?',
    answer: 'Yes! Pro and Enterprise tiers include custom domain support. Connect your domain (e.g., properties.youragency.com) in settings.',
  },
]

// Split FAQs into two columns for desktop
const leftColumn = faqs.filter((_, i) => i % 2 === 0)
const rightColumn = faqs.filter((_, i) => i % 2 === 1)

// FAQ Schema for SEO
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

const FAQSectionComponent = () => {
  return (
    <section className="relative bg-[var(--dark-bg)] py-20 md:py-28">
      {/* FAQ Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="w-full max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Typography variant="h2" className="text-white border-none mb-4">
            <WordReveal
              text="Questions? We've got answers."
              triggerOnScroll
              delay={0}
              wordDelay={0.1}
            />
          </Typography>
          <ScrollReveal delay={0.3}>
            <Typography variant="lead" className="text-white/60 max-w-xl mx-auto">
              Everything you need to know about Ottie
            </Typography>
          </ScrollReveal>
        </div>

        {/* FAQ Accordion - Two columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column */}
          <ScrollReveal delay={0.2}>
            <Accordion type="single" collapsible className="space-y-3">
              {leftColumn.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`left-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 data-[state=open]:bg-white/[0.04]"
                >
                  <AccordionTrigger className="text-left text-white hover:text-white/80 hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>

          {/* Right Column */}
          <ScrollReveal delay={0.3}>
            <Accordion type="single" collapsible className="space-y-3">
              {rightColumn.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`right-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 data-[state=open]:bg-white/[0.04]"
                >
                  <AccordionTrigger className="text-left text-white hover:text-white/80 hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export const FAQSection = memo(FAQSectionComponent)
FAQSection.displayName = 'FAQSection'

