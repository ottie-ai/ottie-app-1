'use client'

import { memo } from 'react'
import { Link2, Sparkles, Share2 } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { WordReveal } from '@/components/ui/word-reveal'

const steps = [
  {
    number: 1,
    icon: Link2,
    title: 'Copy property link',
    description: 'Paste any listing URL you have',
  },
  {
    number: 2,
    icon: Sparkles,
    title: 'Get professional site',
    description: 'Photos + details load automatically (60 seconds)',
  },
  {
    number: 3,
    icon: Share2,
    title: 'Share & get leads',
    description: '1 link = website with contact form',
  },
]

const HowItWorksComponent = () => {
  return (
    <section className="relative bg-[var(--dark-bg)] py-20 md:py-28">
      <div className="w-full max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Typography variant="h2" className="text-white border-none mb-4">
            <WordReveal
              text="3 simple steps. That's it."
              triggerOnScroll
              delay={0}
              wordDelay={0.1}
            />
          </Typography>
          <ScrollReveal delay={0.3}>
            <Typography variant="lead" className="text-white/60 max-w-xl mx-auto">
              No tech skills needed. If you can copy a link, you can use Ottie.
            </Typography>
          </ScrollReveal>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, index) => (
              <ScrollReveal key={step.number} delay={0.2 + index * 0.15}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Number Badge */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white text-black font-bold text-lg mb-6">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4">
                    <step.icon className="w-7 h-7 text-white/80" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-white/60 text-sm max-w-xs">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export const HowItWorks = memo(HowItWorksComponent)
HowItWorks.displayName = 'HowItWorks'

