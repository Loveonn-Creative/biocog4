import { memo, useState } from 'react';
import { Mail, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface NewsletterSignupProps {
  variant?: 'inline' | 'card';
  title?: string;
  subtitle?: string;
}

export const NewsletterSignup = memo(({ 
  variant = 'card',
  title = 'Stay informed on climate intelligence',
  subtitle = 'Get weekly insights on carbon accounting, ESG compliance, and climate finance.'
}: NewsletterSignupProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    // Store subscription in localStorage for now
    // In production, this would call an API
    try {
      const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
      if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
      }
      
      setIsSubscribed(true);
      toast.success('Successfully subscribed to our newsletter');
      setEmail('');
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSubscribed) {
    return (
      <div className={`flex items-center gap-3 ${variant === 'card' ? 'p-6 rounded-xl border border-border bg-card' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="font-medium text-foreground">You are subscribed</p>
          <p className="text-sm text-muted-foreground">Thank you for joining our climate intelligence community.</p>
        </div>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    );
  }
  
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </form>
      
      <p className="text-xs text-muted-foreground mt-3">
        No spam, unsubscribe anytime. Read our{' '}
        <a href="/legal/privacy" className="text-primary hover:underline">privacy policy</a>.
      </p>
    </div>
  );
});

NewsletterSignup.displayName = 'NewsletterSignup';
