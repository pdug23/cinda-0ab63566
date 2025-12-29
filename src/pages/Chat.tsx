import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const mockResponse = `**Primary Recommendation**
The Allbirds Tree Runners in natural grey would be an excellent choice for you.

**Why It Fits**
Based on your need for everyday comfort and sustainability, these shoes offer merino wool cushioning, breathable eucalyptus fiber, and a carbon-neutral footprint. The minimalist design pairs well with both casual and smart-casual outfits.

**Trade-offs**
They're not ideal for heavy rain or rigorous athletic use. The price point is mid-range at around $100.

**One Follow-up Question**
Do you prioritize slip-on convenience, or are laces fine for you?`;

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Mock response after delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: mockResponse,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(24 100% 70%) 0%, hsl(30 100% 85%) 50%, hsl(35 100% 92%) 100%)' }}>
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-semibold text-card hover:opacity-80 transition-opacity">
          Cinda
        </Link>
        <span className="px-3 py-1 text-xs font-medium tracking-wider uppercase bg-card/80 text-card-foreground rounded-full border border-border/30 backdrop-blur-sm">
          Alpha
        </span>
      </header>

      {/* Main chat area */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 md:px-6">
        <div className="w-full max-w-3xl h-[calc(100vh-140px)] flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <h2 className="text-2xl font-medium text-primary-foreground/90">
                  How can I help you today?
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Tell me what you're looking for—whether it's shoes, a jacket, or anything else—and I'll help you find the perfect match.
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
          <form onSubmit={handleSubmit} className="p-4 border-t border-border/20">
            <div className="flex items-center gap-3 bg-input/50 rounded-xl px-4 py-3 border border-border/30 focus-within:border-accent/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you're looking for..."
                className="flex-1 bg-transparent text-card-foreground placeholder:text-muted-foreground focus:outline-none text-sm md:text-base"
              />
              <Button 
                type="submit" 
                variant="send" 
                size="icon"
                disabled={!input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Chat;
