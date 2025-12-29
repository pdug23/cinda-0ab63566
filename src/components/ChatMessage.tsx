interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  // Simple markdown-like parsing for bold text and sections
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Bold headers (e.g., **Primary Recommendation**)
      if (line.startsWith('**') && line.endsWith('**')) {
        const text = line.slice(2, -2);
        return (
          <h4 key={index} className="text-primary-foreground font-medium mt-4 first:mt-0 mb-2">
            {text}
          </h4>
        );
      }
      // Regular text with inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={index} className="text-card-foreground/85 leading-relaxed">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex} className="text-primary-foreground">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-accent text-accent-foreground rounded-br-md'
            : 'bg-secondary/50 border border-border/20 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="text-sm md:text-base">{message.content}</p>
        ) : (
          <div className="text-sm md:text-base space-y-1">
            {formatContent(message.content)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
