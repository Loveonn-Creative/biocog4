import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import senseibleLogo from "@/assets/senseible-logo.png";

const navLinks = [
  { path: "/mission", label: "Mission" },
  { path: "/about", label: "About" },
  { path: "/climate-intelligence", label: "Climate Intelligence" },
  { path: "/contact", label: "Contact" },
  { path: "/legal", label: "Legal" },
];

export const MinimalNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      {/* Logo - always visible, acts as nav trigger */}
      <div className={`fixed top-6 left-6 z-50 ${isHome ? "opacity-0 hover:opacity-100" : "opacity-100"} transition-opacity duration-500`}>
        <Link 
          to="/" 
          className="flex items-center gap-2 group"
          onClick={() => setIsOpen(false)}
        >
          <img 
            src={senseibleLogo} 
            alt="Senseible" 
            className="h-7 w-auto invert transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Menu toggle - only on non-home pages or when menu is open */}
      {(!isHome || isOpen) && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border transition-all duration-300 hover:bg-secondary"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-foreground" />
          )}
        </button>
      )}

      {/* Full screen nav overlay */}
      <div
        className={`
          fixed inset-0 z-40 bg-background
          transition-all duration-500 ease-out
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`
                text-2xl sm:text-3xl font-medium tracking-tight
                transition-all duration-300
                ${location.pathname === link.path 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
                }
                opacity-0 translate-y-4
                ${isOpen ? "animate-fade-in" : ""}
              `}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Auth link */}
          <div className="mt-8 pt-8 border-t border-border">
            <Link
              to="/auth"
              onClick={() => setIsOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Sign in to save data
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
