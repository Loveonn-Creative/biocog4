import { useState, memo, useMemo } from 'react';
import { Volume2, VolumeX, User, Brain, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatContentForDisplay } from '@/lib/formatContent';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

export const ChatMessage = memo(({ 
  message, 
  onSpeak, 
  isSpeaking,
  onStopSpeaking 
}: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  // Format content to remove markdown artifacts for AI responses
  const displayContent = useMemo(() => {
    if (isUser) return message.content;
    return formatContentForDisplay(message.content);
  }, [message.content, isUser]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      onStopSpeaking?.();
    } else {
      // Speak the clean version without markdown
      onSpeak?.(displayContent);
    }
  };

  // Split content into paragraphs for better rendering
  const paragraphs = useMemo(() => {
    return displayContent.split('\n').filter(line => line.trim());
  }, [displayContent]);

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          isUser 
            ? "bg-primary/10 text-primary" 
            : "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary/80 text-foreground rounded-tl-sm border border-border/50"
          )}
        >
          {paragraphs.map((paragraph, i) => {
            // Check if it's a list item (starts with bullet or number)
            const isList = paragraph.startsWith('• ') || paragraph.match(/^\d+\.\s/);
            
            if (isList) {
              return (
                <div key={i} className={cn("flex items-start gap-2", i > 0 && 'mt-2')}>
                  <span className="text-primary mt-0.5 text-xs flex-shrink-0">
                    {paragraph.match(/^\d+\./) ? paragraph.match(/^\d+\./)?.[0] : '•'}
                  </span>
                  <span>{paragraph.replace(/^[•\d.]+\s*/, '')}</span>
                </div>
              );
            }
            
            return (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Actions */}
        <div
          className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {!isUser && onSpeak && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-secondary"
              onClick={handleSpeak}
            >
              {isSpeaking ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-secondary"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export const TypingIndicator = memo(() => (
  <div className="flex gap-3 animate-in fade-in duration-300">
    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600">
      <Brain className="w-4 h-4" />
    </div>
    <div className="bg-secondary/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-border/50">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';
