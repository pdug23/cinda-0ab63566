import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";
import AnimatedBackground from "@/components/AnimatedBackground";
import cindaLogo from "@/assets/cinda-logo-grey.png";
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


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const starterPrompts = [
  {
    label: "new to running",
    message: "I'm new to running and don't really know where to start. I'm looking for guidance on shoes that would suit a beginner.",
  },
  {
    label: "training help",
    message: "I'm training for a goal and want help choosing the right shoes for my training.",
  },
  {
    label: "pb time",
    message: "I'm looking for a race-day shoe to help me perform at my best and run my fastest.",
  },
  {
    label: "something different",
    message: "I've been running for a while but I'm bored of my current shoes and want to try something different.",
  },
  {
    label: "explore a brand",
    message: "I'd like to explore running shoes from a specific brand and understand how their models differ.",
  },
];

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
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

  const [a2hsModalOpen, setA2hsModalOpen] = useState(true);

  useEffect(() => {
    if (!a2hsModalOpen) {
      textareaRef.current?.focus();
    }
  }, [a2hsModalOpen]);

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

  const handleStarterClick = (prompt: string, index: number) => {
    // Toggle: if already selected, clear; otherwise select
    if (selectedPromptIndex === index) {
      setSelectedPromptIndex(null);
      setInput("");
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "24px";
          textareaRef.current.focus();
        }
      });
    } else {
      setSelectedPromptIndex(index);
      setInput(prompt);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          textareaRef.current.focus();
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();

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
    <>
      <AnimatedBackground />
      <div className="h-full flex flex-col overflow-hidden relative z-10">
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between relative z-10 flex-shrink-0">
        {/* Left: Alpha badge + Report a Bug */}
        <div className="flex items-center gap-2">
          <span className="h-7 px-4 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase text-card-foreground/70 border border-card-foreground/30 rounded-full shadow-[0_0_20px_hsl(var(--accent)/0.3)]">
            Alpha
          </span>
          <button
            type="button"
            className="h-7 px-3 flex items-center justify-center rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
          >
            Report a Bug
          </button>
        </div>

        {/* Right: Restart button */}
        <button
          type="button"
          onClick={handleRestartClick}
          className="w-7 h-7 flex items-center justify-center rounded-full text-card-foreground/60 hover:text-card-foreground hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
          aria-label="New chat"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main chat area */}
      <main className="flex-1 flex items-start justify-center px-4 pt-1 pb-[env(safe-area-inset-bottom,16px)] md:px-6 min-h-0">
        <div className="w-full max-w-3xl h-full flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">

          {/* Messages area */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="space-y-4 mb-8">
                  <img src={cindaLogo} alt="Cinda" className="h-[104px] mx-auto" />
                  <p className="text-2xl text-card-foreground/90 max-w-md leading-tight font-extrabold italic" style={{ fontVariantLigatures: 'none' }}>
                    Every runner deserves to find their perfect fit.
                  </p>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Tell me a bit about you and I'll recommend shoes that suit how you run.
                  </p>
                </div>
                
                {/* Starter prompt chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {starterPrompts.map((prompt, index) => {
                    const isSelected = selectedPromptIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={(e) => {
                          handleStarterClick(prompt.message, index);
                          // Blur button to remove focus state on mobile
                          (e.target as HTMLButtonElement).blur();
                        }}
                        className={`text-xs rounded-full px-4 py-2 transition-all duration-300 ease-out animate-fade-in focus:outline-none ${
                          isSelected
                            ? "text-card-foreground bg-accent/15 border border-accent/30 shadow-[0_2px_16px_hsl(var(--accent)/0.15)]"
                            : "text-muted-foreground/70 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-accent/10 border border-accent/[0.08] hover:border-accent/25 hover:shadow-[0_2px_16px_hsl(var(--accent)/0.12)] hover:-translate-y-0.5"
                        }`}
                        style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
                      >
                        {prompt.label}
                      </button>
                    );
                  })}
                </div>
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
          <div className="p-4 border-t border-border/20">

            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 bg-input/50 rounded-xl px-3 py-2 border border-border/30 focus-within:border-accent/50 transition-colors">
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
                  placeholder="Message Cinda…"
                  rows={1}
                  className="flex-1 bg-transparent text-card-foreground placeholder:text-muted-foreground focus:outline-none text-[14px] resize-none overflow-y-auto scrollbar-styled leading-normal"
                  style={{ height: "24px", minHeight: "24px", maxHeight: "200px" }}
                />
                <Button type="submit" variant="send" size="icon-sm" disabled={!input.trim()}>
                  <Send />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Restart confirmation dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent className="bg-card border-border/30 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0">
          <AlertDialogHeader className="p-4 pb-0 relative">
            <button
              onClick={() => setShowRestartDialog(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <AlertDialogTitle className="text-lg font-semibold text-card-foreground">restart chat?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-4 pt-4 pb-6">
            <p className="text-sm text-card-foreground/70">
              this will clear the current conversation and start fresh. this action cannot be undone.
            </p>
          </div>
          <AlertDialogFooter className="flex flex-col gap-2 p-4 pt-0">
            <AlertDialogAction
              onClick={confirmRestart}
              className="w-full min-h-[44px] bg-transparent border border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm rounded-lg"
            >
              restart chat
            </AlertDialogAction>
            <AlertDialogCancel className="w-full min-h-[44px] bg-transparent border border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm rounded-lg mt-0">
              cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Home Screen onboarding modal */}
      <AddToHomeScreenModal onClose={() => setA2hsModalOpen(false)} />
    </div>
    </>
  );
};

export default Chat;
