import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import { createEmptyRunnerProfile, type RunnerProfile } from "@/lib/runnerProfile";
import { applyNegativeSignals } from "@/lib/negativeSignals";
import { CURATED_SHOE_NAMES } from "@/lib/curatedShoes";


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const starterPrompts = [
  "I'm new to running and don't know where to start.",
  "I'm training for a race and need the right shoes.",
  "I'm bored of my current shoes and want something different.",
  "Tell me all about the different Asics running shoes.",
];

const nowIso = () => new Date().toISOString();

function applyRunnerProfileUpdates(prev: RunnerProfile, userText: string): RunnerProfile {
  const text = userText.toLowerCase();

  // Copy existing profile (we will return a modified copy)
  const next: RunnerProfile =
    typeof structuredClone === "function"
      ? structuredClone(prev)
      : (JSON.parse(JSON.stringify(prev)) as RunnerProfile);

  // Helper to set a typed profile field safely
  const setField = <T,>(
    field: { value: T | null; source: any; confidence: any; updatedAt: string | null; raw: string | null },
    value: T,
    raw: string,
    confidence: "low" | "medium" | "high" = "high",
    source: "explicit" | "inferred" = "explicit"
  ) => {
    field.value = value;
    field.raw = raw;
    field.confidence = confidence;
    field.source = source;
    field.updatedAt = nowIso();
  };

  // 1) Shoe purpose (contextual)
  if (!next.currentContext.shoePurpose.value) {
    if (text.includes("race") || text.includes("marathon") || text.includes("half") || text.includes("10k") || text.includes("5k")) {
      setField(next.currentContext.shoePurpose, "race", userText, "high", "explicit");
    } else if (text.includes("trail") || text.includes("off-road") || text.includes("off road") || text.includes("cross country") || text.includes("xc")) {
      setField(next.currentContext.shoePurpose, "trail", userText, "high", "explicit");
    } else if (text.includes("tempo") || text.includes("interval") || text.includes("workout") || text.includes("speed")) {
      // Keep it simple for v1: map all faster sessions to tempo_workout
      setField(next.currentContext.shoePurpose, "tempo_workout", userText, "high", "explicit");
    } else if (text.includes("easy") || text.includes("recovery")) {
      setField(next.currentContext.shoePurpose, "easy_recovery", userText, "high", "explicit");
    } else if (text.includes("daily") || text.includes("everyday") || text.includes("all round") || text.includes("all-round") || text.includes("do it all") || text.includes("do-it-all")) {
      setField(next.currentContext.shoePurpose, "daily_trainer", userText, "high", "explicit");
    }
  }

  // 2) Foot width/volume (global)
  if (!next.profileCore.footWidthVolume.value) {
    if (text.includes("wide") || text.includes("roomy")) {
      setField(next.profileCore.footWidthVolume, "wide", userText, "high", "explicit");
    } else if (text.includes("narrow") || text.includes("low volume") || text.includes("low-volume")) {
      setField(next.profileCore.footWidthVolume, "narrow_low_volume", userText, "high", "explicit");
    } else if (text.includes("standard") || text.includes("normal width") || text.includes("regular fit")) {
      setField(next.profileCore.footWidthVolume, "standard", userText, "high", "explicit");
    } else if (text.includes("high volume") || text.includes("high-volume")) {
      setField(next.profileCore.footWidthVolume, "high_volume", userText, "high", "explicit");
    }
  }

  // 3) Stability need (global)
  if (!next.profileCore.stabilityNeed.value) {
    if (text.includes("stability") || text.includes("support") || text.includes("overpronat") || text.includes("flat feet") || text.includes("ankle rolls") || text.includes("need support")) {
      // v1: treat any explicit support request as stability
      setField(next.profileCore.stabilityNeed, "stability", userText, "high", "explicit");
    } else if (text.includes("neutral")) {
      setField(next.profileCore.stabilityNeed, "neutral", userText, "high", "explicit");
    }
  }

  // 4) Experience level (modifier)
  if (!next.profileCore.experienceLevel.value) {
    if (text.includes("new to running") || text.includes("just started") || text.includes("beginner")) {
      setField(next.profileCore.experienceLevel, "beginner", userText, "high", "explicit");

      // If they're brand new and haven't said what the shoe is for, assume "daily trainer" to keep things flowing
      if (!next.currentContext.shoePurpose.value) {
        setField(next.currentContext.shoePurpose, "daily_trainer", userText, "medium", "inferred");
      }
    } else if (text.includes("getting back into") || text.includes("returning") || text.includes("coming back")) {
      setField(next.profileCore.experienceLevel, "returning", userText, "high", "explicit");
    } else if (text.includes("experienced") || text.includes("been running for") || text.includes("i run a lot")) {
      setField(next.profileCore.experienceLevel, "advanced", userText, "medium", "inferred");
    }
  }

  // Optional: store cross country mention as a note
  if (!next.currentContext.notes && (text.includes("cross country") || text.includes("xc"))) {
    next.currentContext.notes = "Mentions cross country style running.";
  }

  applyNegativeSignals({
    runnerProfile: next,
    userText,
    curatedShoeNames: [...CURATED_SHOE_NAMES],
  });


  return next;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [runnerProfile, setRunnerProfile] = useState<RunnerProfile>(createEmptyRunnerProfile());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);

  const handleRestartClick = () => {
    if (messages.length === 0) {
      window.location.reload();
    } else {
      setShowRestartDialog(true);
    }
  };

  const confirmRestart = () => {
    window.location.reload();
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle scroll to position user message at top when sending
  useEffect(() => {
    if (shouldAutoScroll && lastUserMessageRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const messageEl = lastUserMessageRef.current;
      
      // Scroll so the user message is at the top of the visible area
      const containerRect = container.getBoundingClientRect();
      const messageRect = messageEl.getBoundingClientRect();
      const offsetFromContainerTop = messageRect.top - containerRect.top + container.scrollTop;
      
      container.scrollTo({
        top: offsetFromContainerTop,
        behavior: "smooth",
      });
    }
  }, [shouldAutoScroll, messages.length]);

  // Follow conversation while typing (streaming)
  useEffect(() => {
    if (shouldAutoScroll && isTyping && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isTyping, shouldAutoScroll]);

  // Scroll to bottom when assistant message arrives
  useEffect(() => {
    if (shouldAutoScroll && messagesContainerRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const container = messagesContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
        setShouldAutoScroll(false);
      }
    }
  }, [messages, shouldAutoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current || !shouldAutoScroll) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // If user scrolled away from bottom during auto-scroll period, disable it
    if (!isNearBottom && isTyping) {
      setShouldAutoScroll(false);
    }
  };

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();

    const updatedRunnerProfile = applyRunnerProfileUpdates(runnerProfile, userText);
    setRunnerProfile(updatedRunnerProfile);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    const nextMessages = [...messages, userMessage];
    
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);
    setShouldAutoScroll(true);
    
    // Reset textarea height to single line
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          runnerProfile: updatedRunnerProfile,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply ?? "Sorry, I could not generate a response.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry - something went wrong while generating a response. Please try again.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="w-full px-6 py-3 flex items-center justify-between relative z-10 flex-shrink-0">
        <button
          onClick={handleRestartClick}
          className="flex flex-col gap-0.5 text-left hover:opacity-80 transition-opacity"
        >
          <span className="text-3xl font-extrabold tracking-tight text-card-foreground font-display">Cinda</span>
          <span className="text-xs text-card-foreground italic font-medium tracking-wide">
            Find your perfect fit.
          </span>
        </button>
        <span className="px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-card-foreground/70 border border-card-foreground/30 rounded-full">
          Alpha
        </span>
      </header>

      {/* Main chat area */}
      <main className="flex-1 flex items-start justify-center px-4 pt-2 pb-[env(safe-area-inset-bottom,16px)] md:px-6 min-h-0">
        <div className="w-full max-w-3xl h-full flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">
          {/* Messages area */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-8">
                <p className="text-2xl text-card-foreground/90 max-w-md leading-relaxed">
                  👋 Hi, I'm <span className="font-display font-extrabold">Cinda</span>!
                </p>
                <p className="text-muted-foreground max-w-md text-sm">
                  Talk to me about your running and I'll help you find the right shoe for how you train, race, and feel on your runs.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const isLastUserMessage = message.role === "user" && 
                messages.slice(index + 1).every(m => m.role !== "user");
              return (
                <div 
                  key={message.id} 
                  ref={isLastUserMessage ? lastUserMessageRef : undefined}
                >
                  <ChatMessage message={message} />
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse delay-75" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse delay-150" />
                </div>
                <span className="text-sm">Cinda is thinking...</span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-border/20 space-y-3">
            {/* Starter prompts - only show when no messages */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {starterPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleStarterClick(prompt)}
                    className="text-xs text-muted-foreground hover:text-card-foreground border border-border/30 hover:border-border/50 rounded-full px-3 py-1.5 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartClick}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-border/20 transition-colors"
                  aria-label="New chat"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center gap-2 bg-input/50 rounded-xl px-3 py-2 border border-border/30 focus-within:border-accent/50 transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Tell me about your running…"
                    rows={1}
                    className="flex-1 bg-transparent text-card-foreground placeholder:text-muted-foreground focus:outline-none text-base resize-none overflow-y-auto scrollbar-styled leading-normal"
                    style={{ height: "24px", minHeight: "24px", maxHeight: "200px" }}
                  />
                  <Button type="submit" variant="send" size="icon-sm" disabled={!input.trim()}>
                    <Send />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Restart confirmation dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent className="bg-card border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">Restart chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will clear the current conversation and start fresh. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border/30 text-card-foreground hover:bg-border/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Restart chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Home Screen onboarding modal */}
      <AddToHomeScreenModal />
    </div>
  );
};

export default Chat;
