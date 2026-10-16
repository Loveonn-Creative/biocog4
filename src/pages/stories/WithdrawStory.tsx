import { useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { LeadHeader } from "@/components/lead/LeadKit";
import { loadSupabase } from "@/integrations/supabase/lazyClient";

/** Withdrawal from the emailed link: one clear button, no sign-in needed. */
const WithdrawStory = () => {
  const [token] = useState(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("t");
    if (t) { url.searchParams.delete("t"); window.history.replaceState(window.history.state, "", url.pathname); }
    return t;
  });
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">(token ? "idle" : "invalid");
  const withdraw = async () => {
    setState("busy");
    try {
      const supabase = await loadSupabase();
      const { error } = await supabase.functions.invoke("story-submit", { body: { action: "withdraw", token } });
      if (error) { const s = (error as { context?: { status?: number } }).context?.status; setState(s === 410 ? "invalid" : "error"); return; }
      setState("done");
    } catch { setState("error"); }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="Withdraw your story" description="Withdraw a customer story you shared with Senseible." canonical="/case-studies/withdraw" noIndex />
      <LeadHeader />
      <main className="mx-auto max-w-lg px-5 pt-28 text-center">
        {state === "done" ? (
          <>
            <h1 className="text-2xl font-semibold">Your story has been withdrawn.</h1>
            <p className="mt-3 text-muted-foreground">It is no longer shown on senseible.earth. Its content is erased within 30 days; we keep only the record of your consent and its withdrawal.</p>
          </>
        ) : state === "invalid" ? (
          <>
            <h1 className="text-2xl font-semibold">This link is not valid.</h1>
            <p className="mt-3 text-muted-foreground">Reach us through the contact in our <Link to="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link> and we will take it down within 7 business days.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Withdraw your story?</h1>
            <p className="mt-3 text-muted-foreground">It comes off senseible.earth straight away and is never used in new material.</p>
            <button type="button" onClick={withdraw} disabled={state === "busy"} className="mt-6 h-12 rounded-full bg-destructive px-7 text-[15px] font-medium text-destructive-foreground disabled:opacity-60">{state === "busy" ? "Withdrawing…" : "Withdraw my story"}</button>
            {state === "error" && <p className="mt-3 text-[14px] text-destructive" role="alert">Something went wrong. Please try again.</p>}
          </>
        )}
        <p className="mt-8"><Link to="/" className="text-[14px] underline underline-offset-2">Back to Senseible</Link></p>
      </main>
    </div>
  );
};

export default WithdrawStory;
