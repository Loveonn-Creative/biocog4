import { Link } from "react-router-dom";
import { Linkedin, Twitter, Instagram, Facebook } from "lucide-react";

const socialLinks = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/senseible/', icon: Linkedin },
  { name: 'X', url: 'https://x.com/senseible_earth', icon: Twitter },
  { name: 'Instagram', url: 'https://www.instagram.com/senseible.earth/', icon: Instagram },
  { name: 'Facebook', url: 'https://www.facebook.com/senseible', icon: Facebook },
];

const legalLinks = [
  { name: 'Terms', path: '/legal/terms' },
  { name: 'Privacy', path: '/legal/privacy' },
  { name: 'DPA', path: '/legal/dpa' },
];

export const SecondaryFooter = () => {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="container max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Legal Links */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Senseible</span>
            <span className="hidden sm:inline text-border">|</span>
            {legalLinks.map((link, index) => (
              <span key={link.path} className="flex items-center gap-4">
                <Link 
                  to={link.path}
                  className="hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
                {index < legalLinks.length - 1 && (
                  <span className="hidden sm:inline text-border">·</span>
                )}
              </span>
            ))}
          </div>
          
          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label={social.name}
              >
                <social.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
