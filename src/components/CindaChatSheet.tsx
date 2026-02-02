import { useState, useRef, useEffect } from "react";
import { ArrowUp, Mic, MicOff, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProfile, ChatMessage, ChatContext } from "@/contexts/ProfileContext";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import cindaLogoGrey from "@/assets/cinda-logo-grey.png";
import TypewriterText from "@/components/TypewriterText";

const CINDA_GREETING = "Hey, Cinda here.";

const CINDA_FOLLOWUPS = [
  "You've told me the basics, but running's personal. Past injuries, shoes that didn't work out, weird fit issues, weather you run in... if there's anything else that might help, let me know.",
  "Thanks for the info so far. Before I find your shoes — anything else I should know? Injuries, fit quirks, shoes you've loved or hated, or the weather you usually run in?",
  "Almost there. If there's anything the questions didn't cover — past injuries, brands that don't work for you, wet or hot conditions, that kind of thing — now's the time.",
  "One more thing before I get your recommendations. Anything else that might affect your shoe choice? Injuries, fit issues, weather conditions, specific needs?",
  "Got the basics. If there's anything personal that might help — an old injury, a shoe that never worked, wide feet, rainy climate — feel free to share.",
];

const getRandomFollowup = () => CINDA_FOLLOWUPS[Math.floor(Math.random() * CINDA_FOLLOWUPS.length)];

interface CindaChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showIntro?: boolean; // Whether to show the intro sequence
}

export const CindaChatSheet = ({ open, onOpenChange, showIntro = false }: CindaChatSheetProps) => {
  const { profileData, updateChatHistory, updateChatContext } = useProfile();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Local state for messages (synced from context)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);

  // Intro sequence state
  const [introPhase, setIntroPhase] = useState<'idle' | 'typing1' | 'message1' | 'pause' | 'typing2' | 'message2' | 'done'>('idle');
  const [selectedFollowup] = useState(() => getRandomFollowup());

  // Speech-to-text hook
  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechToText({
    language: "en-GB",
    onResult: (text) => {
      setInputValue((prev) => {
        const separator = prev.trim() ? " " : "";
        return prev + separator + text;
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Voice input error",
        description: error,
      });
    },
  });

  // Sync messages from context when sheet opens
  useEffect(() => {
    if (open) {
      const existingHistory = profileData.step3.chatHistory;
      setMessages(existingHistory);
      
      // Determine if we need to show intro
      if (showIntro && existingHistory.length === 0) {
        setIntroPhase('typing1');
        setIsTyping(true);
      } else {
        setIntroPhase('done');
        // Focus input after a short delay
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      // Reset intro phase when sheet closes
      setIntroPhase('idle');
    }
  }, [open, profileData.step3.chatHistory, showIntro]);

  // Multi-phase intro sequence
  useEffect(() => {
    if (!open || introPhase === 'idle' || introPhase === 'done') return;

    let timer: NodeJS.Timeout;

    switch (introPhase) {
      case 'typing1':
        // Show typing indicator for 1s, then show first message
        timer = setTimeout(() => {
          setIsTyping(false);
          const greetingMessage: ChatMessage = {
            role: 'assistant',
            content: CINDA_GREETING,
            timestamp: new Date(),
          };
          setMessages([greetingMessage]);
          setTypingMessageIndex(0);
          setIntroPhase('message1');
        }, 1000);
        break;

      case 'message1':
        // Wait for typewriter to complete, handled by onComplete callback
        break;

      case 'pause':
        // 500ms pause, then show typing indicator again
        timer = setTimeout(() => {
          setIsTyping(true);
          setIntroPhase('typing2');
        }, 500);
        break;

      case 'typing2':
        // Show typing indicator for 1s, then show second message
        timer = setTimeout(() => {
          setIsTyping(false);
          const followupMessage: ChatMessage = {
            role: 'assistant',
            content: selectedFollowup,
            timestamp: new Date(),
          };
          setMessages(prev => {
            const updated = [...prev, followupMessage];
            updateChatHistory(updated);
            return updated;
          });
          setTypingMessageIndex(1);
          setIntroPhase('message2');
        }, 1000);
        break;

      case 'message2':
        // Wait for typewriter to complete, handled by onComplete callback
        break;
    }

    return () => clearTimeout(timer);
  }, [open, introPhase, selectedFollowup, updateChatHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, open]);

  // Focus input after intro completes
  useEffect(() => {
    if (introPhase === 'done' && !isTyping && open) {
      inputRef.current?.focus();
    }
  }, [introPhase, isTyping, open]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsTyping(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }

    try {
      // Build conversation history
      const conversationHistory = newMessages
        .slice(1) // Skip opening message
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          profile: profileData,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      const cindaResponse: ChatMessage = {
        role: "assistant",
        content: data.response || data.message || "Thanks, I'll keep that in mind.",
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, cindaResponse];
      setMessages(updatedMessages);
      setTypingMessageIndex(updatedMessages.length - 1);
      updateChatHistory(updatedMessages);

      // Merge extracted context if present
      if (data.extractedContext) {
        updateChatContext(data.extractedContext as Partial<ChatContext>);
      }
    } catch (error) {
      console.error("Chat API error:", error);

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Hmm, something went wrong. Try again?",
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      setTypingMessageIndex(updatedMessages.length - 1);
      updateChatHistory(updatedMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle typewriter completion for intro sequence
  const handleTypewriterComplete = () => {
    setTypingMessageIndex(null);
    // Progress intro phases when typewriter completes
    if (introPhase === 'message1') {
      setIntroPhase('pause');
    } else if (introPhase === 'message2') {
      setIntroPhase('done');
    }
  };

  const isInputDisabled = isTyping || (introPhase !== 'done' && introPhase !== 'idle');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl bg-card border-t border-border/40 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-4 pb-2 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-medium text-card-foreground/90">
              Chat with Cinda
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 -m-2 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-styled touch-pan-y px-6 py-4 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "animate-fade-in",
                message.role === "assistant" ? "max-w-[90%] mr-auto" : "max-w-[80%] ml-auto w-fit"
              )}
            >
              {message.role === "assistant" ? (
                <p className="text-sm leading-relaxed text-card-foreground/70 whitespace-pre-line">
                  {typingMessageIndex === index ? (
                    <TypewriterText
                      text={message.content}
                      speed={40}
                      onComplete={handleTypewriterComplete}
                    />
                  ) : (
                    message.content
                  )}
                </p>
              ) : (
                <div
                  className="rounded-2xl px-4 py-3 bg-card-foreground/[0.04] border border-card-foreground/10"
                  style={{ wordBreak: "break-word" }}
                >
                  <p className="text-sm leading-relaxed text-card-foreground/90">{message.content}</p>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="animate-fade-in">
              <img
                src={cindaLogoGrey}
                alt="Cinda is typing"
                className="w-6 h-6 opacity-50 animate-spin"
                style={{ animationDuration: "2s" }}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-6 pb-6 pt-3 border-t border-border/20">
          <div className="bg-card-foreground/[0.04] rounded-2xl px-4 py-2.5 border border-card-foreground/10 focus-within:border-card-foreground/20 transition-colors">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Reply..."
                rows={1}
                disabled={isInputDisabled}
                className={cn(
                  "flex-1 w-full bg-transparent resize-none text-base md:text-sm leading-relaxed",
                  "text-card-foreground placeholder:text-card-foreground/30",
                  "focus:outline-none",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "overflow-y-auto scrollbar-styled"
                )}
                style={{ minHeight: "24px", maxHeight: "96px" }}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={isInputDisabled}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "transition-colors",
                      isListening
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-card-foreground/10 text-card-foreground/50 hover:bg-card-foreground/15 hover:text-card-foreground/70",
                      "disabled:opacity-30 disabled:cursor-not-allowed"
                    )}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isInputDisabled}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "bg-card-foreground/15 text-card-foreground/60",
                    "hover:bg-card-foreground/20 hover:text-card-foreground/80",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
