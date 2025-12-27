'use client'

import { memo } from 'react'
import { X, Check } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { WordReveal } from '@/components/ui/word-reveal'

const problems = [
  'Buyers never open email attachments',
  'No contact info or map location',
  'Listings get lost in inbox',
]

const solutions = [
  'Professional site with your photos + map',
  '"Book viewing" button gets leads',
  'Share 1 link — works forever',
]

const ProblemSolutionComponent = () => {
  return (
    <section className="relative bg-[var(--dark-bg)] py-20 md:py-28">
      <div className="w-full max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Typography variant="h2" className="text-white border-none mb-4">
            <WordReveal
              text="Stop sending PDFs. Start closing deals."
              triggerOnScroll
              delay={0}
              wordDelay={0.08}
            />
          </Typography>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Problems Column */}
          <ScrollReveal delay={0.2}>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-red-400">
                  PDFs don't sell houses
                </h3>
              </div>
              <ul className="space-y-4">
                {problems.map((problem, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400/60 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70">{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Solutions Column */}
          <ScrollReveal delay={0.4}>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-400">
                  Live websites that close deals
                </h3>
              </div>
              <ul className="space-y-4">
                {solutions.map((solution, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400/60 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export const ProblemSolution = memo(ProblemSolutionComponent)
ProblemSolution.displayName = 'ProblemSolution'

