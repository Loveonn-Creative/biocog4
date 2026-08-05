import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MinimalNav } from "@/components/MinimalNav";
import { PasswordStrength, isPasswordStrong } from "@/components/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";

type LinkState = "checking" | "valid" | "invalid" | "done";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveRecovery = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hasRecoveryHash =
          hash.get("type") === "recovery" || !!hash.get("access_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) setLinkState("invalid");
            return;
          }
        }

        // detectSessionInUrl handles the hash-token style link automatically.
        const { data } = await supabase.auth.getSession();

        if (cancelled) return;
        if (data.session || hasRecoveryHash) {
          setLinkState("valid");
          // Clean the tokens out of the address bar.
          window.history.replaceState({}, "", "/reset-password");
        } else {
          setLinkState("invalid");
        }
      } catch {
        if (!cancelled) setLinkState("invalid");
      }
    };

    resolveRecovery();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordStrong(password)) {
      toast.error("Please create a stronger password");
      return;
    }
    if (password !== confirm) {
      toast.error("Both passwords must match");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(
          error.message.includes("session")
            ? "This reset link has expired. Request a new one."
            : error.message
        );
        return;
      }

      setLinkState("done");
      toast.success("Password updated. Signing you in…");

      const { data: { user } } = await supabase.auth.getUser();
      let destination = "/dashboard";
      if (user) {
        const { data: context } = await supabase
          .from("user_contexts")
          .select("context_type")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (context?.context_type === "partner") destination = "/partner-dashboard";
      }
      navigate(destination, { replace: true });
    } catch {
      toast.error("Could not update your password. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />

      <div className="max-w-md mx-auto px-6 pt-24 pb-20">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        {linkState === "checking" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying your reset link…
          </div>
        )}

        {linkState === "invalid" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-medium tracking-tight">
              This reset link is no longer valid
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Reset links expire for security, and each one can only be used once.
              Request a new link and we will email it straight away.
            </p>
            <Link
              to="/auth?mode=forgot"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Request a new link
            </Link>
          </div>
        )}

        {(linkState === "valid" || linkState === "done") && (
          <>
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified reset link
              </div>
              <h1 className="text-2xl font-medium tracking-tight">Set a new password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Choose a password you have not used before. You will stay signed in on
                this device afterwards.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">New password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter a new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && <PasswordStrength password={password} />}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirm password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Re-enter the password"
                    required
                  />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-destructive mt-1.5">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving || linkState === "done"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
