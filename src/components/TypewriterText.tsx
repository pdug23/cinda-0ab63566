import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per word
  onComplete?: () => void;
  className?: string;
}

const TypewriterText = ({ 
  text, 
  speed = 40, 
  onComplete,
  className 
}: TypewriterTextProps) => {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const words = text.split(" ");

  useEffect(() => {
    if (displayedWords.length < words.length) {
      const timer = setTimeout(() => {
        setDisplayedWords(words.slice(0, displayedWords.length + 1));
      }, speed);
      return () => clearTimeout(timer);
    } else if (displayedWords.length === words.length && onComplete) {
      onComplete();
    }
  }, [displayedWords, words, speed, onComplete]);

  return (
    <span className={className}>
      {displayedWords.join(" ")}
    </span>
  );
};

export default TypewriterText;
