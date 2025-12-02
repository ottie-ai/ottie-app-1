# Database Dropdown Pattern

## Overview

When creating dropdowns that interact with the database (e.g., changing user roles, updating statuses), always use the loading state pattern to provide visual feedback and prevent race conditions.

## Standard Pattern

### 1. Use AsyncSelect Component

For any dropdown that performs async operations, use the `AsyncSelect` component:

```tsx
import { AsyncSelect } from '@/components/ui/async-select'
import { SelectItem } from '@/components/ui/select'

const [loading, setLoading] = useState(false)

<AsyncSelect
  value={status}
  loading={loading}
  onValueChange={async (newStatus) => {
    setLoading(true)
    
    const result = await updateStatus(newStatus)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Updated successfully')
      await queryClient.invalidateQueries({ queryKey: ['yourData'] })
    }
    
    setLoading(false)
  }}
  renderValue={(value) => <span className="capitalize">{value}</span>}
>
  <SelectItem value="active">Active</SelectItem>
  <SelectItem value="inactive">Inactive</SelectItem>
</AsyncSelect>
```

### 2. Use Specialized Components

For role selection, use the `RoleSelect` component (built on top of AsyncSelect):

```tsx
import { RoleSelect } from '@/components/workspace/role-select'

const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

<RoleSelect
  value={role}
  loading={updatingRoleId === itemId}
  onValueChange={async (newRole) => {
    setUpdatingRoleId(itemId)
    
    const result = await updateRole(itemId, newRole)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Updated successfully')
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['yourData'] })
    }
    
    setUpdatingRoleId(null)
  }}
/>
```

### 3. Advanced: Custom Rendering

You can customize how values are displayed:

```tsx
import { AsyncSelect } from '@/components/ui/async-select'
import { SelectItem } from '@/components/ui/select'
import { CheckCircle, XCircle } from 'lucide-react'

<AsyncSelect
  value={status}
  loading={loading}
  loadingText="Saving..."
  triggerClassName="w-[200px]"
  onValueChange={async (newStatus) => {
    setLoading(true)
    await updateStatus(newStatus)
    setLoading(false)
  }}
  renderValue={(value) => (
    <div className="flex items-center gap-2">
      {value === 'active' ? (
        <CheckCircle className="size-4 text-green-500" />
      ) : (
        <XCircle className="size-4 text-red-500" />
      )}
      <span className="capitalize">{value}</span>
    </div>
  )}
>
  <SelectItem value="active">
    <div className="flex items-center gap-2">
      <CheckCircle className="size-4 text-green-500" />
      <span>Active</span>
    </div>
  </SelectItem>
  <SelectItem value="inactive">
    <div className="flex items-center gap-2">
      <XCircle className="size-4 text-red-500" />
      <span>Inactive</span>
    </div>
  </SelectItem>
</AsyncSelect>
```

## Key Principles

### 1. Always Show Loading State
- Use `LottieSpinner` for consistency
- Replace the SelectValue content during loading
- Show "Updating..." text for clarity

### 2. Disable During Updates
- Set `disabled={loading}` on the Select
- Prevents multiple simultaneous updates
- Prevents user confusion

### 3. No Page Reloads
- Never use `window.location.reload()`
- Use React Query's `invalidateQueries` instead
- Provides smoother UX and preserves scroll position

### 4. Maintain Fixed Width
- Keep consistent width (e.g., `w-[160px]`)
- Prevents layout shift during loading
- Improves perceived performance

### 5. Error Handling
- Always handle errors gracefully
- Show toast notifications
- Reset loading state in finally block

### 6. Optimistic Updates (Optional)
For better UX, you can update the UI immediately:

```tsx
onValueChange={async (newValue) => {
  // Optimistic update
  setValue(newValue)
  setLoading(true)
  
  const result = await updateAction(newValue)
  
  if ('error' in result) {
    // Revert on error
    setValue(oldValue)
    toast.error(result.error)
  } else {
    toast.success('Updated')
    await queryClient.invalidateQueries({ queryKey: ['data'] })
  }
  
  setLoading(false)
}
```

## Component Hierarchy

```
AsyncSelect (components/ui/async-select.tsx)
└── Base component for all async dropdowns
    ├── Built-in loading state
    ├── Customizable rendering
    └── Consistent UX

RoleSelect (components/workspace/role-select.tsx)
└── Specialized component for role selection
    ├── Built on AsyncSelect
    ├── Pre-configured with role options
    └── Crown icon for admin

Your Custom Select
└── Build your own specialized selects
    ├── Use AsyncSelect as base
    ├── Add your custom logic
    └── Maintain consistent UX
```

## Examples in Codebase

- **Base Component**: `components/ui/async-select.tsx`
- **Role Selection**: `components/workspace/role-select.tsx`
- **Team Settings**: `app/(app)/settings/settings-client.tsx` (Team tab)

## Testing Checklist

When implementing this pattern, verify:

- [ ] Loading spinner appears immediately on selection
- [ ] Dropdown is disabled during update
- [ ] Width/position doesn't change during loading
- [ ] Success toast appears after update
- [ ] Error toast appears on failure
- [ ] Data refreshes without page reload
- [ ] Multiple rapid clicks don't cause issues
- [ ] Loading state clears on both success and error

