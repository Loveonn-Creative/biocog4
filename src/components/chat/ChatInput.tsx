import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Language } from '@/lib/languages';

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: (transcript: string) => void;
  isLoading?: boolean;
  isListening?: boolean;
  language: Language;
  placeholder?: string;
}

export const ChatInput = ({
  onSend,
  onVoiceStart,
  onVoiceEnd,
  isLoading = false,
  isListening = false,
  language,
  placeholder = "Ask about your emissions, savings, or net-zero strategy..."
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSend(input.trim());
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "flex items-end gap-2 p-2 rounded-2xl border bg-background/95 backdrop-blur-sm transition-all",
        isListening 
          ? "border-primary/50 ring-2 ring-primary/20" 
          : "border-border/60 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10"
      )}>
        {/* Voice Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-xl transition-all",
            isListening 
              ? "bg-primary/10 text-primary hover:bg-primary/20" 
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
          onClick={() => {
            if (isListening) {
              // Will be handled by parent
            } else {
              onVoiceStart?.();
            }
          }}
          disabled={isLoading}
        >
          {isListening ? (
            <div className="relative">
              <MicOff className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? `Listening in ${language.name}...` : placeholder}
          disabled={isLoading || isListening}
          rows={1}
          className={cn(
            "flex-1 bg-transparent border-0 resize-none py-2.5 px-2 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60",
            "min-h-[40px] max-h-[120px]"
          )}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-xl transition-all",
            input.trim() 
              ? "bg-primary hover:bg-primary/90" 
              : "bg-secondary text-muted-foreground"
          )}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Language indicator */}
      <div className="absolute -top-6 left-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{language.flag}</span>
        <span>{language.name}</span>
      </div>
    </form>
  );
};
