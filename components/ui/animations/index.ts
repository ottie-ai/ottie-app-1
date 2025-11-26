/**
 * Global Animation Components & Hooks
 * 
 * Use these components for consistent animations across the template page.
 * All animations respect global timing and easing settings.
 * 
 * Components:
 * - AnimateOnScroll: Wrapper for scroll-triggered animations
 * - StaggerContainer: Container for staggered child animations
 * - StaggerItem: Child item for StaggerContainer
 * - WordReveal: Word-by-word text reveal animation
 * - ScrollReveal: Simple scroll-triggered fade-in (deprecated, use AnimateOnScroll)
 * 
 * Hooks:
 * - useScrollAnimation: Hook for custom scroll-based animations
 * - useHeroScrollAnimation: Hook for hero-specific scroll animations
 * - useScrollTransforms: Common scroll-based transforms
 * 
 * Config:
 * - ANIMATION_CONFIG: Global animation settings (timing, easing, thresholds)
 * - scrollSpringConfig: Spring config for momentum scrolling
 */

export { 
  AnimateOnScroll, 
  StaggerContainer, 
  StaggerItem,
  ANIMATION_CONFIG,
} from '../animate-on-scroll'

export { WordReveal } from '../word-reveal'
export { ScrollReveal } from '../scroll-reveal'

export { 
  useScrollAnimation, 
  useHeroScrollAnimation,
  useScrollTransforms,
  scrollSpringConfig,
} from '@/hooks/useScrollAnimation'

