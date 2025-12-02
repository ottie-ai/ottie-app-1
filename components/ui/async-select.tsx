'use client'

import { ReactNode } from 'react'
import { LottieSpinner } from '@/components/ui/lottie-spinner'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AsyncSelectProps {
  value: string
  onValueChange: (value: string) => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  triggerClassName?: string
  children: ReactNode
  renderValue?: (value: string) => ReactNode
}

/**
 * AsyncSelect Component
 * 
 * A reusable select dropdown with built-in loading state support for async operations.
 * Use this component whenever you need a dropdown that interacts with the database or performs async actions.
 * 
 * Features:
 * - Built-in loading state with spinner
 * - Automatic disabled state during loading
 * - Consistent styling across the app
 * - Prevents layout shifts during loading
 * - Customizable loading text and value rendering
 * 
 * @example
 * ```tsx
 * const [loading, setLoading] = useState(false)
 * 
 * <AsyncSelect
 *   value={status}
 *   loading={loading}
 *   onValueChange={async (newStatus) => {
 *     setLoading(true)
 *     await updateStatus(newStatus)
 *     setLoading(false)
 *   }}
 *   renderValue={(value) => <span className="capitalize">{value}</span>}
 * >
 *   <SelectItem value="active">Active</SelectItem>
 *   <SelectItem value="inactive">Inactive</SelectItem>
 * </AsyncSelect>
 * ```
 */
export function AsyncSelect({
  value,
  onValueChange,
  disabled = false,
  loading = false,
  loadingText = 'Updating...',
  triggerClassName = 'w-[160px]',
  children,
  renderValue,
}: AsyncSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={triggerClassName}>
        {loading ? (
          <div className="flex items-center gap-2">
            <LottieSpinner size={16} />
            <span className="text-muted-foreground">{loadingText}</span>
          </div>
        ) : (
          <SelectValue>
            {renderValue ? renderValue(value) : value}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  )
}

