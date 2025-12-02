'use client'

import { Crown } from 'lucide-react'
import { AsyncSelect } from '@/components/ui/async-select'
import { SelectItem } from '@/components/ui/select'

type Role = 'admin' | 'agent'

interface RoleSelectProps {
  value: Role
  onValueChange: (value: Role) => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  triggerClassName?: string
}

/**
 * RoleSelect Component
 * 
 * A specialized role selector built on top of AsyncSelect.
 * Use this component for role selection dropdowns that interact with the database.
 * 
 * Features:
 * - Shows Crown icon for admin role
 * - Displays role descriptions
 * - Built-in loading state with spinner (via AsyncSelect)
 * - Consistent styling across the app
 * - Automatic disabled state during loading
 * 
 * @example
 * ```tsx
 * const [loading, setLoading] = useState(false)
 * 
 * <RoleSelect
 *   value={role}
 *   loading={loading}
 *   onValueChange={async (newRole) => {
 *     setLoading(true)
 *     await updateRole(newRole)
 *     setLoading(false)
 *   }}
 * />
 * ```
 */
export function RoleSelect({
  value,
  onValueChange,
  disabled = false,
  loading = false,
  triggerClassName = 'w-[160px]',
}: RoleSelectProps) {
  return (
    <AsyncSelect
      value={value}
      onValueChange={onValueChange as (value: string) => void | Promise<void>}
      disabled={disabled}
      loading={loading}
      triggerClassName={triggerClassName}
      renderValue={(val) => (
        <div className="flex items-center gap-2">
          {val === 'admin' && <Crown className="size-4 text-amber-500" />}
          <span className="capitalize">{val}</span>
        </div>
      )}
    >
      <SelectItem value="admin" className="items-start py-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            <span className="font-medium">Admin</span>
          </div>
          <span className="text-xs text-muted-foreground leading-tight">
            Can manage team and settings
          </span>
        </div>
      </SelectItem>
      <SelectItem value="agent" className="items-start py-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">Agent</span>
          <span className="text-xs text-muted-foreground leading-tight">
            Can create and manage sites
          </span>
        </div>
      </SelectItem>
    </AsyncSelect>
  )
}

