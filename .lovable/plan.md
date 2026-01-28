
# Update Step 3b Greeting Format

## Current State
The greeting message is: `"👋 Hey, Cinda here."` - all on one line.

The typing indicator uses `cinda-logo-grey.png` which is the current grey logo (there's no v2 grey version - only the white logo has a v2 variant).

---

## Changes Needed

### File: `src/pages/ProfileBuilderStep3b.tsx`

**1. Split the greeting into two lines (line 22)**

```tsx
// From
const CINDA_GREETING = "👋 Hey, Cinda here.";

// To
const CINDA_GREETING = "👋\nHey, Cinda here.";
```

**2. Add whitespace-pre-line to preserve the newline (line 322)**

The message paragraph needs to render the `\n` as an actual line break:

```tsx
// From
<p className="text-sm leading-relaxed text-card-foreground/70">

// To
<p className="text-sm leading-relaxed text-card-foreground/70 whitespace-pre-line">
```

---

## Logo Status

The typing indicator uses `cinda-logo-grey.png`. Looking at the available assets:
- `cinda-logo-grey.png` ✓ (currently used)
- `cinda-logo-white-v2.png` (updated white version)
- `cinda-logo-white.png` (old white)
- `cinda-logo.png`

There is no `cinda-logo-grey-v2.png`, so the current grey logo appears to be the correct one to use. No logo change needed.

---

## Result

The greeting will display as:
```
👋
Hey, Cinda here.
```

Instead of:
```
👋 Hey, Cinda here.
```
