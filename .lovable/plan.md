
# Fix Speech Recognition "Aborted" Error

## Root Cause

The `useSpeechToText` hook has a critical bug in its `useEffect` dependency array. The hook includes `onResult` and `onError` callbacks as dependencies:

```tsx
useEffect(() => {
  // ... creates recognition instance ...
  return () => {
    recognition.abort();  // ← This triggers "aborted" error
  };
}, [continuous, language, onResult, onError]);  // ← Problem!
```

When `ProfileBuilderStep3b` passes inline arrow functions for `onResult` and `onError`, these are **new function references on every render**. This causes the `useEffect` to re-run, which:

1. Calls the cleanup function (`recognition.abort()`)
2. The abort triggers the `onerror` handler with `error: "aborted"`
3. The error handler calls `onError` which shows the toast

This happens immediately after the user grants microphone permission because granting permission triggers a re-render.

## Solution

Stabilize the hook by removing callback dependencies from the `useEffect` and using refs to store the latest callback values. This is a standard React pattern for preventing stale closures while avoiding dependency issues.

---

## Technical Changes

### File: `src/hooks/useSpeechToText.ts`

**1. Add refs to store latest callbacks (after line 59)**

```typescript
const onResultRef = useRef(onResult);
const onErrorRef = useRef(onError);
```

**2. Keep refs updated with latest values (after the refs)**

```typescript
useEffect(() => {
  onResultRef.current = onResult;
  onErrorRef.current = onError;
}, [onResult, onError]);
```

**3. Update the main useEffect to use refs instead of direct callbacks**

- Change `onError?.(errorMessage)` to `onErrorRef.current?.(errorMessage)`
- Change `onResult?.(finalTranscript)` to `onResultRef.current?.(finalTranscript)`
- Remove `onResult` and `onError` from the dependency array

**4. (Optional) Handle "aborted" error gracefully**

Add "aborted" to the error handler to silently ignore it, since it's often triggered by intentional cleanup:

```typescript
recognition.onerror = (event) => {
  setIsListening(false);
  
  // Ignore aborted - this happens during cleanup
  if (event.error === "aborted") return;
  
  // ... rest of error handling
};
```

---

## Summary of Changes

| Change | Purpose |
|--------|---------|
| Add `onResultRef` and `onErrorRef` | Store stable references to callbacks |
| Sync refs in separate useEffect | Keep refs current without triggering recreation |
| Use refs in event handlers | Access latest callbacks without stale closure |
| Remove callbacks from deps | Prevent unnecessary recreation of recognition |
| Ignore "aborted" error | Silent cleanup without alarming users |
