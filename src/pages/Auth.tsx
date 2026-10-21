import { useState, useEffect, useRef } from "react";
import { BusinessIdField, type BusinessIdResult } from "@/components/auth/BusinessIdField";
import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Briefcase } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStatus, useSession } from "@/hooks/useSession";
import { PasswordStrength, isPasswordStrong } from "@/components/PasswordStrength";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { analyticsEvents } from "@/lib/analytics";
import { INDIA_GRID_FACTOR_KG_PER_KWH, METHODOLOGY_VERSION_TAG } from "@/lib/factors";
import { AccountStack, StackStrip, type StackLayer } from "@/components/auth/AccountStack";
import {
  cleanAuthUrl, EMAIL_REDIRECT_URL, forgetPendingEmail, parseAuthLinkError, parseAuthLinkMessage, parseAuthLinkSuccess, pendingEmail,
  rememberPendingEmail, resendErrorMessage, type AuthLinkError,
} from "@/lib/authLink";
import { takeAuthLinkSnapshot } from "@/lib/authLinkSnapshot";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_S = 60;
const NETWORK_MSG = 'Could not reach Senseible. Check your connection and try again.';
/** supabase-js reports a failed request as an error (status 0 / AuthRetryableFetchError), not a throw. */
const isNetworkError = (e: { name?: string; status?: number; message?: string }) =>
  e.name === 'AuthRetryableFetchError' || e.status === 0 || /failed to fetch|network/i.test(e.message ?? '');

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
  
  const { isAuthenticated, isLoading: sessionLoading, user: sessionUser } = useSession();
  const authStatus = useAuthStatus();
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

  // Email-link outcomes: a link that failed, or a sign-up waiting for its confirmation.
  const [linkError, setLinkError] = useState<AuthLinkError | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  // Sign in without a password: a one-time link to the account email. Never
  // creates an account, and says the same thing whether or not one exists.
  const [linkSending, setLinkSending] = useState(false);
  const [linkCooldown, setLinkCooldown] = useState(0);
  useEffect(() => {
    if (linkCooldown <= 0) return;
    const t = window.setTimeout(() => setLinkCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [linkCooldown]);
  const sendSignInLink = async () => {
    const target = email.trim();
    if (!EMAIL_RE.test(target)) {
      toast.error("Enter your email first, then tap the link option.");
      document.getElementById("auth-email")?.focus();
      return;
    }
    if (linkSending || linkCooldown > 0) return;
    setLinkSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: target, options: { shouldCreateUser: false, emailRedirectTo: EMAIL_REDIRECT_URL } });
      if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
        toast.error("Too many emails sent. Wait a minute, then try again.");
        setLinkCooldown(RESEND_COOLDOWN_S);
        return;
      }
      if (error && isNetworkError(error)) { toast.error(NETWORK_MSG); return; }
      // Same reply for unknown addresses, so the form never reveals who has an account.
      setLinkCooldown(RESEND_COOLDOWN_S);
      toast.success(`If ${target} has an account, a sign-in link is on its way. It works once, on this device.`);
    } catch {
      toast.error(NETWORK_MSG);
    } finally {
      setLinkSending(false);
    }
  };

  const resend = async (address: string) => {
    const target = address.trim();
    if (!EMAIL_RE.test(target)) {
      toast.error("Enter the email you signed up with, then press Resend.");
      document.getElementById("auth-resend-email")?.focus();
      return;
    }
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: target, options: { emailRedirectTo: EMAIL_REDIRECT_URL } });
      if (error) {
        toast.error(resendErrorMessage(error));
        if (error.status === 429 || error.code === "over_email_send_rate_limit") setCooldown(RESEND_COOLDOWN_S);
        return;
      }
      rememberPendingEmail(target);
      setAwaitingEmail(target);
      setLinkError(null);
      setCooldown(RESEND_COOLDOWN_S);
      toast.success(`New link sent to ${target}. Check spam if it is not in your inbox.`);
    } catch {
      toast.error(resendErrorMessage({ message: "network" }));
    } finally {
      setResending(false);
    }
  };

  // Read what an email link brought, once, then clear it from the address bar.
  useEffect(() => {
    const snap = takeAuthLinkSnapshot();
    if (!snap) return;
    window.history.replaceState(window.history.state, "", cleanAuthUrl(window.location.pathname, snap.search));
    const err = parseAuthLinkError(snap.hash, snap.search);
    if (err) {
      const remembered = pendingEmail();
      setLinkError(err);
      setResendEmail(remembered);
      setMode("signin");
      toast.error(err.title, {
        description: err.detail,
        duration: 12000,
        action: err.canResend ? { label: "Resend email", onClick: () => void resend(remembered || (document.getElementById("auth-resend-email") as HTMLInputElement | null)?.value || "") } : undefined,
      });
      return;
    }
    // Email change: the first confirmed link says to open the one sent to the other address.
    if (parseAuthLinkMessage(snap.hash) && !parseAuthLinkSuccess(snap.hash)) {
      toast.success("One link confirmed", { description: "Open the link sent to your other email address to finish the change.", duration: 10000 });
      return;
    }
    const ok = parseAuthLinkSuccess(snap.hash);
    if (!ok) return;
    void (async () => {
      // The auth client normally reads the tokens itself; if it had already
      // started, set the session from them so the link still signs the user in.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const h = new URLSearchParams(snap.hash.replace(/^#/, ""));
        const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
        const { error } = access_token && refresh_token ? await supabase.auth.setSession({ access_token, refresh_token }) : { error: new Error("missing") };
        if (error) {
          setLinkError(parseAuthLinkError("#error_code=otp_expired", ""));
          setResendEmail(pendingEmail());
          toast.error("Link expired or already used", { description: "Sign in, or send yourself a fresh link." });
          return;
        }
      }
      forgetPendingEmail();
      toast.success(ok.type === "email_change" ? "Email changed. Use your new address to sign in from now on." : ok.type === "signup" ? "Email confirmed. Signing you in…" : ok.type === "magiclink" ? "Signed in with your email link." : "Signed in. Taking you to your dashboard…");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // One redirect per visit. Signing in also updates the session, so without
  // this guard the form and the effect below would both navigate. Replacing
  // the history entry keeps Back from returning to a sign-in page that would
  // only bounce forward again.
  const redirectStarted = useRef(false);
  // While the form is submitting it decides where to go (a new partner
  // account goes to the partner dashboard before its context row is readable).
  const submitting = useRef(false);
  const redirectTo = async (userId: string) => {
    if (redirectStarted.current) return;
    redirectStarted.current = true;
    forgetPendingEmail();
    await completePendingPartner(userId);
    navigate(await getRedirectPath(userId), { replace: true });
  };

  // A partner who had to confirm their email first: their organisation details
  // waited in the account metadata; create the application on first sign-in.
  const completePendingPartner = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const intent = user?.user_metadata?.partner_intent as { organization_name?: string; organization_type?: string; website?: string; email?: string } | undefined;
      if (!intent?.organization_type) return;
      const { data: existing } = await supabase.from('user_contexts').select('id').eq('user_id', userId).eq('context_type', 'partner').maybeSingle();
      if (!existing) {
        const { error: appError } = await supabase.from('partner_applications').insert({
          user_id: userId, organization_name: intent.organization_name || 'Unnamed Organization', organization_type: intent.organization_type,
          contact_email: intent.email || user?.email || '', website: intent.website || null, status: 'pending',
        });
        if (appError) { console.error('Partner application error:', appError.code); return; }
        const { error: ctxError } = await supabase.from('user_contexts').insert({
          user_id: userId, context_type: 'partner', context_id: userId, context_name: intent.organization_name || 'Unnamed Organization', is_active: true,
        });
        if (ctxError) { console.error('Partner context error:', ctxError.code); return; }
      }
      await supabase.auth.updateUser({ data: { partner_intent: null } });
    } catch (e) {
      console.error('Partner completion failed', e instanceof Error ? e.message : 'unknown');
    }
  };

  // Redirect if already authenticated (the session already holds the user,
  // so no extra round trip is needed).
  useEffect(() => {
    if (!sessionLoading && isAuthenticated && sessionUser && !submitting.current) void redirectTo(sessionUser.id);
  }, [isAuthenticated, sessionLoading, sessionUser]);

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
    submitting.current = true;
    
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          if (isNetworkError(error)) {
            toast.error(NETWORK_MSG);
          } else if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
            setAwaitingEmail(email);
            setResendEmail(email);
            toast.error('Confirm your email first', {
              description: 'Open the link we emailed you. Lost it? Send a fresh one.',
              action: { label: 'Resend email', onClick: () => void resend(email) },
            });
          } else if (error.code === 'invalid_credentials' || error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again, or reset your password.');
          } else if (error.status === 429 || error.code === 'over_request_rate_limit') {
            toast.error('Too many attempts. Wait a minute, then try again.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        if (data.user) {
          analyticsEvents.login('password');
          toast.success("Welcome back! Redirecting...");
          await redirectTo(data.user.id);
        }
      } else if (mode === "signup") {
        // ALWAYS use production domain for email verification - never use Lovable preview URLs
        // This ensures all verification emails redirect to senseible.earth
        // The link returns to /auth, which signs the user in or explains a failed link.
        const redirectUrl = EMAIL_REDIRECT_URL;
        
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
               data_consent_version: '2026-09-25',
               // Created on first sign-in if the account must confirm its email first.
               partner_intent: isPartnerMode && organizationType
                 ? { organization_name: businessName, organization_type: organizationType, website: website || undefined, email }
                 : undefined,
            }
          }
        });
        
        if (error) {
          if (isNetworkError(error)) {
            toast.error(NETWORK_MSG);
          } else if (error.code === 'user_already_exists' || error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
            setMode('signin');
          } else if (error.code === 'weak_password') {
            toast.error('Please choose a stronger password.');
          } else if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
            toast.error('Too many sign-up emails sent. Wait a minute, then try again.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        // With email confirmation on, an address that already has an account
        // comes back as a user with no identities and no email is sent.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          toast.error('An account may already exist for this email. Sign in, or reset your password.');
          setMode('signin');
          return;
        }

        // Confirmation required: no session yet. Stay here and say what to do next.
        if (data.user && !data.session) {
          analyticsEvents.signUp('password', isPartnerMode ? 'partner' : 'msme');
          rememberPendingEmail(email);
          setAwaitingEmail(email);
          setResendEmail(email);
          setLinkError(null);
          setCooldown(RESEND_COOLDOWN_S);
          toast.success('Check your inbox to confirm your email.');
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
              redirectStarted.current = true;
              navigate('/partner-dashboard', { replace: true });
              return;
            }
          }
          
          toast.success("Account created! Redirecting...");
          await redirectTo(data.user.id);
        }
      } else {
        // Forgot password: return to the origin the user is on (must be in the Supabase redirect allow list).
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        
        if (error) {
          toast.error(isNetworkError(error) ? NETWORK_MSG : error.status === 429 || error.code === 'over_email_send_rate_limit' ? 'Too many emails sent. Wait a minute, then try again.' : error.message);
          return;
        }
        
        toast.success("If an account exists for that email, a reset link is on its way. Check spam too.");
        setMode('signin');
      }
    } catch (err) {
      console.error('Auth error:', err instanceof Error ? err.message : 'unknown');
      toast.error(NETWORK_MSG);
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  // Show the form as soon as the visitor is known to be signed out; it does
  // not need the guest session. A signed-in visitor keeps the spinner while
  // the redirect runs.
  if (authStatus !== 'signedOut') {
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

            {(linkError || awaitingEmail) && (
              <section role="status" aria-live="polite" className="mb-6 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
                {awaitingEmail && !linkError ? (
                  <>
                    <p className="font-medium text-foreground">Check your inbox</p>
                    <p className="mt-1 text-sm text-muted-foreground">We sent a confirmation link to <span className="font-medium text-foreground">{awaitingEmail}</span>. Open it on this device to finish signing up.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void resend(awaitingEmail)} disabled={resending || cooldown > 0}
                        className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
                        {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                      </button>
                      <button type="button" onClick={() => { setAwaitingEmail(null); forgetPendingEmail(); setMode("signup"); }} className="h-10 rounded-full border border-border px-4 text-sm">Use a different email</button>
                      <button type="button" onClick={() => { setAwaitingEmail(null); setMode("signin"); }} className="h-10 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
                    </div>
                  </>
                ) : linkError && (
                  <>
                    <p className="font-medium text-foreground">{linkError.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{linkError.detail}</p>
                    {linkError.canResend && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label htmlFor="auth-resend-email" className="sr-only">Email you signed up with</label>
                        <input id="auth-resend-email" type="email" autoComplete="email" inputMode="email" placeholder="you@business.com"
                          value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} className={`${field} h-10 min-w-0 flex-1`} />
                        <button type="button" onClick={() => void resend(resendEmail)} disabled={resending || cooldown > 0}
                          className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
                          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                        </button>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">Already confirmed? Sign in below.</p>
                  </>
                )}
              </section>
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

            {mode === "signin" && (
              <button type="button" onClick={() => void sendSignInLink()} disabled={linkSending || linkCooldown > 0}
                className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">
                {linkSending ? "Sending…" : linkCooldown > 0 ? `Sign-in link sent. Resend in ${linkCooldown}s` : "Email me a sign-in link instead"}
              </button>
            )}

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
