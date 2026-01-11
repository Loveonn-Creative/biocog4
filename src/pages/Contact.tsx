import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, MessageCircle, Send, Check } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = [
  { id: 'sales', label: 'Sales & Partnerships' },
  { id: 'technical', label: 'Technical Support' },
  { id: 'climate', label: 'Climate & ESG Intelligence' },
  { id: 'monetization', label: 'Carbon Monetization' },
  { id: 'enterprise', label: 'Enterprise & API' },
  { id: 'general', label: 'General Inquiry' },
];

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    category: 'general',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-notification', {
        body: form
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Message sent successfully! We'll get back to you soon.");
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/919999999999?text=Hi%20Senseible%2C%20I%20have%20a%20query%20about%20carbon%20intelligence.', '_blank');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead 
          title="Contact Us"
          description="Get in touch with Senseible for carbon intelligence, ESG solutions, and climate finance inquiries."
          canonical="/contact"
        />
        <MinimalNav />
        
        <main className="container max-w-3xl mx-auto px-6 py-24 sm:py-32 flex-1 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground mb-4">Message Sent</h1>
            <p className="text-muted-foreground mb-8">We'll get back to you within 24 hours.</p>
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Contact Us"
        description="Get in touch with Senseible for carbon intelligence, ESG solutions, and climate finance inquiries. HQ: Minarch Tower, Gurugram."
        canonical="/contact"
      />
      <MinimalNav />
      
      <main className="container max-w-5xl mx-auto px-6 py-24 sm:py-32 flex-1">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <div className="grid lg:grid-cols-2 gap-16 animate-fade-in">
          {/* Form */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We respond within 24 hours.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => setForm({...form, company: e.target.value})}
                    placeholder="Your company"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>How can we help?</Label>
                <RadioGroup
                  value={form.category}
                  onValueChange={(value) => setForm({...form, category: value})}
                  className="grid grid-cols-2 gap-2"
                >
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={cat.id} id={cat.id} />
                      <Label htmlFor={cat.id} className="text-sm font-normal cursor-pointer">
                        {cat.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  placeholder="Tell us about your carbon and ESG needs..."
                />
              </div>
              
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto gap-2">
                {isSubmitting ? 'Sending...' : 'Send Message'}
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-4">Quick Connect</h3>
              
              <div className="space-y-4">
                <button
                  onClick={openWhatsApp}
                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-left"
                >
                  <MessageCircle className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-medium text-foreground">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Chat with us instantly</p>
                  </div>
                </button>
                
                <a
                  href="mailto:impact@senseible.earth"
                  className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Mail className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">impact@senseible.earth</p>
                  </div>
                </a>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary">
                  <MapPin className="w-6 h-6 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Headquarters</p>
                    <p className="text-sm text-muted-foreground">
                      Minarch Tower, Sector 44<br />
                      Gurugram, 122003<br />
                      India
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-4">Explore</h3>
              <div className="space-y-2">
                <Link to="/climate-intelligence" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Climate Intelligence Hub
                </Link>
                <Link to="/pricing" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing Plans
                </Link>
                <Link to="/mission" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Our Mission
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
