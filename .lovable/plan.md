

# Update PWA Installation Text

## Overview

Update three pieces of copy related to the PWA installation experience to be more accurate and include Safari-specific instructions for iPhone users.

---

## Changes

### 1. Landing Page Link Text

**File:** `src/pages/Landing.tsx` (line 213)

| Before | After |
|--------|-------|
| "Cinda is best as a web app" | "Add Cinda as a web app for an optimal experience" |

---

### 2. Modal Title

**File:** `src/components/AddToHomeScreenModal.tsx` (line 81)

| Before | After |
|--------|-------|
| "Cinda is best as a web app" | "Add Cinda as a web app" |

---

### 3. Modal Description

**File:** `src/components/AddToHomeScreenModal.tsx` (line 84)

| Before | After |
|--------|-------|
| "Install Cinda to your home screen for the full experience — fast, offline-ready, and always one tap away." | "Install Cinda to your home screen for the full experience." |

---

### 4. iOS Tab Instructions - Add Safari Requirement

**File:** `src/components/AddToHomeScreenModal.tsx` (lines 113-143)

Add a note at the top of the iOS instructions to clarify Safari is required:

```jsx
<TabsContent value="ios" className="px-5 pb-5 pt-4">
  <p className="text-xs text-muted-foreground/70 mb-3 italic">
    This only works in Safari
  </p>
  <div className="space-y-4">
    {/* existing steps remain unchanged */}
  </div>
</TabsContent>
```

---

## Summary

| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Update link text to "Add Cinda as a web app for an optimal experience" |
| `src/components/AddToHomeScreenModal.tsx` | Update modal title, remove "offline-ready" claim, add Safari note for iOS |

