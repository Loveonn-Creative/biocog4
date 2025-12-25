import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md animate-fade-in">
        <p className="text-8xl font-light text-muted-foreground/30 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-foreground mb-3">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          This page doesn't exist or may have moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-carbon text-carbon-foreground rounded-full font-medium hover:bg-carbon/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
