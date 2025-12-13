# Image Storage Implementation

## Prehľad

Tento dokument popisuje implementáciu automatického presúvania obrázkov do Supabase Storage bucketu. Všetky obrázky (uploadnuté používateľom alebo scrapnuté z webstránok) sa automaticky stiahnu a presunú do bucketu `site-images`, pričom sa nikdy nepoužívajú pôvodné linky priamo.

## Funkcionalita

### 1. Automatické spracovanie obrázkov pri scraping

- **Kde**: `lib/queue/scrape-queue.ts`
- **Kedy**: Po vygenerovaní configu (Call 1 a Call 2)
- **Čo robí**:
  - Extrahuje všetky image URLs z `generatedConfig` a `unified_json`
  - Stiahne obrázky z externých URL
  - Uploadne ich do `site-images/temp-preview/{previewId}/`
  - Nahradí pôvodné URLs novými Supabase Storage URLs v configu

### 2. Temp Preview Images

- **Cesta**: `site-images/temp-preview/{previewId}/`
- **Lifecycle**:
  - Obrázky sa automaticky vymažú keď temp preview expiruje (podľa `expires_at`)
  - Ak user claimne preview (zaregistruje sa/prihlási), obrázky sa presunú do `{siteId}/`

### 3. Site Images

- **Cesta**: `site-images/{siteId}/`
- **Lifecycle**:
  - Obrázky zostanú v bucketu pokiaľ site existuje
  - Pri soft delete site sa obrázky automaticky vymažú
  - Používajú sa rovnaké pravidlá ako pri soft delete (90 dní recovery window)

### 4. Cleanup Funkcie

#### Temp Preview Cleanup
- **Funkcia**: `cleanupExpiredPreviewImagesAction()` v `app/actions/image-cleanup.ts`
- **Kedy**: Mala by sa volať cez cron job po cleanup expired previews
- **Čo robí**: Vymaže všetky obrázky v `temp-preview/{previewId}/` pre expirované previews

#### Site Cleanup
- **Funkcia**: `cleanupSiteImagesAction(siteId)` v `app/actions/image-cleanup.ts`
- **Kedy**: Automaticky sa volá pri soft delete site v `lib/data/site-data.ts`
- **Čo robí**: 
  - Extrahuje image paths z site configu
  - Vymaže všetky obrázky v `{siteId}/` directory
  - Vymaže obrázky referencované v configu

### 5. Claim Preview (Temp → Site)

- **Kde**: `app/(marketing)/actions.ts` - funkcia `claimPreview`
- **Čo robí**:
  - Presunie obrázky z `temp-preview/{previewId}/` do `{siteId}/`
  - Aktualizuje URLs v configu na nové cesty
  - Uloží aktualizovaný config do databázy

## Supabase Setup

### 1. Vytvorenie Bucketu

V Supabase Dashboard:
1. Storage → New bucket
2. Názov: `site-images`
3. Public bucket: **Zapnúť** (aby boli obrázky verejne dostupné)
4. File size limit: 10MB
5. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/gif, image/webp`

### 2. RLS Policies

Spustiť SQL skript: `supabase/create-site-images-bucket.sql`

Tento skript vytvorí:
- Policies pre service role (pre scraping/processing)
- Policies pre authenticated users (pre manual uploads)
- Public read policy (pre zobrazenie obrázkov)

## Súbory

### Core Utilities
- `lib/storage/image-processor.ts` - Hlavné funkcie pre download, upload, a nahradenie URLs
- `lib/storage/cleanup.ts` - Cleanup funkcie pre temp previews a sites

### Server Actions
- `app/actions/image-upload.ts` - Upload obrázkov pre sites a temp previews
- `app/actions/image-cleanup.ts` - Cleanup actions pre cron jobs

### SQL Scripts
- `supabase/create-site-images-bucket.sql` - RLS policies pre bucket

## Integrácia

### Scraping Process
Obrázky sa automaticky spracujú v `lib/queue/scrape-queue.ts`:
- Po Call 1: Spracujú sa obrázky z `generatedConfig`
- Po Call 2: Spracujú sa akékoľvek nové obrázky z `finalConfig`

### Site Deletion
Cleanup sa automaticky volá v `lib/data/site-data.ts`:
- Pred soft delete sa získa site config
- Po úspešnom delete sa asynchrónne zavolá `cleanupSiteImages`

### Claim Preview
Presun obrázkov sa deje v `app/(marketing)/actions.ts`:
- Po vytvorení site sa zavolá `moveTempPreviewImagesToSite`
- Config sa aktualizuje s novými URLs

## Manual Uploads (TODO)

Pre manuálne uploady v builderi (FileUpload component):
- `FileUpload` momentálne používa data URLs (base64)
- Pre produkciu by malo používať `uploadSiteImage` z `app/actions/image-upload.ts`
- Potrebné: Pridať `siteId` prop do FileUpload a integrovať upload

## Cron Jobs

Pre cleanup expired preview images, nastaviť cron job:
```sql
-- V Supabase SQL Editor alebo cez pg_cron
SELECT cron.schedule(
  'cleanup-expired-preview-images',
  '0 3 * * *', -- Každý deň o 3:00 UTC
  $$SELECT cleanup_expired_preview_images()$$
);
```

Alebo vytvoriť Vercel Cron Job alebo podobný scheduled task, ktorý volá:
```typescript
import { cleanupExpiredPreviewImages } from '@/app/actions/image-cleanup'
await cleanupExpiredPreviewImages()
```

## Poznámky

1. **Image Size Limit**: 10MB per image
2. **Concurrent Processing**: Max 5 obrázkov naraz pri batch processing
3. **Error Handling**: Ak sa obrázok nepodarí stiahnuť/uploadnúť, použije sa pôvodná URL (ale to by sa nemalo stať v produkcii)
4. **Temp Preview Expiration**: Obrázky sa vymažú spolu s temp preview podľa `expires_at` (default 24 hodín)
5. **Site Deletion**: Obrázky sa vymažú pri soft delete, ale site má 90 dní recovery window
