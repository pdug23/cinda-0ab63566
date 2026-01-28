
# Gate Full Analysis Behind Google/Apple Sign-In

## Overview

When users click "Full Analysis" on landing page 2, a sign-in modal will appear offering Google and Apple authentication options. After signing in, users continue to the profile builder flow. User preferences and recommendations will be saved to their profile for future visits.

---

## User Flow

```text
User clicks "Full Analysis"
         ↓
┌─────────────────────────────┐
│   Sign In Modal Appears     │
│                             │
│   [Sign in with Google]     │
│   [Sign in with Apple]      │
│                             │
│      Maybe later            │
└─────────────────────────────┘
         ↓
   (on successful sign-in)
         ↓
   Continue to /profile
```

---

## Changes Summary

| File | Change |
|------|--------|
| `src/integrations/lovable/` | **New** - Generated via configure-social-auth tool for Google & Apple OAuth |
| `src/components/AuthModal.tsx` | **New** - Shared sign-in modal with Google/Apple buttons |
| `src/contexts/AuthContext.tsx` | **New** - Auth state management (user, loading, signOut) |
| `src/pages/Landing.tsx` | Show AuthModal when "Full Analysis" clicked; check auth state |
| `src/App.tsx` | Wrap app with AuthProvider |
| Database | **New** `profiles` table to store user preferences |

---

## Technical Implementation

### 1. Configure OAuth Providers

Use Lovable Cloud's managed OAuth solution to enable:
- Google Sign-In
- Apple Sign-In

This generates the `src/integrations/lovable/` module with the `lovable.auth.signInWithOAuth()` function.

### 2. Create Profiles Table

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Auth Context

```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

- Listen to `onAuthStateChange` for session updates
- Provide user state across the app
- Handle sign out functionality

### 4. Auth Modal Component

```typescript
// src/components/AuthModal.tsx
- Dark aesthetic matching existing modals
- "Sign in to unlock Full Analysis" heading
- Two buttons: Google and Apple (with brand icons)
- "Maybe later" link to close
- On success: close modal and navigate to /profile
```

**Button styling:**
- Google: White background with Google "G" icon
- Apple: Black background with Apple logo

### 5. Landing Page Changes

```typescript
// src/pages/Landing.tsx
const [showAuthModal, setShowAuthModal] = useState(false);
const { user } = useAuth();

const handleFullAnalysis = () => {
  if (user) {
    // Already signed in, proceed directly
    handleStartProfile();
  } else {
    // Not signed in, show auth modal
    setShowAuthModal(true);
  }
};

// In the modal's onSuccess callback:
// Navigate to /profile after successful sign-in
```

### 6. App.tsx Updates

```typescript
// Wrap with AuthProvider
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <TooltipProvider>
      <ProfileProvider>
        {/* ... rest of app */}
      </ProfileProvider>
    </TooltipProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## Additional Considerations

### Future Enhancements (Not in this implementation)
1. **Saving recommendations**: Once auth is working, we can add a `saved_recommendations` table to persist user's shortlisted shoes
2. **Profile persistence**: Save the `ProfileContext` data to the `profiles` table so returning users don't have to re-enter information
3. **Sign out**: Add a sign-out option somewhere in the app (settings, menu, etc.)

### What about Quick Match?
- Quick Match remains ungated - users can still get quick recommendations without signing in
- This gives users a taste of the app before committing to the full flow

### Existing ShortlistAuthModal
- The existing `ShortlistAuthModal` on the recommendations page can be updated to use the same auth logic once this is implemented
- For now, we'll create a new `AuthModal` component that can be reused across the app

---

## Files to Create/Modify

1. **Configure OAuth** (tool call) - Generates `src/integrations/lovable/`
2. **Database migration** - Create `profiles` table with trigger
3. **`src/contexts/AuthContext.tsx`** - New auth context
4. **`src/components/AuthModal.tsx`** - New shared auth modal
5. **`src/pages/Landing.tsx`** - Add auth gate to Full Analysis
6. **`src/App.tsx`** - Add AuthProvider wrapper
