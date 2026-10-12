import { useState, useEffect } from "react";
import { BusinessIdField, type BusinessIdResult } from "@/components/auth/BusinessIdField";
import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Briefcase } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PasswordStrength, isPasswordStrong } from "@/components/PasswordStrength";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { analyticsEvents } from "@/lib/analytics";
import { INDIA_GRID_FACTOR_KG_PER_KWH, METHODOLOGY_VERSION_TAG } from "@/lib/factors";
import { AccountStack, StackStrip, type StackLayer } from "@/components/auth/AccountStack";

/** The three fears at a sign-up form, each answered with a fact the product already backs. */
const AUTH_ASSURANCES = [
  { key: "free", short: "Free for 10 bills a month. No card.", href: "", linkText: "" },
  { key: "dpa", short: "Your records stay in your account.", href: "/legal/dpa", linkText: "DPA" },
  { key: "src", short: "Every number shows its source.", href: "", linkText: "" },
];

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPartnerMode = searchParams.get('mode') === 'partner';
  const initialMode = searchParams.get('mode');
  const nextPath = searchParams.get('next');
  
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const [mode, setMode] = useState<AuthMode>(
    isPartnerMode ? "signup" : initialMode === "forgot" ? "forgot" : initialMode === "signup" ? "signup" : "signin"
  );
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [location, setLocation] = useState("");
  // Business identifier (GSTIN, CIN or company PAN) with its explicit check state.
  const [businessId, setBusinessId] = useState<BusinessIdResult>({ type: null, value: "", status: "idle", facts: {} });
  const [locationAutofilled, setLocationAutofilled] = useState<string | null>(null);

  const handleBusinessId = (r: BusinessIdResult) => {
    setBusinessId(r);
    const usable = r.status !== "invalid" && r.status !== "idle" && r.status !== "not_found";
    setGstin(usable && r.type === "gstin" ? r.value : "");
    // Prefill location from the number only if the user has not typed one.
    if (usable && r.facts.state) {
      setLocation(prev => {
        if (prev.trim() === "" || prev === locationAutofilled) {
          setLocationAutofilled(r.facts.state!);
          return r.facts.state!;
        }
        return prev;
      });
    }
  };
  const [dataConsent, setDataConsent] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  
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

    const isPartner = data?.context_type === 'partner';

    // Restore the page the user was trying to reach, if it is a safe in-app path.
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('\\') && !nextPath.startsWith('/auth')) {
      const partnerOnly = nextPath.startsWith('/partner');
      if (isPartner === partnerOnly) return nextPath;
    }

    return isPartner ? '/partner-dashboard' : '/dashboard';
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

    if (mode === 'signup' && (businessId.status === 'invalid' || businessId.status === 'not_found')) {
      toast.error('Please correct the GSTIN, CIN or PAN, or clear the field to continue');
      return false;
    }

    if (mode === 'signup' && !dataConsent) {
      toast.error('Please confirm how Senseible may process your business data');
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
          analyticsEvents.login('password');
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
               location: location,
               // CIN and company PAN live in account metadata until profile
               // columns are approved (supabase/pending-migrations).
               cin: businessId.type === 'cin' && businessId.status !== 'invalid' ? businessId.value : undefined,
               company_pan: businessId.type === 'pan' && businessId.status !== 'invalid'
                 ? businessId.value
                 : businessId.type === 'gstin' && businessId.facts.pan ? businessId.facts.pan : undefined,
               business_id_check: businessId.type
                 ? { type: businessId.type, status: businessId.status, checked_at: new Date().toISOString() }
                 : undefined,
               data_consent: true,
               data_consent_at: new Date().toISOString(),
               data_consent_version: '2026-09-25'
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
          analyticsEvents.signUp('password', isPartnerMode ? 'partner' : 'msme');
          // Update profile with additional data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              business_name: businessName,
              phone: phone,
              gstin: gstin,
               location: location,
               data_consent: true,
               data_consent_at: new Date().toISOString(),
               data_consent_version: '2026-09-25'
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
        // Forgot password: return to the origin the user is on (must be in the Supabase redirect allow list).
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
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

  const tabsShown = mode !== "forgot" && !isPartnerMode;
  // Visual progress only; validation stays in validateForm.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const layers: StackLayer[] = mode === "forgot"
    ? [{ key: "email", label: "Email", done: emailOk }]
    : mode === "signin"
      ? [{ key: "email", label: "Email", done: emailOk }, { key: "password", label: "Password", done: password.length >= 6 }]
      : [
          { key: "email", label: "Email", done: emailOk },
          { key: "password", label: "Strong password", done: isPasswordStrong(password) },
          ...(isPartnerMode
            ? [{ key: "org", label: "Organisation type", done: !!organizationType }]
            : [{ key: "business", label: "Business details", done: !!(businessName.trim() || businessId.value), optional: true }]),
          { key: "consent", label: "Consent", done: dataConsent },
        ];
  const field = "h-12 w-full rounded-xl border border-input bg-background px-4 text-[15px] transition-colors placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
  const label = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />

      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        {/* Form side */}
        <main className="flex items-start justify-center px-5 pb-16 pt-24 sm:pt-28 lg:items-center lg:pt-20">
          <div className="w-full max-w-[420px] animate-fade-in">
            <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            {isPartnerMode && (
              <Badge variant="secondary" className="mb-4">
                <Briefcase className="mr-1 h-3 w-3" />
                Partner Registration
              </Badge>
            )}

            {tabsShown && (
              <div role="tablist" aria-label="Account" className="mb-8 grid grid-cols-2 rounded-full border border-border bg-secondary/50 p-1 text-sm">
                {(["signin", "signup"] as const).map(m => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={`h-10 rounded-full font-medium transition-all ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
            )}

            <h1 className={tabsShown ? "sr-only" : "text-3xl font-semibold tracking-tight text-foreground"}>
              {mode === "signin" && "Sign in"}
              {mode === "signup" && (isPartnerMode ? "Become a Partner" : "Create account")}
              {mode === "forgot" && "Reset password"}
            </h1>
            {!tabsShown && (
              <p className="mt-2 mb-8 text-muted-foreground">
                {mode === "signup" && "Register to access the partner marketplace and carbon credit purchasing."}
                {mode === "forgot" && "We'll send you a reset link."}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="auth-email" className={label}>Email address</label>
                <input id="auth-email" type="email" autoComplete="email" inputMode="email" placeholder="you@business.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required className={field} />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="auth-password" className={label}>Password</label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={`${field} pr-12`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "signup" && <div className="mt-2"><PasswordStrength password={password} /></div>}
                </div>
              )}

              {mode === "signup" && !isPartnerMode && !showBusiness && (
                <button type="button" onClick={() => setShowBusiness(true)} className="text-sm font-medium text-primary">
                  + Add business details <span className="font-normal text-muted-foreground">(optional)</span>
                </button>
              )}

              {mode === "signup" && (isPartnerMode || showBusiness) && (
                <fieldset className="space-y-4 rounded-2xl border border-border p-4 sm:p-5">
                  <legend className="px-1 text-sm font-medium text-foreground">
                    {isPartnerMode ? "Your organisation" : "Your business"} <span className="font-normal text-muted-foreground">{isPartnerMode ? "" : "(optional)"}</span>
                  </legend>
                  <div>
                    <label htmlFor="auth-business" className={label}>Business name</label>
                    <input id="auth-business" type="text" autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={field} />
                  </div>

                  <div>
                    <span className={label}>GSTIN, CIN or company PAN</span>
                    <BusinessIdField onResult={handleBusinessId} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="auth-phone" className={label}>Phone</label>
                      <input id="auth-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
                    </div>
                    <div>
                      <label htmlFor="auth-location" className={label}>City, State</label>
                      <input id="auth-location" type="text" autoComplete="address-level2" value={location}
                        onChange={(e) => { setLocation(e.target.value); setLocationAutofilled(null); }} className={field} />
                    </div>
                  </div>

                  {isPartnerMode && (
                    <>
                      <div>
                        <label htmlFor="auth-orgtype" className={label}>Organization type</label>
                        <select id="auth-orgtype" value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} required={isPartnerMode}
                          className={`${field} appearance-none`}>
                          <option value="">Select organization type</option>
                          <option value="bank">Bank / Financial Institution</option>
                          <option value="carbon_buyer">Carbon Credit Buyer</option>
                          <option value="erp">ERP / Accounting Platform</option>
                          <option value="climate_finance">Climate Finance Provider</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="auth-website" className={label}>Website (optional)</label>
                        <input id="auth-website" type="url" autoComplete="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={field} />
                      </div>
                    </>
                  )}
                </fieldset>
              )}

              {mode === "signup" && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data-consent"
                    checked={dataConsent}
                    onCheckedChange={(checked) => setDataConsent(checked === true)}
                    aria-describedby="data-consent-description"
                    className="mt-0.5"
                  />
                  <label id="data-consent-description" htmlFor="data-consent" className="text-[13px] leading-relaxed text-muted-foreground">
                    I consent to Senseible collecting, processing, uploading and parsing my business data. Read the{' '}
                    <Link to="/legal/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">
                      Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link to="/legal/dpa" target="_blank" className="font-medium text-foreground underline underline-offset-4">
                      Data Processing Addendum
                    </Link>.
                  </label>
                </div>
              )}

              <div className="lg:hidden"><StackStrip layers={layers} /></div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-all hover:-translate-y-px hover:shadow-[0_12px_24px_-14px_hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" && "Sign in"}
                    {mode === "signup" && "Create account"}
                    {mode === "forgot" && "Send reset link"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {(mode === "forgot" || isPartnerMode) && (
              <div className="mt-8 border-t border-border pt-6 text-center">
                {mode === "signup" && (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button onClick={() => setMode("signin")} className="font-medium text-foreground hover:underline">Sign in</button>
                  </p>
                )}
                {mode === "signin" && (
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button onClick={() => setMode("signup")} className="font-medium text-foreground hover:underline">Create one</button>
                  </p>
                )}
                {mode === "forgot" && (
                  <p className="text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <button onClick={() => setMode("signin")} className="font-medium text-foreground hover:underline">Sign in</button>
                  </p>
                )}
              </div>
            )}

            {/* Reassurance on phones, where the side panel is hidden */}
            <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
              Free to start · No card · <Link to="/legal/dpa" className="underline underline-offset-2">DPA</Link> for India’s DPDP Act, 2023
            </p>
          </div>
        </main>

        {/* What you are signing up for: a real-shaped record and the terms behind it */}
        <aside className="relative hidden overflow-hidden border-l border-border bg-secondary/40 lg:flex lg:items-center lg:justify-center" aria-label="What you get">
          <div className="w-full max-w-[460px] px-10 py-24">
            <h2 className="text-[1.9rem] font-semibold leading-tight tracking-tight [text-wrap:balance]">
              {mode === "signin" ? "Every number, still traced to its bill." : "One bill in. A record a lender can check, out."}
            </h2>

            <div className="mt-10"><AccountStack layers={layers} /></div>

            <div className={`mt-8 rounded-3xl border p-5 transition-all duration-700 ${layers.filter(l => !l.optional).every(l => l.done) ? "border-primary/50 bg-background" : "border-border bg-background/70"} shadow-[0_40px_70px_-50px_hsl(var(--foreground)/.5)] [transform:perspective(1000px)_rotateY(-6deg)_rotateX(3deg)] hover:[transform:perspective(1000px)_rotateY(0deg)_rotateX(0deg)]`}>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>Sample record</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 normal-case tracking-normal text-primary">Scope 2</span>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">Electricity bill, Mar 2026</div>
              <div className="mt-1 font-mono text-[15px] text-foreground">4,200 kWh × {INDIA_GRID_FACTOR_KG_PER_KWH.toFixed(3)} kg/kWh</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">= {(4200 * INDIA_GRID_FACTOR_KG_PER_KWH).toLocaleString("en-IN", { maximumFractionDigits: 0 })} kg CO₂</div>
              <dl className="mt-5 grid grid-cols-2 gap-y-2 border-t border-border pt-4 text-[13px]">
                <dt className="text-muted-foreground">Factor source</dt><dd className="text-right">India grid average</dd>
                <dt className="text-muted-foreground">Methodology</dt><dd className="text-right font-mono">{METHODOLOGY_VERSION_TAG}</dd>
                <dt className="text-muted-foreground">Fingerprint</dt><dd className="text-right font-mono">sha256 · 9f2c…e41a</dd>
              </dl>
            </div>

            <ul className="mt-10 space-y-3 text-[15px] text-foreground/80">
              {AUTH_ASSURANCES.map(a => (
                <li key={a.key} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{a.short}{a.href && <> <Link to={a.href} target="_blank" className="text-primary underline-offset-4 hover:underline">{a.linkText}</Link></>}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Auth;
