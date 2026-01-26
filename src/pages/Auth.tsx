import { useState, useEffect } from "react";
import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft, Mail, Lock, User, Phone, Building, MapPin, ArrowRight, Loader2, Eye, EyeOff, Globe, Briefcase } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PasswordStrength, isPasswordStrong } from "@/components/PasswordStrength";
import { Badge } from "@/components/ui/badge";

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPartnerMode = searchParams.get('mode') === 'partner';
  
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const [mode, setMode] = useState<AuthMode>(isPartnerMode ? "signup" : "signin");
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [location, setLocation] = useState("");
  
  // Partner-specific fields
  const [organizationType, setOrganizationType] = useState("");
  const [website, setWebsite] = useState("");

  // Get context-aware redirect path
  const getRedirectPath = async (userId: string): Promise<string> => {
    const { data } = await supabase
      .from('user_contexts')
      .select('context_type, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data?.context_type === 'partner') {
      return '/partner-dashboard';
    }
    return '/dashboard';
  };

  // Redirect if already authenticated
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!sessionLoading && isAuthenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const redirectPath = await getRedirectPath(user.id);
          navigate(redirectPath);
        }
      }
    };
    checkAndRedirect();
  }, [isAuthenticated, sessionLoading, navigate]);

  const validateForm = (): boolean => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (mode === 'signup' && !isPasswordStrong(password)) {
      toast.error('Please create a stronger password');
      return false;
    }
    
    if (mode === 'signin' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        if (data.user) {
          const redirectPath = await getRedirectPath(data.user.id);
          toast.success("Welcome back! Redirecting...");
          navigate(redirectPath);
        }
      } else if (mode === "signup") {
        // ALWAYS use production domain for email verification - never use Lovable preview URLs
        // This ensures all verification emails redirect to senseible.earth
        const PRODUCTION_DOMAIN = 'https://senseible.earth';
        const redirectUrl = `${PRODUCTION_DOMAIN}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              business_name: businessName,
              phone: phone,
              gstin: gstin,
              location: location
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
            setMode('signin');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        if (data.user) {
          // Update profile with additional data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              business_name: businessName,
              phone: phone,
              gstin: gstin,
              location: location
            })
            .eq('id', data.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
          
          // If partner mode, create partner application AND user context
          if (isPartnerMode && organizationType) {
            const { error: applicationError } = await supabase
              .from('partner_applications')
              .insert({
                user_id: data.user.id,
                organization_name: businessName || 'Unnamed Organization',
                organization_type: organizationType,
                contact_email: email,
                website: website || null,
                status: 'pending'
              });
            
            if (applicationError) {
              console.error('Partner application error:', applicationError);
            } else {
              // CRITICAL: Create partner context so redirect logic works
              const { error: contextError } = await supabase
                .from('user_contexts')
                .insert({
                  user_id: data.user.id,
                  context_type: 'partner',
                  context_id: data.user.id, // Use user_id as context_id for pending partners
                  context_name: businessName || 'Unnamed Organization',
                  is_active: true
                });
              
              if (contextError) {
                console.error('Partner context error:', contextError);
              }
              
              toast.success("Partner account created! Redirecting to your dashboard...");
              navigate('/partner-dashboard');
              return;
            }
          }
          
          const redirectPath = await getRedirectPath(data.user.id);
          toast.success("Account created! Redirecting...");
          navigate(redirectPath);
        }
      } else {
        // Forgot password - ALWAYS use production domain
        const PRODUCTION_DOMAIN = 'https://senseible.earth';
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${PRODUCTION_DOMAIN}/auth`
        });
        
        if (error) {
          toast.error(error.message);
          return;
        }
        
        toast.success("Password reset link sent to your email.");
        setMode('signin');
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          {isPartnerMode && (
            <Badge variant="secondary" className="mb-4">
              <Briefcase className="w-3 h-3 mr-1" />
              Partner Registration
            </Badge>
          )}
          
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            {mode === "signin" && "Sign in"}
            {mode === "signup" && (isPartnerMode ? "Become a Partner" : "Create account")}
            {mode === "forgot" && "Reset password"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signin" && "Access your carbon data and saved reports."}
            {mode === "signup" && (isPartnerMode 
              ? "Register to access the partner marketplace and carbon credit purchasing." 
              : "Start tracking and monetizing your carbon data.")}
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
                
                {/* Partner-specific fields */}
                {isPartnerMode && (
                  <>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={organizationType}
                        onChange={(e) => setOrganizationType(e.target.value)}
                        required={isPartnerMode}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                      >
                        <option value="">Select organization type</option>
                        <option value="bank">Bank / Financial Institution</option>
                        <option value="carbon_buyer">Carbon Credit Buyer</option>
                        <option value="erp">ERP / Accounting Platform</option>
                        <option value="climate_finance">Climate Finance Provider</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="Website (optional)"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </>
                )}
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
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === "signup" && (
                  <PasswordStrength password={password} />
                )}
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
                <Loader2 className="w-5 h-5 animate-spin" />
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
