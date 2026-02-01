

# Fix Microphone Push-to-Talk Transcription

## Problem

When you click the microphone button and speak, the text doesn't get transcribed into the text box. The microphone appears to activate (icon changes), but speech isn't captured.

## Root Cause

The current `useSpeechToText` hook has two issues:

1. **Non-continuous mode**: With `continuous = false`, the browser auto-stops after a brief silence, often before the user clicks to stop
2. **Lost interim results**: When the user manually stops, any accumulated speech that wasn't marked as "final" by the browser gets discarded

## Desired Behavior

- Click microphone button → start listening
- Speak freely (can pause, continue speaking)
- Click microphone button again → stop and transcribe everything spoken into the text box

## Solution

Rewrite the `useSpeechToText` hook to support proper push-to-talk:

1. **Enable continuous mode** with auto-restart on silence timeout
2. **Accumulate all transcribed text** during the session
3. **Deliver accumulated text on stop** - when user clicks stop, send all accumulated text to the input

### Technical Changes

**File: `src/hooks/useSpeechToText.ts`**

```text
Key changes:
- Use continuous = true for ongoing recognition
- Add isListeningRef to track user intent (for auto-restart on silence)
- Accumulate full transcript across all results
- On stopListening, deliver accumulated text via onResult callback
- Handle browser auto-stop (no-speech timeout) by auto-restarting
```

**Updated hook behavior:**
- `startListening()`: Sets intent flag, starts recognition, clears accumulated text
- `stopListening()`: Clears intent flag, stops recognition, delivers accumulated text via `onResult`
- `onend` handler: If user still intends to listen (intent flag true), auto-restart recognition
- `onresult` handler: Accumulate both interim and final results into running transcript
- `transcript`: Shows live preview of what's being captured (for UI feedback if needed)

### Code Structure

```typescript
// New state
const isListeningRef = useRef(false);  // Tracks user intent to keep listening
const accumulatedTextRef = useRef(""); // Accumulates all transcribed text

// On startListening
isListeningRef.current = true;
accumulatedTextRef.current = "";
recognition.start();

// On stopListening  
isListeningRef.current = false;
recognition.stop();
// Deliver accumulated text
if (accumulatedTextRef.current.trim()) {
  onResult(accumulatedTextRef.current.trim());
}

// On recognition.onend
if (isListeningRef.current) {
  recognition.start(); // Auto-restart if user still wants to listen
}

// On recognition.onresult
// Accumulate all final transcripts
for each result marked isFinal:
  accumulatedTextRef.current += result.transcript;
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSpeechToText.ts` | Rewrite to support push-to-talk with accumulated text delivery on stop |

## Testing

After implementation:
1. Navigate to /profile/step3b
2. Click the microphone button (should show active state)
3. Speak a sentence or two
4. Click the microphone button again to stop
5. Verify the spoken text appears in the text box

