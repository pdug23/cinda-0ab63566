import { useState, useRef, useEffect } from "react";
import cindaMascot from "@/assets/cinda-mascot.png";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";

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

const welcomeMessage = "👋 Hi, I'm Cinda! Talk to me about your running and I'll help you find the right shoe for how you train, race, and feel on your runs.";

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedWelcome, setDisplayedWelcome] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Typewriter effect for welcome message
  useEffect(() => {
    if (messages.length > 0) return;
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < welcomeMessage.length) {
        setDisplayedWelcome(welcomeMessage.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [messages.length]);

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    textareaRef.current?.focus();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
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
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                <img 
                  src={cindaMascot} 
                  alt="Cinda mascot" 
                  className="w-20 h-20 object-contain"
                />
                <p className="text-card-foreground/90 max-w-md leading-relaxed min-h-[3rem]">
                  {displayedWelcome}
                  <span className="inline-block w-0.5 h-4 bg-card-foreground/70 ml-0.5 animate-pulse" />
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
                  ref={textareaRef}
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
