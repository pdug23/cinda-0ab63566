import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
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
              continue
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

          {/* Spacer to push content above the fixed input */}
          <div className="h-20 flex-shrink-0" />
        </PageTransition>
      </OnboardingLayout>

      {/* Fixed input area at very bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-md mx-auto flex items-end gap-3">
          <div className="flex-1 bg-card-foreground/[0.04] rounded-2xl px-4 py-2.5 border border-card-foreground/10 focus-within:border-card-foreground/20 transition-colors">
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
                "w-full bg-transparent resize-none text-sm leading-relaxed",
                "text-card-foreground placeholder:text-card-foreground/30",
                "focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "overflow-y-auto scrollbar-styled"
              )}
              style={{ minHeight: "24px", maxHeight: "96px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping || introPhase !== 'done'}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
              "bg-accent text-accent-foreground",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "hover:opacity-90 transition-opacity"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-card-foreground">
              ready to move on?
            </DialogTitle>
            <DialogDescription className="text-sm text-card-foreground/60 mt-2">
              cinda will use what you've shared to personalise your recommendations.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button variant="cta" onClick={handleConfirmLeave} className="w-full">
              yes, find my shoes
            </Button>
            <Button variant="outline" onClick={() => setConfirmLeaveOpen(false)} className="w-full">
              keep chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileBuilderStep3b;