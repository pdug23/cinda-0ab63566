import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, ChatMessage } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";
import cindaLogoGrey from "@/assets/cinda-logo-grey.png";

const CINDA_OPENING = "you've told me the basics, but running's personal. past injuries, shoes that didn't work out, weird fit issues... if there's anything else that might help, let me know.";

const CINDA_RESPONSES = [
  "got it, I'll keep that in mind. anything else?",
  "thanks for sharing that. any other details?",
  "noted! anything else I should know?",
  "that's helpful context. anything more?",
];

const CINDA_FINAL = "thanks! ready to find your shoes when you are.";

const ProfileBuilderStep3b = () => {
  const navigate = useNavigate();
  const { profileData, updateChatHistory } = useProfile();
  
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
  const [exchangeCount, setExchangeCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show initial typing, then Cinda's opening message
  useEffect(() => {
    if (showInitialTyping) {
      const timer = setTimeout(() => {
        setIsTyping(false);
        setShowInitialTyping(false);
        const openingMessage: ChatMessage = {
          role: 'assistant',
          content: CINDA_OPENING,
          timestamp: new Date(),
        };
        setMessages([openingMessage]);
        updateChatHistory([openingMessage]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showInitialTyping, updateChatHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input after initial typing completes
  useEffect(() => {
    if (!showInitialTyping && !isTyping) {
      inputRef.current?.focus();
    }
  }, [showInitialTyping, isTyping]);

  const handleSend = () => {
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

    // Simulate Cinda's response
    setTimeout(() => {
      const newExchangeCount = exchangeCount + 1;
      setExchangeCount(newExchangeCount);

      const cindaResponse: ChatMessage = {
        role: 'assistant',
        content: newExchangeCount >= 3 
          ? CINDA_FINAL 
          : CINDA_RESPONSES[Math.min(newExchangeCount - 1, CINDA_RESPONSES.length - 1)],
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, cindaResponse];
      setMessages(updatedMessages);
      updateChatHistory(updatedMessages);
      setIsTyping(false);
    }, 800 + Math.random() * 400);
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
    updateChatHistory(messages);
    navigate("/profile/step4");
  };

  const handleContinue = () => {
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
              onClick={handleSkip}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              skip
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {/* Chat messages area - fills middle space */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-6 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "animate-fade-in",
                  message.role === 'assistant'
                    ? "max-w-[90%] mr-auto"
                    : "max-w-[85%] ml-auto"
                )}
              >
                {message.role === 'assistant' ? (
                  // Cinda messages: plain text, no bubble
                  <p className="text-sm leading-relaxed text-card-foreground/70">
                    {message.content}
                  </p>
                ) : (
                  // User messages: subtle muted box
                  <div className="rounded-2xl px-4 py-3 bg-card-foreground/[0.08] border border-card-foreground/15">
                    <p className="text-sm leading-relaxed text-card-foreground/90">
                      {message.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator - animated Cinda logo */}
            {isTyping && (
              <div className="animate-fade-in">
                <img 
                  src={cindaLogoGrey} 
                  alt="Cinda is typing" 
                  className="w-6 h-6 opacity-50 animate-pulse"
                />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input area and button - pinned to bottom */}
          <footer className="flex flex-col px-6 md:px-8 pt-4 pb-4 flex-shrink-0 gap-4">
            {/* Input row */}
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="message cinda..."
                rows={1}
                disabled={isTyping || showInitialTyping}
                className={cn(
                  "flex-1 resize-none rounded-lg px-4 py-3 text-sm",
                  "bg-transparent border border-card-foreground/15",
                  "text-card-foreground placeholder:text-card-foreground/40",
                  "focus:outline-none focus:border-card-foreground/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping || showInitialTyping}
                className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                  "text-card-foreground/40 hover:text-card-foreground",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Continue button */}
            <Button
              onClick={handleContinue}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
              disabled={showInitialTyping}
            >
              next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </footer>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep3b;
