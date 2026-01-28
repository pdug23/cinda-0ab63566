
# Fix PWA Meta Tag and Manifest Issues

## Overview

This plan addresses two issues:
1. Deprecated `apple-mobile-web-app-capable` meta tag
2. Manifest CORS error in the console

---

## Issue 1: Deprecated Meta Tag

**Current State (line 15 in index.html):**
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
```

**Problem:** This is an Apple-specific meta tag that's still valid and required for iOS PWA support. The `mobile-web-app-capable` variant is actually for Chrome/Android. Both should be present for full cross-platform PWA support.

**Fix:** Add the Android/Chrome version alongside the existing Apple version:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
```

---

## Issue 2: Manifest CORS Error

**Problem:** The CORS error for `manifest.json` is a development environment artifact. In Lovable's preview environment, cross-origin requests can sometimes trigger browser warnings. This typically resolves in production.

However, we can ensure the manifest is correctly configured by:
1. Verifying the manifest link uses a root-relative path (already correct: `/manifest.json`)
2. Adding `crossorigin="use-credentials"` attribute to handle potential auth scenarios

**Fix:** Update line 20 in index.html:
```html
<link rel="manifest" href="/manifest.json" crossorigin="use-credentials" />
```

---

## Bonus Fixes

While in `index.html`, I also noticed some outdated placeholder content that should be updated:

1. **Open Graph tags (lines 24-27):** Update from "Lovable App" to "Cinda"
2. **Twitter tags (lines 29-31):** Update site reference

---

## File Changes

| File | Change |
|------|--------|
| `index.html` | Add `mobile-web-app-capable` meta tag |
| `index.html` | Add `crossorigin` attribute to manifest link |
| `index.html` | Update OG/Twitter meta tags to "Cinda" branding |

---

## Technical Details

### Updated index.html head section:

```html
<!-- iOS Home Screen -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Cinda" />

<!-- Web App Manifest -->
<link rel="manifest" href="/manifest.json" crossorigin="use-credentials" />
<meta name="theme-color" content="#1a1a1a" />

<!-- Open Graph -->
<meta property="og:title" content="Cinda - Find Your Perfect Running Shoe" />
<meta property="og:description" content="AI-powered running shoe recommendations tailored to your needs" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@Cinda" />
<meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
```

This ensures full PWA compatibility across iOS and Android while addressing the CORS warning.
