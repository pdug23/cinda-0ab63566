import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";
import { createEmptyRunnerProfile, type RunnerProfile } from "@/lib/runnerProfile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const mockResponse = `**Primary Recommendation**
The Nike Pegasus 41 would be an excellent choice for your training.

**Why It Fits**
Based on what you've shared, this shoe offers the right balance of cushioning and responsiveness for daily runs. The React foam provides durability for higher mileage weeks while remaining light enough for tempo efforts.

**Trade-offs**
It's a versatile trainer rather than a specialist—not as bouncy as a super-shoe for racing, and not as cushioned as a max-stack recovery shoe.

**One Follow-up Question**
How do you feel about heel-toe drop—do you prefer something more traditional or are you open to lower-drop shoes?`;

const starterPrompts = [
  "I'm new to running and don't know where to start.",
  "I'm training for a race and need the right shoes.",
  "I'm bored of my current shoes and want something different.",
  "I want a shoe for my everyday runs.",
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
    if (text.includes("wide") || text.includes("roomy") || text.includes("toe box") || text.includes("toebox")) {
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

  return next;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [runnerProfile, setRunnerProfile] = useState<RunnerProfile>(createEmptyRunnerProfile());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const updatedRunnerProfile = applyRunnerProfileUpdates(runnerProfile, userText); 
      setRunnerProfile(updatedRunnerProfile);

      console.log("updatedRunnerProfile", updatedRunnerProfile);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
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
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-3 flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-2xl font-semibold text-card-foreground">Cinda</span>
          <span className="text-xs text-card-foreground/60 font-light tracking-wide">
            Find your perfect fit.
          </span>
        </div>
        <span className="px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-card-foreground/70 border border-card-foreground/30 rounded-full">
          Alpha
        </span>
      </header>

      {/* Main chat area */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 md:px-6">
        <div className="w-full max-w-3xl h-[calc(100vh-100px)] flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-8">
                <p className="text-lg text-card-foreground/90 max-w-md leading-relaxed">
                  Tell me about your running and what you're looking for.
                </p>
                <p className="text-muted-foreground max-w-md text-sm">
                  I'll help you find the right shoe for how you train, race, and feel on your
                  runs.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

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
              <div className="flex items-end gap-3 bg-input/50 rounded-xl px-4 py-3 border border-border/30 focus-within:border-accent/50 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
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
                  className="flex-1 bg-transparent text-card-foreground placeholder:text-muted-foreground focus:outline-none text-sm md:text-base resize-none overflow-y-auto scrollbar-styled"
                  style={{ maxHeight: '200px' }}
                />
                <Button type="submit" variant="send" size="icon" disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
