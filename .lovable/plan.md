
Goal
- Remove the persistent grey bar at the bottom on iOS by ensuring the “page canvas” (what Safari/iOS shows in safe-area + UI overlay regions) uses the same nebula background as the app, and by eliminating any layout/scroll-lock behavior that can cause the background to stop painting into that region.
- Confirm there is no leftover “reserved space” from the old placeholder.

What I found (deep dive)
1) The “reserved space for the old placeholder” is already gone
- In `src/components/OnboardingLayout.tsx`, the bottom area is only rendered when `bottomText` exists:
  - `{bottomText && ( ... )}`
- There is no longer a permanently reserved spacer/min-height there. So the grey bar is not coming from an old placeholder.

2) The grey bar is most likely the root canvas background showing through
- Right now `src/index.css` sets:
  - `html { background-color: #1e1e1e; }` (solid color)
  - `body` has a gradient background, BUT…
- In browsers (especially iOS Safari / iOS WebView), the “canvas” background that appears in certain UI/safe-area situations often comes from the `html` element’s background (and/or the PWA manifest background), not the `body` background, and not always from fixed-position React layers.
- That means any tiny region where the animated layers don’t paint perfectly (common on iOS around the bottom safe-area / toolbar overlay) will show the solid `html` background color as a uniform strip, which reads as a “grey bar”.

3) Your PWA manifest still uses the old colors
- `public/manifest.json` still has:
  - `"background_color": "#1f1f1f"`
  - `"theme_color": "#1f1f1f"`
- Even if the website CSS is correct, iOS can use these values for certain “system-owned” regions and transitions. If they don’t match the app’s background, it can look like a persistent band.

4) There is a potentially risky scroll-lock in OnboardingLayout
- `OnboardingLayout` currently sets at runtime:
  - `html.style.overflow = "hidden"; html.style.height = "100%";`
  - `body.style.overflow = "hidden"; body.style.height = "100%";`
- On iOS, forcing `height: 100%` like this can interact poorly with dynamic viewport/safe-area behavior and can contribute to “unpainted” strips where the browser shows the root background instead.
- Even if this isn’t the only cause, it’s a known footgun on iOS and is not necessary when your entire app surface is already `fixed inset-0` and uses internal scrolling.

Implementation approach (what we’ll change)
A) Make the nebula background live on `html` (not just a solid color)
- Update `src/index.css` so `html` uses the same gradient background (and base color) as `body` currently does.
- Then make `body` background transparent (or minimal), so the canvas background is always the nebula, including any bottom safe-area / toolbar overlay quirks.
- Result: even if iOS reveals the root canvas, it will show the nebula background instead of a flat grey strip.

B) Update the PWA manifest colors to match
- Update `public/manifest.json`:
  - `background_color` → `#1e1e1e`
  - `theme_color` → `#1e1e1e`
- This won’t animate (manifest can’t do gradients), but it prevents iOS from choosing a mismatched grey during app launch / system UI blending. Combined with (A), it should eliminate visible bars.

C) Soften/remove the iOS-problematic “height: 100%” scroll lock
- In `src/components/OnboardingLayout.tsx`, adjust the scroll-lock effect:
  - Stop setting `html.style.height` and `body.style.height` to `"100%"`
  - Keep (or optionally remove) `overflow: hidden` depending on whether body scrolling becomes an issue.
- The app already uses fixed layouts and internal scrolling, so this change should not break the UX, but it reduces iOS viewport weirdness significantly.

D) Verification steps (what we’ll check after)
1) In Safari (browser mode):
- Open `/` and confirm the bottom band blends with the background (no solid grey strip).
2) In installed PWA:
- Remove the app from home screen, then re-add it (iOS caches manifest aggressively).
- Confirm the bottom safe-area region matches (no wasted space beyond what’s intentional).
3) Across multiple pages:
- Landing, Profile Builder steps, Chat, Recommendations.

Notes / expectations
- In Safari browser mode: you cannot truly “draw behind” the browser chrome if iOS treats part of it as system UI, but you can ensure any visible area it blends/overlays uses your intended background (that’s what A+B accomplish).
- In PWA/standalone: you should get full use of the screen, and any safe-area region will match the nebula, not grey.

Files we will touch
- `src/index.css`
  - Move the nebula background to `html` and ensure it covers the canvas.
  - Make `body` background transparent or minimal so `html` drives the visible background.
- `public/manifest.json`
  - Update `theme_color` and `background_color` to `#1e1e1e`.
- `src/components/OnboardingLayout.tsx`
  - Remove/adjust the height-setting portion of the scroll-lock to avoid iOS viewport painting issues.

If, after these changes, a thin band still appears on a specific iOS version/device
- We’ll add a short-lived debug overlay (only in dev) that prints:
  - `window.innerHeight`, `visualViewport.height`, safe-area inset values, and computed `html/body` backgrounds
- This will let us definitively confirm whether the strip is:
  1) Outside the viewport (system chrome), or
  2) Inside the viewport (layout/painting issue).
