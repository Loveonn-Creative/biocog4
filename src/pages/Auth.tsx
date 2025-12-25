import { useState } from "react";
import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft, Mail, Lock, User, Phone, Building, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth process
    setTimeout(() => {
      setIsLoading(false);
      if (mode === "signin") {
        toast.success("Welcome back! Redirecting to dashboard...");
      } else if (mode === "signup") {
        toast.success("Account created! Please check your email to verify.");
      } else {
        toast.success("Password reset link sent to your email.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      
      <main className="container max-w-md mx-auto px-6 py-24 sm:py-32">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <div className="animate-fade-in">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            {mode === "signin" && "Sign in"}
            {mode === "signup" && "Create account"}
            {mode === "forgot" && "Reset password"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signin" && "Access your carbon data and saved reports."}
            {mode === "signup" && "Start tracking and monetizing your carbon data."}
            {mode === "forgot" && "We'll send you a reset link."}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="GSTIN (optional)"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Location (City, State)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}
            
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-carbon text-carbon-foreground rounded-xl font-medium transition-all hover:bg-carbon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-carbon-foreground/30 border-t-carbon-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "signin" && "Sign in"}
                  {mode === "signup" && "Create account"}
                  {mode === "forgot" && "Send reset link"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
          {/* Mode switcher */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            {mode === "signin" && (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-foreground font-medium hover:underline"
                >
                  Create one
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-foreground font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-foreground font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
          
          {/* Trust note */}
          <p className="mt-8 text-xs text-center text-muted-foreground/60">
            Your data is encrypted and never shared without your consent.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
