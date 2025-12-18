/**
 * Text case transformation utilities
 */

export type TitleCase = 'uppercase' | 'title' | 'sentence'

/**
 * Convert text to title case (First Letter Of Each Word Capitalized)
 * Handles special cases like "of", "the", "a", "an" (lowercase in middle)
 */
function toTitleCase(text: string): string {
  if (!text) return text
  
  // Words that should be lowercase in title case (unless first word)
  const lowercaseWords = ['of', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by']
  
  return text
    .split(' ')
    .map((word, index) => {
      // Remove punctuation temporarily
      const hasPunctuation = /[.,!?;:]$/.test(word)
      const cleanWord = word.replace(/[.,!?;:]/g, '')
      
      if (!cleanWord) return word
      
      // First word is always capitalized
      if (index === 0) {
        const result = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
        return hasPunctuation ? result + word.slice(cleanWord.length) : result
      }
      
      // Check if word should be lowercase
      if (lowercaseWords.includes(cleanWord.toLowerCase())) {
        return word.toLowerCase()
      }
      
      // Capitalize first letter
      const result = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
      return hasPunctuation ? result + word.slice(cleanWord.length) : result
    })
    .join(' ')
}

/**
 * Convert text to sentence case (First Letter Of First Word Capitalized)
 */
function toSentenceCase(text: string): string {
  if (!text) return text
  
  // Split by sentences (period, exclamation, question mark)
  return text
    .split(/([.!?]\s+)/)
    .map((sentence, index) => {
      if (!sentence.trim()) return sentence
      
      // Capitalize first letter of each sentence
      return sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * Apply text case transformation based on titleCase setting
 */
export function applyTextCase(text: string, titleCase: TitleCase | undefined): string {
  if (!titleCase) {
    return text // No transformation
  }

  switch (titleCase) {
    case 'uppercase':
      return text.toUpperCase()
    case 'title':
      return toTitleCase(text)
    case 'sentence':
      return toSentenceCase(text)
    default:
      return text // No transformation
  }
}

/**
 * Get CSS class for text case transformation
 */
export function getTextCaseClass(titleCase: TitleCase | undefined): string {
  if (!titleCase) {
    return ''
  }

  switch (titleCase) {
    case 'uppercase':
      return 'uppercase'
    case 'title':
      return 'capitalize'
    case 'sentence':
      return '' // Sentence case needs JavaScript transformation
    default:
      return ''
  }
}


