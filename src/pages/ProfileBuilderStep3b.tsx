import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ArrowUp, Mic, X } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import TypewriterText from "@/components/TypewriterText";
import { useProfile, ChatMessage, ChatContext } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";
import cindaLogoGrey from "@/assets/cinda-logo-grey.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CINDA_GREETING = "👋 hey, cinda here.";

const CINDA_FOLLOWUPS = [
  "you've told me the basics, but running's personal. past injuries, shoes that didn't work out, weird fit issues, weather you run in... if there's anything else that might help, let me know.",
  "thanks for the info so far. before i find your shoes — anything else i should know? injuries, fit quirks, shoes you've loved or hated, or the weather you usually run in?",
  "almost there. if there's anything the questions didn't cover — past injuries, brands that don't work for you, wet or hot conditions, that kind of thing — now's the time.",
  "one more thing before i get your recommendations. anything else that might affect your shoe choice? injuries, fit issues, weather conditions, specific needs?",
  "got the basics. if there's anything personal that might help — an old injury, a shoe that never worked, wide feet, rainy climate — feel free to share.",
];

const getRandomFollowup = () => CINDA_FOLLOWUPS[Math.floor(Math.random() * CINDA_FOLLOWUPS.length)];

const ProfileBuilderStep3b = () => {
  const navigate = useNavigate();
  const { profileData, updateChatHistory, updateChatContext } = useProfile();
  
  // Track if we've shown the initial typing animation
  const [showInitialTyping, setShowInitialTyping] = useState(() => {
    return profileData.step3.chatHistory.length === 0;
  });
  
  // Initialize with existing chat history or empty (will add opening after typing)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (profileData.step3.chatHistory.length > 0) {
      return profileData.step3.chatHistory;
    }
    return [];
  });
  
  const [inputValue, setInputValue] = useState("");
  const hasUserSentMessage = messages.some(msg => msg.role === 'user');
  const [isTyping, setIsTyping] = useState(showInitialTyping);
  // Track which message index is currently being "typed" (for typewriter effect)
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Track which phase of the intro we're in
  const [introPhase, setIntroPhase] = useState<'typing1' | 'message1' | 'pause' | 'typing2' | 'message2' | 'done'>(() => {
    return profileData.step3.chatHistory.length === 0 ? 'typing1' : 'done';
  });
  
  // Store the randomly selected followup message
  const [selectedFollowup] = useState(() => getRandomFollowup());

  // Multi-phase intro sequence
  useEffect(() => {
    if (introPhase === 'done') return;

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
  }, [introPhase, selectedFollowup, updateChatHistory]);

  // Scroll to bottom when messages change or during typewriter
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, typingMessageIndex]);

  // Focus input after intro completes
  useEffect(() => {
    if (introPhase === 'done' && !isTyping) {
      inputRef.current?.focus();
    }
  }, [introPhase, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
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
      // Build conversation history (exclude the hardcoded opening message)
      const conversationHistory = newMessages
        .slice(1) // Skip the opening message
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call the real API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          profile: profileData,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Create Cinda's response message
      const cindaResponse: ChatMessage = {
        role: 'assistant',
        content: data.response || data.message || "thanks, I'll keep that in mind.",
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, cindaResponse];
      setMessages(updatedMessages);
      setTypingMessageIndex(updatedMessages.length - 1); // Start typewriter for new message
      updateChatHistory(updatedMessages);

      // Merge extracted context if present
      if (data.extractedContext) {
        updateChatContext(data.extractedContext as Partial<ChatContext>);
      }

    } catch (error) {
      console.error('Chat API error:', error);
      
      // Show error message with same typing animation
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "hmm, something went wrong. try again?",
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

  const handleBack = () => {
    updateChatHistory(messages);
    navigate("/profile/step3");
  };

  const handleSkip = () => {
    setConfirmLeaveOpen(true);
  };

  const handleContinue = () => {
    setConfirmLeaveOpen(true);
  };

  const handleConfirmLeave = () => {
    updateChatHistory(messages);
    navigate("/profile/step4");
  };

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Card header - matches other steps */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              {hasUserSentMessage ? 'continue' : 'skip'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {/* Chat messages area - fills middle space */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-styled touch-pan-y px-6 md:px-8 space-y-6 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "animate-fade-in",
                  message.role === 'assistant'
                    ? "max-w-[90%] mr-auto"
                    : "max-w-[80%] ml-auto w-fit"
                )}
              >
                {message.role === 'assistant' ? (
                  // Cinda messages: plain text with typewriter effect
                  <p className="text-sm leading-relaxed text-card-foreground/70">
                    {typingMessageIndex === index ? (
                      <TypewriterText 
                        text={message.content} 
                        speed={40}
                        onComplete={() => {
                          setTypingMessageIndex(null);
                          // Progress intro phases when typewriter completes
                          if (introPhase === 'message1') {
                            setIntroPhase('pause');
                          } else if (introPhase === 'message2') {
                            setShowInitialTyping(false);
                            setIntroPhase('done');
                          }
                        }}
                      />
                    ) : (
                      message.content
                    )}
                  </p>
                ) : (
                  // User messages: subtle muted box with word wrap
                  <div 
                    className="rounded-2xl px-4 py-3 bg-card-foreground/[0.04] border border-card-foreground/10"
                    style={{ wordBreak: "break-word" }}
                  >
                    <p className="text-sm leading-relaxed text-card-foreground/90">
                      {message.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator - spinning Cinda logo */}
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

          {/* Input area at bottom of container */}
          <div className="flex-shrink-0 px-6 md:px-8 pb-6 pt-3">
            <div className="bg-card-foreground/[0.04] rounded-2xl px-4 py-2.5 border border-card-foreground/10 focus-within:border-card-foreground/20 transition-colors">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Auto-resize: reset then clamp to max 4 lines (~96px)
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="reply..."
                  rows={1}
                  disabled={isTyping || introPhase !== 'done'}
                  className={cn(
                    "flex-1 w-full bg-transparent resize-none text-sm leading-relaxed",
                    "text-card-foreground placeholder:text-card-foreground/30",
                    "focus:outline-none",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "overflow-y-auto scrollbar-styled"
                  )}
                  style={{ minHeight: "24px", maxHeight: "96px" }}
                />
                <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                  <button
                    type="button"
                    disabled={isTyping || introPhase !== 'done'}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "bg-card-foreground/10 text-card-foreground/50",
                      "hover:bg-card-foreground/15 hover:text-card-foreground/70",
                      "disabled:opacity-30 disabled:cursor-not-allowed",
                      "transition-colors"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping || introPhase !== 'done'}
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
        </PageTransition>
      </OnboardingLayout>

      {/* Confirmation modal */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0">
          <DialogHeader className="p-4 pb-0 relative">
            <button
              onClick={() => setConfirmLeaveOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <DialogTitle className="text-lg font-semibold text-card-foreground">
              ready to move on?
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pt-4 pb-6">
            <p className="text-sm text-card-foreground/70">
              cinda will use what you've shared to personalise your recommendations.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-4 pt-0">
            <Button 
              onClick={handleConfirmLeave} 
              variant="outline"
              className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm"
            >
              yes, find my shoes
            </Button>
            <Button 
              onClick={() => setConfirmLeaveOpen(false)} 
              variant="outline"
              className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm"
            >
              keep chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileBuilderStep3b;