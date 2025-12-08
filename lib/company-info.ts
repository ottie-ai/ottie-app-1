/**
 * Company Information
 * 
 * Centralized company information that can be used across the application
 * (emails, contact sections, legal pages, etc.)
 */

/**
 * Company address
 * Used in email footers, contact sections, and other places where company address is displayed
 */
export const COMPANY_ADDRESS = {
  street: '440 N Barranca Ave #3696',
  city: 'Covina',
  state: 'CA',
  zipcode: '91723',
  country: 'United States',
  /**
   * Full address as a single line string
   */
  get full(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.zipcode}, ${this.country}`
  },
  /**
   * Address formatted for HTML (with line breaks)
   */
  get html(): string {
    return `${this.street}, ${this.city},<br>${this.state} ${this.zipcode}, ${this.country}`
  },
  /**
   * Address formatted for plain text (with line breaks)
   */
  get text(): string {
    return `${this.street}, ${this.city},\n${this.state} ${this.zipcode}, ${this.country}`
  },
}
