# Image Storage Security Audit & Fixes

## Bezpečnostné problémy a opravy

### 1. ✅ Path Traversal Protection
**Problém**: `targetPath` a `basePath` neboli validované, umožňovali path traversal útoky (`../`)

**Riešenie**:
- Vytvorená `sanitizePath()` funkcia v `lib/storage/security.ts`
- Validuje UUID formát pre IDs
- Odstraňuje `..` a normalizuje cesty
- Kontroluje štruktúru cesty (prefix/id/filename)

### 2. ✅ MIME Type Spoofing Protection
**Problém**: Content-Type header môže byť spoofnutý, umožňuje upload neplatných súborov

**Riešenie**:
- Pridaná `validateImageMagicBytes()` funkcia
- Kontroluje magic bytes (file signature) pred uploadom
- Podporované formáty: JPEG, PNG, GIF, WebP
- Používa detekovaný typ z magic bytes namiesto Content-Type

### 3. ✅ URL Validation
**Problém**: Externé URL neboli validované, umožňovali SSRF útoky

**Riešenie**:
- Pridaná `isValidImageUrl()` funkcia
- Blokuje localhost a private IP adresy
- Validuje URL formát
- Používa sa pred každým fetch

### 4. ✅ File Extension Validation
**Problém**: Extensions sa určovali z URL alebo Content-Type bez whitelistu

**Riešenie**:
- Pridaná `isValidImageExtension()` funkcia
- Whitelist: jpg, jpeg, png, gif, webp
- Validuje extension pred použitím

### 5. ✅ Timeout Protection
**Problém**: Fetch nemal timeout, mohol visieť donekonečna

**Riešenie**:
- Pridaný `FETCH_TIMEOUT = 30000ms` (30 sekúnd)
- Používa `AbortController` pre timeout
- Správne error handling pre timeout

### 6. ✅ File Size Limits
**Problém**: Veľké súbory mohli spôsobiť memory issues

**Riešenie**:
- Kontrola veľkosti pred spracovaním
- Limit: 10MB
- Error handling pre prekročenie limitu

### 7. ✅ Secure Filename Generation
**Problém**: Filenames používali jednoduché timestamp, mohli byť predvídateľné

**Riešenie**:
- Pridaná `generateSecureFilename()` funkcia
- Používa SHA-256 hash s timestamp
- Náhodný, nepredvídateľný filename

### 8. ✅ Error Information Leakage
**Problém**: Error messages odhaľovali interné detaily

**Riešenie**:
- Generic error messages pre používateľov
- Detailné logy len server-side
- Neodhaľujú interné chyby

### 9. ✅ Concurrent Upload Protection
**Problém**: Race conditions pri concurrent uploads

**Riešenie**:
- `upsert: false` - neumožňuje prepisovanie súborov
- Batch processing s limitom (max 5 concurrent)
- Promise.allSettled pre error handling

### 10. ✅ UUID Validation
**Problém**: IDs (siteId, previewId) neboli validované

**Riešenie**:
- UUID regex validation pred použitím
- Kontrola v `uploadSiteImage`, `uploadImageFromUrl`, `moveTempPreviewImagesToSite`
- Kontrola v cleanup funkciách

### 11. ✅ RLS Policy Security
**Problém**: RLS policies umožňovali upload do temp-preview bez validácie

**Riešenie**:
- RLS policies sú správne nastavené
- Service role má plný prístup (pre scraping)
- Authenticated users majú obmedzený prístup podľa workspace membership
- Public má len read prístup

## Edge Cases

### ✅ Duplicate Images
- Ak je obrázok už v bucketu, vráti existujúci URL
- Neuploaduje duplikáty

### ✅ Failed Downloads
- Ak download zlyhá, nevrátí pôvodný URL (security)
- Loguje chybu server-side
- Pokračuje s ďalšími obrázkami

### ✅ Invalid Configs
- `extractImageUrlsFromConfig` bezpečne traversuje config
- Ignoruje neplatné hodnoty
- Odstraňuje duplikáty

### ✅ Empty Arrays
- Všetky funkcie správne spracúvajú prázdne arrays
- Vracajú prázdne výsledky namiesto errorov

### ✅ Large Batches
- Batch processing s limitom 5 concurrent
- Limit 1000 súborov na listing
- Správne error handling pre veľké batchy

## Bezpečnostné best practices

1. **Input Validation**: Všetky vstupy sú validované a sanitizované
2. **Output Sanitization**: Všetky výstupy sú sanitizované
3. **Error Handling**: Generic errors pre klientov, detailné logy server-side
4. **Rate Limiting**: Batch processing s limitmi
5. **Timeout Protection**: Všetky network calls majú timeout
6. **Magic Bytes**: Validácia skutočného typu súboru
7. **Path Validation**: Všetky cesty sú validované proti path traversal
8. **UUID Validation**: Všetky IDs sú validované ako UUIDs

## Testovanie

Odporúčané testy:
1. Path traversal útoky (`../../../etc/passwd`)
2. MIME type spoofing (fake Content-Type)
3. SSRF útoky (localhost URLs)
4. Veľké súbory (>10MB)
5. Neplatné UUIDs
6. Concurrent uploads
7. Timeout scenáre
8. Invalid magic bytes

## Monitoring

Odporúčané metriky:
- Počet failed uploads
- Priemerný čas downloadu
- Počet timeoutov
- Veľkosť uploadnutých súborov
- Počet validovaných vs nevalidovaných URLs
