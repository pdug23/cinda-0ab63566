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
      // Bold headers (e.g., **Primary Recommendation**) - lighter weight, more conversational
      if (line.startsWith('**') && line.endsWith('**')) {
        const text = line.slice(2, -2);
        return (
          <h4 key={index} className="text-muted-foreground text-xs uppercase tracking-wide font-medium mt-6 first:mt-0 mb-1">
            {text}
          </h4>
        );
      }
      // Regular text with inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={index} className="text-card-foreground/90 leading-relaxed">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex} className="text-card-foreground">{part.slice(2, -2)}</strong>;
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
        className={`max-w-[85%] rounded-2xl ${
          isUser
            ? 'bg-secondary/80 text-card-foreground/80 px-4 py-2.5 rounded-br-md text-sm'
            : 'bg-transparent px-1 py-2 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
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
