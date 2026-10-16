import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { StoryView } from "@/components/stories/StoryView";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import type { Story } from "@/lib/caseStudy";

type Item = { id: string; status: string; slug: string | null; buyer: string; industry: string; attribution: string; contact_email: string | null; story: Story | null; created_at: string; published_at: string | null; review_note: string | null };
const TABS = [{ id: "submitted", label: "To review" }, { id: "published", label: "Published" }, { id: "rejected", label: "Not published" }, { id: "private", label: "Private feedback" }, { id: "withdrawn", label: "Withdrawn" }] as const;

async function call(body: Record<string, unknown>) {
  const supabase = await loadSupabase();
  const { data, error } = await supabase.functions.invoke("story-review", { body });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new Error(status === 403 ? "forbidden" : "failed");
  }
  return data;
}

/** One submission: the story exactly as the customer approved it. Reviewers may only remove parts. */
function ReviewCard({ item, onDone }: { item: Item; onDone: () => void }) {
  const [removals, setRemovals] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const act = async (action: string) => {
    setBusy(true); setMsg(null);
    try { await call({ action, id: item.id, removals, confirmIndependent: confirmed, note }); onDone(); }
    catch { setMsg("That did not work. Try again."); }
    finally { setBusy(false); }
  };
  const s = item.story;
  return (
    <li className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span>{new Date(item.created_at).toLocaleString("en-IN")} · {item.attribution} · {item.contact_email ?? "no email"}</span>
        {item.slug && item.status === "published" && <Link to={`/case-studies/${item.slug}`} className="underline">View live</Link>}
      </div>
      {s ? <div className="mt-4"><StoryView story={s} compact /></div> : <p className="mt-4 text-muted-foreground">Content erased after withdrawal.</p>}
      {s && item.status === "submitted" && (
        <div className="mt-5 space-y-3 border-t border-border pt-4 text-[14px]">
          <p className="font-medium">You can only remove parts. Any other change needs the customer's new approval.</p>
          {s.quote && <label className="flex gap-2"><input type="checkbox" checked={removals.includes("quote")} onChange={() => setRemovals(r => toggle(r, "quote"))} /> Remove the quote</label>}
          {s.moment && <label className="flex gap-2"><input type="checkbox" checked={removals.includes("moment")} onChange={() => setRemovals(r => toggle(r, "moment"))} /> Remove “the moment it hurt”</label>}
          {s.numbers.map((n, i) => (
            <div key={i} className="flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex gap-2"><input type="checkbox" checked={removals.includes(`number:${i}`)} onChange={() => setRemovals(r => toggle(r, `number:${i}`))} /> Remove “{n.label}”</label>
              {n.basis === "independent" && <label className="flex gap-2"><input type="checkbox" checked={confirmed.includes(i)} onChange={() => setConfirmed(c => c.includes(i) ? c.filter(x => x !== i) : [...c, i])} /> I checked the verification ({n.basisLabel})</label>}
            </div>
          ))}
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="Internal note (optional)" className="w-full rounded-xl border border-input bg-background px-3 py-2" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => act("approve")} className="h-11 rounded-full bg-primary px-5 font-medium text-primary-foreground disabled:opacity-50">Publish</button>
            <button type="button" disabled={busy} onClick={() => act("reject")} className="h-11 rounded-full border border-border px-5 disabled:opacity-50">Don't publish</button>
          </div>
        </div>
      )}
      {item.status === "published" && (
        <button type="button" disabled={busy} onClick={() => act("unpublish")} className="mt-4 h-10 rounded-full border border-border px-4 text-[14px] disabled:opacity-50">Unpublish</button>
      )}
      {msg && <p className="mt-2 text-[14px] text-destructive" role="alert">{msg}</p>}
    </li>
  );
}

/** Editorial queue for customer stories. The server checks the admin role; this page only shows what it returns. */
const StoryReview = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("submitted");
  const [items, setItems] = useState<Item[] | null>(null);
  const [state, setState] = useState<"ok" | "forbidden" | "error">("ok");
  const load = useCallback(async () => {
    setItems(null);
    try { const d = await call({ action: "list", status: tab }); setItems(d?.items ?? []); setState("ok"); }
    catch (e) { setState((e as Error).message === "forbidden" ? "forbidden" : "error"); setItems([]); }
  }, [tab]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="Story review" description="Customer story review queue." canonical="/admin/stories" noIndex />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-5">
        <h1 className="text-2xl font-semibold">Customer stories</h1>
        {state === "forbidden" ? (
          <p className="mt-6 text-muted-foreground">This page is for Senseible admins. <Link to="/auth?next=%2Fadmin%2Fstories" className="underline">Sign in</Link> with an admin account.</p>
        ) : (
          <>
            <div role="tablist" className="mt-6 flex flex-wrap gap-2">
              {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`h-10 rounded-full border px-4 text-[14px] ${tab === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{t.label}</button>)}
            </div>
            {state === "error" && <p className="mt-6 text-destructive">Could not load stories. The feature may not be switched on yet.</p>}
            {items === null ? <p className="mt-6 text-muted-foreground">Loading…</p> : items.length === 0 ? <p className="mt-6 text-muted-foreground">Nothing here.</p> : (
              <ul className="mt-6 space-y-5">{items.map(i => <ReviewCard key={i.id} item={i} onDone={load} />)}</ul>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StoryReview;
