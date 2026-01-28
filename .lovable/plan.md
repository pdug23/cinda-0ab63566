
# User Icon Menu with Sign-Out Option

## Overview

Add a circular user icon to the header that appears when users are signed in. Clicking the icon reveals a dropdown menu showing the user's display name (or email) and a "Sign out" option. This provides a consistent way for authenticated users to manage their session across the app.

---

## User Flow

```text
User is signed in
       ↓
┌─────────────────────────────────────────┐
│  BACK    [👤]           SKIP/NEXT       │
│           ↓                             │
│    ┌─────────────┐                      │
│    │ John Smith  │  ← display name      │
│    │─────────────│                      │
│    │  Sign out   │  ← clickable         │
│    └─────────────┘                      │
└─────────────────────────────────────────┘
       ↓
   (on sign out)
       ↓
   Icon disappears, user returns to landing
```

---

## Changes Summary

| File | Change |
|------|--------|
| `src/components/UserMenu.tsx` | **New** - Reusable user icon with dropdown menu |
| `src/components/OnboardingLayout.tsx` | Add UserMenu between back and skip/next buttons |
| `src/pages/Recommendations.tsx` | Add UserMenu to header |
| `src/pages/Landing.tsx` | Add UserMenu to landing page 2 header (optional) |

---

## Technical Implementation

### 1. UserMenu Component

Create a new reusable component that handles the user icon and dropdown:

```typescript
// src/components/UserMenu.tsx
interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null; // Only show when signed in
  
  const displayName = user.user_metadata?.full_name 
    || user.user_metadata?.name 
    || user.email;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {/* Circular user icon */}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

**Design details:**
- Circular icon (h-7 w-7 to match header height)
- Subtle border matching card-foreground/20
- User silhouette icon (lucide-react `User` icon)
- Dropdown has dark background matching modal design system
- Display name in muted grey, "Sign out" with hover effect

### 2. OnboardingLayout Integration

The OnboardingLayout header currently has:
- Left: Back button (optional)
- Right: Skip/Next button (optional)

We'll add the UserMenu in the center:

```typescript
// src/components/OnboardingLayout.tsx
<div className="flex items-center justify-between ...">
  {/* Left - Back button */}
  <div className="w-16">
    {showBack && <Button>BACK</Button>}
  </div>
  
  {/* Center - User Menu */}
  <UserMenu />
  
  {/* Right - Skip/Next button */}
  <div className="w-16">
    {showSkip && <Button>SKIP</Button>}
  </div>
</div>
```

### 3. Recommendations Page Integration

The Recommendations page has its own header structure. We'll add the UserMenu in a similar position:

```typescript
// src/pages/Recommendations.tsx header section
<div className="flex items-center justify-between ...">
  <Button onClick={handleBack}>BACK</Button>
  <UserMenu />
  <div className="w-16" /> {/* Spacer for balance */}
</div>
```

### 4. Landing Page (Optional)

On landing page 2 (after clicking "Find yours"), we could show the UserMenu if the user is already signed in. This gives them visibility that they're logged in before proceeding.

---

## Dropdown Menu Styling

Following the modal design system:

```typescript
<DropdownMenuContent className="bg-card border-border/40 min-w-[160px]">
  <DropdownMenuLabel className="text-card-foreground/70 font-normal text-sm">
    {displayName}
  </DropdownMenuLabel>
  <DropdownMenuSeparator className="bg-border/40" />
  <DropdownMenuItem 
    className="text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer"
    onClick={handleSignOut}
  >
    <LogOut className="mr-2 h-4 w-4" />
    Sign out
  </DropdownMenuItem>
</DropdownMenuContent>
```

---

## Quick Match Consideration

Quick Match will **not** show the UserMenu since it's designed to be a completely ungated, open experience. Users can get quick recommendations without any authentication UI.

---

## Files to Create/Modify

1. **`src/components/UserMenu.tsx`** (New)
   - Reusable component with icon trigger and dropdown
   - Conditionally renders only when user is signed in
   - Handles sign out and navigation

2. **`src/components/OnboardingLayout.tsx`**
   - Import and add UserMenu to header between back/skip buttons
   - Adjust header layout for center element

3. **`src/pages/Recommendations.tsx`**
   - Import and add UserMenu to header section

4. **`src/pages/Landing.tsx`** (Optional)
   - Add UserMenu to landing page 2 header for signed-in users

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User not signed in | UserMenu component returns null (invisible) |
| No display name available | Falls back to email address |
| Sign out clicked | Clear session, navigate to landing page |
| Long display name | Truncate with ellipsis in dropdown |
