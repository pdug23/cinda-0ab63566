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

const CINDA_OPENING = "you've told me the basics, but running's personal. past injuries, shoes that didn't work out, weird fit issues... if there's anything else that might help, let me know.";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show initial typing, then Cinda's opening message with typewriter effect
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
        setTypingMessageIndex(0); // Start typewriter for first message
        updateChatHistory([openingMessage]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showInitialTyping, updateChatHistory]);

  // Scroll to bottom when messages change or during typewriter
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, typingMessageIndex]);

  // Focus input after initial typing completes
  useEffect(() => {
    if (!showInitialTyping && !isTyping) {
      inputRef.current?.focus();
    }
  }, [showInitialTyping, isTyping]);

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
                        onComplete={() => setTypingMessageIndex(null)}
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

          {/* Input area and button - pinned to bottom */}
          <footer className="flex flex-col px-6 md:px-8 pt-4 pb-4 flex-shrink-0 gap-4">
            {/* Unified input container - ChatGPT-style */}
            <div className="flex items-end gap-2 bg-card-foreground/[0.04] rounded-2xl px-4 py-2.5 border border-card-foreground/10 focus-within:border-card-foreground/20 transition-colors">
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
                placeholder="message cinda..."
                rows={1}
                disabled={isTyping || showInitialTyping}
                className={cn(
                  "flex-1 bg-transparent resize-none text-sm leading-relaxed",
                  "text-card-foreground placeholder:text-card-foreground/30",
                  "focus:outline-none",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "overflow-y-auto scrollbar-styled"
                )}
                style={{ minHeight: "24px", maxHeight: "96px" }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping || showInitialTyping}
                className={cn(
                  "flex-shrink-0 p-1.5 rounded-lg",
                  "text-card-foreground/30 hover:text-card-foreground",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
              >
                <Send className="w-4 h-4" />
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
            </Button>
          </footer>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep3b;