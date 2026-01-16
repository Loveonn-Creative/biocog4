import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Volume2, Loader2, WifiOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceAgentProps {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceAgent = ({ onTranscript, disabled, className }: VoiceAgentProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>('');

  const conversation = useConversation({
    onConnect: () => {
      console.log('Voice agent connected');
      toast.success('Voice AI ready - speak naturally');
    },
    onDisconnect: () => {
      console.log('Voice agent disconnected');
      setLastTranscript('');
    },
    onMessage: (message: any) => {
      console.log('Voice message:', message);
      
      // Handle different message types
      if (message?.type === 'user_transcript') {
        const transcript = message?.user_transcription_event?.user_transcript;
        if (transcript) {
          setLastTranscript(transcript);
          onTranscript?.(transcript, 'user');
        }
      } else if (message?.type === 'agent_response') {
        const response = message?.agent_response_event?.agent_response;
        if (response) {
          onTranscript?.(response, 'assistant');
        }
      }
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      toast.error('Voice connection error. Please try again.');
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    if (disabled) return;
    
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get conversation token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token');
      
      if (error || !data?.token) {
        console.error('Token error:', error);
        throw new Error(data?.error || 'Failed to initialize voice AI');
      }

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });

    } catch (error) {
      console.error('Failed to start voice conversation:', error);
      
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access required for voice AI');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to connect voice AI');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, disabled]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    toast.info('Voice conversation ended');
  }, [conversation]);

  const isActive = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  if (disabled) {
    return (
      <div className={cn("flex flex-col items-center gap-3 p-4", className)}>
        <Button
          variant="outline"
          size="lg"
          disabled
          className="h-16 w-16 rounded-full opacity-50"
        >
          <MicOff className="h-6 w-6" />
        </Button>
        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
          Real-time voice AI available for Pro users
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Status indicator */}
      {isActive && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs transition-colors",
            isSpeaking 
              ? "border-primary text-primary animate-pulse" 
              : "border-success text-success"
          )}
        >
          {isSpeaking ? (
            <>
              <Volume2 className="h-3 w-3 mr-1" />
              AI Speaking...
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" />
              Listening...
            </>
          )}
        </Badge>
      )}

      {/* Main control button */}
      {!isActive ? (
        <Button
          variant="default"
          size="lg"
          onClick={startConversation}
          disabled={isConnecting}
          className={cn(
            "h-16 w-16 rounded-full transition-all",
            "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "shadow-lg hover:shadow-xl"
          )}
        >
          {isConnecting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </Button>
      ) : (
        <Button
          variant="destructive"
          size="lg"
          onClick={stopConversation}
          className="h-16 w-16 rounded-full shadow-lg"
        >
          <WifiOff className="h-6 w-6" />
        </Button>
      )}

      {/* Label */}
      <p className="text-xs text-muted-foreground text-center">
        {isConnecting 
          ? 'Connecting...' 
          : isActive 
            ? 'Tap to end' 
            : 'Start voice chat'
        }
      </p>

      {/* Live transcript preview */}
      {isActive && lastTranscript && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full max-w-[200px] truncate">
          "{lastTranscript}"
        </div>
      )}
    </div>
  );
};

export const VoiceFallbackMessage = () => (
  <div className="text-center p-6 bg-muted/30 rounded-xl border border-border/50 max-w-md mx-auto">
    <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/60" />
    <h3 className="font-semibold mb-2">Unlock Voice AI</h3>
    <p className="text-sm text-muted-foreground mb-4">
      For real-time voice conversations with your AI ESG Head, upgrade to Pro. 
      Upload more invoices to get personalized guidance based on your actual data.
    </p>
    <p className="text-xs text-muted-foreground italic">
      "Your AI ESG Head learns from your reports to provide founder-level precision."
    </p>
  </div>
);
