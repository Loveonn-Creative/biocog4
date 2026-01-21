import { Link } from 'react-router-dom';
import { HelpCircle, Sparkles, CreditCard, LogIn, Phone, Building2, Users, Scale } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const HomeNavIcons = () => {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
      {/* Question mark dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="w-9 h-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-all hover:scale-105"
            aria-label="Help menu"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link to="/pricing" className="flex items-center gap-2 cursor-pointer">
              <CreditCard className="w-4 h-4" />
              Pricing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/contact" className="flex items-center gap-2 cursor-pointer">
              <Phone className="w-4 h-4" />
              Contact
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/industries" className="flex items-center gap-2 cursor-pointer">
              <Building2 className="w-4 h-4" />
              Industries
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/partner-dashboard" className="flex items-center gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              Partners
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/legal/terms" className="flex items-center gap-2 cursor-pointer">
              <Scale className="w-4 h-4" />
              Legal
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ESG Intelligence direct access */}
      <Link 
        to="/intelligence"
        className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all hover:scale-105 group"
        title="Ask ESG Intelligence"
        aria-label="Ask ESG Intelligence"
      >
        <Sparkles className="w-4 h-4 text-primary group-hover:animate-pulse" />
      </Link>
    </div>
  );
};
