# ✅ Sharp.js Upload System - COMPLETE

## 🎯 Čo je hotové

### 1. **FileUpload.tsx** - Teraz používa Sharp.js! ✅

**Zmeny:**
- ❌ Odstránený priamy upload do Storage
- ✅ Používa `/api/upload` endpoint
- ✅ Automatická optimalizácia: resize, WebP, EXIF removal
- ✅ Single image upload pre form fields

**Kde sa používa:**
- `HighlightsSettings.tsx` - Highlight card images
- `PageSettings.tsx` - Page settings images
- Všade kde je potrebný single image upload

### 2. **ImageUpload.tsx** - Multi-file variant ✅

**Použitie:**
- Multi-file upload (až 10 images)
- Progress tracking
- Batch processing
- Preview grid

### 3. **API Endpoint** - `/api/upload` ✅

**Funkcie:**
- Validácia user access (owner/admin/assigned)
- Sharp.js processing
- Upload do `site-images/{site-id}/`
- Vracia optimizované URLs

### 4. **RLS Policies** - Bezpečné ✅

**Pravidlá:**
- Site images: len owner/admin/assigned agent
- Temp previews: len service_role
- Public read: všetko

## 📊 Ako to funguje

```
User → FileUpload/ImageUpload
    ↓
    FormData (siteId + images)
    ↓
POST /api/upload
    ↓
Validate access (owner/admin/assigned)
    ↓
Sharp.js: resize → WebP → EXIF removal
    ↓
Supabase Storage (site-images/{site-id}/)
    ↓
Return optimized URLs
```

## 🎨 Komponenty

### FileUpload (single image)

```tsx
import { FileUpload } from '@/components/ui/file-upload'

<FileUpload
  siteId={siteId}
  value={imageUrl}
  onChange={setImageUrl}
  placeholder="Drop an image or click to upload"
/>
```

### ImageUpload (multi-file)

```tsx
import { ImageUpload } from '@/components/ui/ImageUpload'

<ImageUpload
  siteId={siteId}
  value={photos}
  onChange={setPhotos}
  maxFiles={10}
/>
```

## 🔒 Bezpečnosť

### API validácia:
1. ✅ Authentication check
2. ✅ Site ID required
3. ✅ User must be owner/admin/assigned agent
4. ✅ Membership validation
5. ✅ Role-based access

### RLS policies:
1. ✅ Users can upload only to sites they have access to
2. ✅ Temp previews only via service_role
3. ✅ Public read for displaying on sites

## 📦 Sharp.js Specs

**Processing:**
- Max width: 1920px
- Format: WebP
- Quality: 80%
- EXIF: Removed
- Auto-rotate: Yes

**Limits:**
- Max file size: 5MB (input)
- Max file size: 5MB (output)
- Formats: JPEG, PNG, GIF, WebP

## 🚀 Deployment Checklist

- [x] Sharp.js installed
- [x] lib/image.ts created
- [x] types/image.ts created
- [x] lib/supabase/storage.ts created
- [x] app/api/upload/route.ts created
- [x] components/ui/ImageUpload.tsx created
- [x] components/ui/file-upload.tsx updated
- [ ] Run SQL migration: `supabase/create-site-images-bucket.sql`
- [ ] Test upload in Highlights settings
- [ ] Test upload in Page settings
- [ ] Verify images are optimized (WebP, smaller size)

## 🧪 Testing

### Test FileUpload (Highlights):
1. Open site in builder
2. Go to Highlights section
3. Click "Remix Section"
4. Add highlight card
5. Upload image
6. ✅ Should show "Optimizing image..." 
7. ✅ Should convert to WebP
8. ✅ Should resize if >1920px

### Test ImageUpload (multi-file):
1. Import in your component
2. Pass `siteId` prop
3. Upload multiple images
4. ✅ Should show progress bar
5. ✅ Should display preview grid

## 📝 Dokumentácia

**Full docs:** `docs/IMAGE_UPLOAD_SYSTEM.md`

**Key points:**
- All uploads require `siteId`
- All uploads are optimized automatically
- Access is validated on server-side
- Images stored in `site-images/{site-id}/`

## 🎉 Výsledok

**Teraz všetky uploads v Highlights používajú Sharp.js optimalizáciu!**

- ✅ Rýchlejšie načítanie (WebP)
- ✅ Menšie súbory (80% kvalita)
- ✅ Bezpečné (RLS + API validácia)
- ✅ Privacy-safe (EXIF removed)
- ✅ Responsive (max 1920px)

---

**Next step:** Spusti SQL migration a otestuj upload! 🚀

