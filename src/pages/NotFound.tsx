import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Home, Leaf, Upload, MessageCircle, CreditCard, Building2, FileText } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Smart suggestions based on attempted path
  const suggestions = useMemo(() => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('carbon') || path.includes('credit') || path.includes('monetiz')) {
      return [
        { to: '/monetize', label: 'Monetize Carbon', icon: CreditCard },
        { to: '/carbon-credits', label: 'Carbon Credits', icon: Leaf },
      ];
    }
    if (path.includes('report') || path.includes('esg') || path.includes('dashboard')) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: Building2 },
        { to: '/reports', label: 'ESG Reports', icon: FileText },
      ];
    }
    if (path.includes('verify') || path.includes('mrv')) {
      return [
        { to: '/verify', label: 'Verify Carbon', icon: Leaf },
        { to: '/mrv-dashboard', label: 'MRV Dashboard', icon: Building2 },
      ];
    }
    if (path.includes('intel') || path.includes('chat') || path.includes('ai')) {
      return [
        { to: '/intelligence', label: 'Ask AI', icon: MessageCircle },
        { to: '/climate-intelligence', label: 'Knowledge Hub', icon: FileText },
      ];
    }
    // Default suggestions
    return [
      { to: '/', label: 'Upload Invoice', icon: Upload },
      { to: '/intelligence', label: 'Ask AI', icon: MessageCircle },
      { to: '/pricing', label: 'View Plans', icon: CreditCard },
    ];
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg animate-fade-in">
        {/* Friendly illustration */}
        <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-success/10 rounded-full flex items-center justify-center">
          <Leaf className="w-14 h-14 text-primary/60" />
        </div>
        
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          This path leads to a greener place
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for isn't here, but we can guide you back.
        </p>
        
        {/* Primary CTAs */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Link 
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
        
        {/* Contextual suggestions */}
        <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((s) => (
            <Link 
              key={s.to} 
              to={s.to} 
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-full transition-colors"
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </Link>
          ))}
        </div>
        
        {/* Subtle path info */}
        <p className="text-xs text-muted-foreground/50 mt-8">
          Tried: {location.pathname}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
