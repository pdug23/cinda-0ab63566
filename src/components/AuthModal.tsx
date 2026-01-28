import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: "google" | "apple") => {
    setIsLoading(provider);
    setError(null);

    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) {
        // Page is redirecting to OAuth provider
        return;
      }

      if (result.error) {
        setError(result.error.message);
        setIsLoading(null);
        return;
      }

      // Success - close modal and call success callback
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-lg">
            Sign in to unlock Full Analysis
          </DialogTitle>
          <DialogDescription className="text-card-foreground/70 text-sm pt-2">
            Create an account to get personalized recommendations and save your preferences
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          {/* Google Sign In Button */}
          <Button
            variant="outline"
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 hover:border-gray-400 transition-all"
            onClick={() => handleSignIn("google")}
            disabled={isLoading !== null}
          >
            {isLoading === "google" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Apple Sign In Button */}
          <Button
            variant="outline"
            className="w-full h-12 bg-black hover:bg-gray-900 text-white border-black hover:border-gray-800 transition-all"
            onClick={() => handleSignIn("apple")}
            disabled={isLoading !== null}
          >
            {isLoading === "apple" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </>
            )}
          </Button>

          {/* Maybe later button */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-card-foreground hover:bg-transparent"
            onClick={() => onOpenChange(false)}
            disabled={isLoading !== null}
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
