import { Link } from "react-router-dom";
import { Linkedin, Twitter, Instagram, Facebook } from "lucide-react";
import { useSession } from "@/hooks/useSession";

const socialLinks = [
  { 
    name: 'LinkedIn', 
    url: 'https://www.linkedin.com/company/senseible/', 
    icon: Linkedin 
  },
  { 
    name: 'X', 
    url: 'https://x.com/senseible_earth', 
    icon: Twitter 
  },
  { 
    name: 'Instagram', 
    url: 'https://www.instagram.com/senseible.earth/', 
    icon: Instagram 
  },
  { 
    name: 'Facebook', 
    url: 'https://www.facebook.com/senseible', 
    icon: Facebook 
  },
];

const footerLinks = {
  platform: [
    { name: 'Climate Intelligence', path: '/climate-intelligence' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' },
  ],
  company: [
    { name: 'Mission', path: '/mission' },
    { name: 'About', path: '/about' },
    { name: 'Principles', path: '/principles' },
  ],
  legal: [
    { name: 'Terms of Service', path: '/legal/terms' },
    { name: 'Privacy Policy', path: '/legal/privacy' },
    { name: 'Data Processing', path: '/legal/dpa' },
    { name: 'Industries', path: '/industries' },
  ],
};

export const Footer = () => {
  const { isAuthenticated, isLoading } = useSession();

  // Derive authenticated links - show Dashboard instead of Sign In
  const getAuthAwareLinks = () => {
    if (isLoading) {
      return footerLinks.platform;
    }
    
    if (isAuthenticated) {
      return [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Climate Intelligence', path: '/climate-intelligence' },
        { name: 'Pricing', path: '/pricing' },
      ];
    }
    
    return [
      ...footerLinks.platform,
      { name: 'Sign In', path: '/auth' },
    ];
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="container max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-semibold text-foreground">
              senseible
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              AI-powered carbon infrastructure for 400 million MSMEs.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3 mt-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Platform - Auth-aware */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Platform</h4>
            <ul className="space-y-2">
              {getAuthAwareLinks().map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} Senseible. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            HQ: Minarch Tower, Sector 44, Gurugram, India
          </p>
        </div>
      </div>
    </footer>
  );
};
