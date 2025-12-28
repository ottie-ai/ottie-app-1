# Builder Refactor Summary

**Date:** December 16, 2025  
**Status:** ✅ Complete

## 📋 Overview

Successfully refactored the site management interface to separate **Backend (Admin)** and **Builder (Layout Editor)** into two distinct views with dedicated routing and UI.

---

## 🎯 Goals Achieved

1. ✅ **Separate Backend and Builder**: Created two independent routes with different purposes
2. ✅ **Full-screen Builder**: Builder has its own layout without app sidebar/navigation
3. ✅ **Mini Preview**: Backend view shows scaled-down Hero preview with "Edit Layout" hover
4. ✅ **Improved UX**: Clear separation between site settings and layout editing
5. ✅ **Maintained Functionality**: All existing features (publish, save, sections, settings) work

---

## 🗂️ New File Structure

```
app/
├── (app)/
│   └── sites/[id]/
│       ├── page.tsx                        # Backend route (Settings/Analytics/Leads)
│       ├── site-backend-client.tsx         # Backend UI (tabs + mini preview)
│       ├── site-mini-preview.tsx           # Scaled Hero preview with hover
│       └── site-settings-panel.tsx         # Settings form
│
└── (builder)/
    └── builder/
        └── [id]/
            ├── layout.tsx                  # Full-screen layout (no sidebar, no workspace bg)
            ├── page.tsx                    # Builder route with auth + permissions
            ├── builder-client.tsx           # Builder UI (top bar + canvas)
            └── loading.tsx                  # Loading fallback (white bg)

hooks/
└── use-current-site.ts             # Shared hook for fetching site data

app/globals.css                     # UPDATED: Added .force-light-mode class, workspace-body class
```

---

## 🔀 Routing & URLs

### Backend (Admin View)
- **URL:** `/sites/[id]`
- **Purpose:** Site management (settings, analytics, leads)
- **Layout:** Uses main app layout (sidebar visible)
- **UI Components:**
  - Header with buttons: "Open Layout Editor" + "View Live Site"
  - Tabs: Settings, Analytics, Leads
  - Sticky mini preview (right side) - shows Hero section
  - Quick info: status, created date, published date

### Builder (Layout Editor)
- **URL:** `/builder/[id]`
- **Purpose:** Full-screen layout editing
- **Layout:** Custom layout in `(builder)` route group (NO sidebar, NO workspace background)
- **Route Group:** `(builder)` - separate from `(app)` to avoid inheriting workspace layout
- **UI Components:**
  - Floating top bar: Back, Tabs (Layout/Global Styles), Preview, Publish
  - Full canvas: Direct section rendering with editable sections
  - Floating bottom bar: `<SectionMorphingIndicator>` (section name + settings)

---

## 🎨 UI/UX Details

### Backend View
1. **Header:**
   - Site title + slug
   - Status badge (Published/Draft)
   - "Open Layout Editor" button → opens `/builder/[id]` in new tab
   - "View Live Site" button → opens public URL

2. **Tabs (3 columns → 2/3 left, 1/3 right):**
   - **Settings:** Site name, slug, password, domain, delete, reassign, sections order
   - **Analytics:** Placeholder for charts/metrics
   - **Leads:** LeadsTable with existing functionality

3. **Mini Preview (right side, sticky):**
   - Scaled-down Hero section (25% scale)
   - Hover: Shows "Edit Layout" overlay with pencil icon
   - Click: Opens builder (`/builder/[id]`) in new tab

### Builder View
1. **Top Bar (light mode forced with `.force-light-mode`):**
   - **Left:** Back button (closes window or navigates to `/sites/[id]`)
   - **Center:** Tabs: Layout / Global Styles
   - **Right:** Preview button + Morphing Publish/Save button

2. **Canvas:**
   - Full-screen direct section rendering (no PreviewSitePage wrapper)
   - Window scroll (not container scroll) for proper highlights section animation
   - Editable sections with inline editing
   - All existing builder functionality preserved

3. **Bottom Bar:**
   - `<SectionMorphingIndicator>` (section name + settings panel)

---

## 🔐 Permissions

Both views enforce the same permission checks:
- Owner
- Admin
- Creator (site.creator_id)
- Assigned Agent (site.assigned_agent_id)

If user doesn't have permissions → `notFound()`

---

## 🛠️ Technical Details

### Route Group Separation
Builder is in `(builder)` route group to avoid inheriting workspace layout:
- **No workspace background** - builder layout has inline style forcing white background
- **No workspace sidebar** - builder has its own full-screen layout
- **No workspace loading screen** - builder has its own loading.tsx with white background
- **AuthGuard included** - builder layout includes AuthGuard for authentication

### Builder Theme
- **IMPORTANT:** Builder has NO dark/light mode switching
- Builder always uses fixed styling (dark luxury theme for admin UI controls)
- Site content uses its own `colorScheme` prop (`'light' | 'dark'`) - this refers to SITE background, NOT builder theme
- Only the Admin Dashboard (`(app)` route group) has dark/light mode switching

### `.force-light-mode` Class
Added to `globals.css` to force light mode on builder top bar:

```css
.force-light-mode {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... all light mode CSS variables ... */
}
```

Usage in Builder:
```tsx
<div className="force-light-mode">
  <nav>{/* Top bar always light */}</nav>
</div>
```

### `.workspace-body` Class
Workspace background is only applied when body has `workspace-body` class:
- Applied in `(app)/layout-client.tsx` for workspace routes only
- Builder routes never get this class, so no workspace background

### `useCurrentSite` Hook
Shared hook for consistent site data fetching across both views:
- Real-time updates via Supabase subscriptions
- Error handling
- Refresh method

### Preview Site Page
- Reused in both Builder (full-screen) and Preview (separate route)
- Props: `canEdit`, `saveChangesRef`, `themeRef`, `loaderRef`, `sectionsRef`
- Handles save/publish logic

---

## 📊 Component Reusability

| Component | Backend | Builder | Preview Route |
|-----------|---------|---------|---------------|
| `<SiteSettingsPanel>` | ✅ | ❌ | ❌ |
| `<LeadsTable>` | ✅ | ❌ | ❌ |
| `<SiteMiniPreview>` | ✅ | ❌ | ❌ |
| `<PreviewSitePage>` | ❌ | ✅ | ✅ |
| `<SectionMorphingIndicator>` | ❌ | ✅ | ✅ (with canEdit=true) |
| `<SectionRenderer>` | ✅ (mini) | ✅ | ✅ |

---

## 🔄 Migration from Old to New

### What Changed
- **Old:** Single route `/sites/[id]` with floating navbar + tabs (Website/Settings/Analytics/Leads)
- **New:** Two routes in separate route groups:
  - `/sites/[id]` → Backend (Settings/Analytics/Leads + mini preview) - in `(app)` route group
  - `/builder/[id]` → Full-screen editor - in `(builder)` route group (no workspace layout inheritance)

### What Stayed the Same
- All existing functionality (publish, save, sections, settings, leads)
- `<PreviewSitePage>` component
- `<SiteSettingsPanel>` component
- `<SectionMorphingIndicator>` component
- Permissions logic
- Save/publish logic

### Deprecated Files
- `site-detail-client.tsx` - no longer used (replaced by `site-backend-client.tsx`)

---

## 🚀 User Flow

1. User clicks site card in `/sites` → Opens `/sites/[id]` (Backend)
2. User sees Settings tab by default + mini preview on right
3. User clicks "Open Layout Editor" button → Opens `/builder/[id]` in new tab
4. User edits layout in full-screen builder (no workspace background, no sidebar)
5. User clicks "Save Changes" → Saves to DB
6. User clicks "Back" → Closes builder tab, returns to Backend view
7. Backend view shows updated mini preview

---

## ✅ Testing Checklist

- [x] No linter errors in new files
- [x] Permissions enforced in both routes
- [x] Backend tabs work (Settings, Analytics, Leads)
- [x] Mini preview shows Hero section
- [x] Mini preview hover shows "Edit Layout" overlay
- [x] Mini preview click opens builder in new tab
- [x] Builder top bar shows Back, Tabs, Preview, Publish
- [x] Builder canvas shows editable sections
- [x] Builder bottom bar shows section morphing indicator
- [x] Save/Publish functionality works in builder
- [x] `.force-light-mode` class applies to builder top bar
- [x] `useCurrentSite` hook provides real-time updates

---

## 📝 Notes

### Future Enhancements
1. **Global Styles Tab:** Currently placeholder, can add theme/font/loader settings
2. **Analytics Tab:** Currently placeholder, can add charts/metrics
3. **Mini Preview Improvements:** 
   - Show multiple sections (Hero + Features)
   - Add loading state while rendering
   - Add error boundary
4. **Builder Keyboard Shortcuts:** Add Cmd+S for save, Esc to close settings
5. **Responsive:** Mini preview hidden on mobile, show only buttons

### Known Limitations
1. Mini preview scales down entire Hero section (25% scale) - may look pixelated for text
2. Builder opens in new tab - no communication back to backend view (uses DB as source of truth)
3. Global Styles tab is placeholder (not implemented)

---

## 🎉 Conclusion

Refaktoring úspešne oddelil backend admin funkcie od layout editora, čím sa zlepšila UX a kód je teraz modulárnejší a ľahšie udržiavateľný. Všetky existujúce funkcie zostali zachované a permissions sú správne vynucované.









