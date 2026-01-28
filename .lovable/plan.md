

# Promote Cinda as a Web App

## Overview

Update both landing page views to push the web app installation message more prominently, replacing the existing bottom links with a unified "Cinda is best as a web app" message that opens the installation modal.

---

## Current State

| Page | Current Link Text | Opens |
|------|------------------|-------|
| Landing (initial) | "How does Cinda work?" | Explanation modal |
| Orientation | "Add Cinda to your home screen" | A2HS installation modal |

---

## Proposed Changes

### Wording Options

Here are some options for the link text - all using sentence case:

1. **"Cinda is best as a web app"** — Your suggestion
2. **"Cinda works best as a web app"** — Slightly softer
3. **"Get the best experience — install Cinda"** — Action-oriented

I'll use option 1 as requested. The modal title and description should also be updated to match this stronger messaging.

---

## Technical Changes

### File 1: `src/pages/Landing.tsx`

**1. Remove the "How it works" modal** (lines 230-258)
- Delete the Dialog component that explains how Cinda works
- Remove the `showModal` state variable

**2. Update the landing page bottom link** (lines 211-218)
- Change text from "How does Cinda work?" to "Cinda is best as a web app"
- Change onClick to open `setShowA2HSModal(true)` instead of `setShowModal(true)`

**3. Update the orientation page bottom link** (lines 221-228)
- Change text from "Add Cinda to your home screen" to "Cinda is best as a web app"

---

### File 2: `src/components/AddToHomeScreenModal.tsx`

**Update modal header to match stronger messaging** (lines 60-67)

```text
Before:
- Title: "add cinda to your home screen"
- Description: "install cinda for quick access — just like a real app."

After:
- Title: "Cinda is best as a web app"  
- Description: "Install Cinda to your home screen for the full experience — fast, offline-ready, and always one tap away."
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Replace both bottom links with "Cinda is best as a web app", both triggering A2HS modal; remove old "How it works" modal |
| `src/components/AddToHomeScreenModal.tsx` | Update title and description to match stronger messaging |

---

## Result

Both landing views will have the same message: **"Cinda is best as a web app"** — encouraging users to install Cinda before they start the onboarding flow.

