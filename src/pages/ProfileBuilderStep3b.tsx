import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Send } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, ChatMessage } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

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
  
  // Initialize with existing chat history or Cinda's opening
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (profileData.step3.chatHistory.length > 0) {
      return profileData.step3.chatHistory;
    }
    return [{
      role: 'assistant',
      content: CINDA_OPENING,
      timestamp: new Date(),
    }];
  });
  
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSkip = () => {
    // Save current messages before skipping
    updateChatHistory(messages);
    navigate("/profile/step4");
  };

  const handleContinue = () => {
    // Save messages and continue
    updateChatHistory(messages);
    navigate("/profile/step4");
  };

  return (
    <PageTransition>
      <div className="min-h-[100dvh] flex flex-col relative">
        <AnimatedBackground />
        <OnboardingLayout>
          {/* Skip button - top right */}
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-card-foreground/50 hover:text-card-foreground/70 transition-colors"
            >
              skip →
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-card-foreground">
              anything else I should know?
            </h1>
          </div>

          {/* Chat messages container */}
          <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto mb-4 space-y-3 pr-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  message.role === 'assistant'
                    ? "bg-card-foreground/10 text-card-foreground/90 mr-auto rounded-bl-md"
                    : "bg-orange-500/80 text-white ml-auto rounded-br-md"
                )}
              >
                {message.content}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-card-foreground/10 mr-auto rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-card-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-card-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-card-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 items-end mb-4">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type here..."
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-xl px-4 py-3 text-sm",
                "bg-card-foreground/5 border border-card-foreground/20",
                "text-card-foreground placeholder:text-card-foreground/40",
                "focus:outline-none focus:border-orange-500/50",
                "transition-colors"
              )}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="h-12 w-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Continue button */}
          <Button
            onClick={handleContinue}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base font-medium rounded-xl"
          >
            I'm done, find my shoes
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </OnboardingLayout>
      </div>
    </PageTransition>
  );
};

export default ProfileBuilderStep3b;
