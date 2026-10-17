import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { MinimalNav } from '@/components/MinimalNav';
import { SEOHead } from '@/components/SEOHead';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import {
  BUSINESS_TYPES, CARBON_STATUS, FUNDING_BANDS, TURNOVER_BANDS, USES, YES_NO_UNSURE,
  checkReadiness, summaryText, type CheckAnswers, type Choice,
} from '@/lib/greenLoanCheck';
import { DISCLOSURE } from '../../supabase/functions/_shared/financeApplication';

// Guest green-loan check: one tap per question, mobile first. Each answer
// lays a plank of the bridge from "your business" to "lender-ready"; the
// carbon footprint is the plank most MSMEs are missing, and the result leads
// to Senseible's MRV workflow (measure from one invoice) without forcing it.

type Key = keyof CheckAnswers;
const QUESTIONS: Array<{ key: Key; title: string; hint?: string; choices: Choice[] }> = [
  { key: 'business', title: 'What does your business do?', choices: BUSINESS_TYPES },
  { key: 'funding', title: 'How much funding do you need?', choices: FUNDING_BANDS },
  { key: 'turnover', title: 'Your turnover last year?', hint: 'A range is enough', choices: TURNOVER_BANDS },
  { key: 'use', title: 'What will the money go into?', choices: USES },
  { key: 'carbon', title: 'Do you know your carbon footprint?', hint: 'Lenders ask how the project cuts emissions', choices: CARBON_STATUS },
];
const PLANKS = ['Business', 'Funding', 'Turnover', 'Project', 'Carbon', 'Basics', 'Contact'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Bridge({ done }: { done: number }) {
  return (
    <div className="gc-bridge" aria-label={`${done} of ${PLANKS.length} answered`}>
      {PLANKS.map((p, i) => (
        <span key={p} className={`gc-plank ${i < done ? 'gc-plank-on' : ''} ${p === 'Carbon' ? 'gc-plank-carbon' : ''}`}><span className="gc-plank-label">{p}</span></span>
      ))}
    </div>
  );
}

export default function GreenLoanCheck() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<CheckAnswers>({});
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const pick = (key: Key, id: string) => { setA({ ...a, [key]: id }); setStep(step + 1); };
  const answered = done ? PLANKS.length : step;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contact.name.trim().length < 2) return setError('Add your name');
    if (!EMAIL_RE.test(contact.email.trim())) return setError('Add an email we can reply to');
    if (!consent) return setError('Please agree so we can contact you');
    setError(''); setSending(true);
    try {
      const supabase = await loadSupabase();
      const { error: fnError } = await supabase.functions.invoke('send-contact-notification', {
        body: { name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim() || undefined, company: contact.company.trim() || undefined, category: 'green-loan-check', message: summaryText(a) },
      });
      setSendFailed(!!fnError);
    } catch { setSendFailed(true); }
    setSending(false); setDone(true);
  };

  const result = checkReadiness(a);
  const q = QUESTIONS[step];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={STATIC_PAGE_META['/green-loan-check'].title} description={STATIC_PAGE_META['/green-loan-check'].description} canonical="/green-loan-check" />
      <MinimalNav />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-24">
        <p className="text-xs uppercase tracking-wider text-primary">Green loan check · 2 minutes</p>
        <Bridge done={answered} />

        {!done && q && (
          <section key={q.key} className="gc-card">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{q.title}</h1>
            {q.hint && <p className="mt-1 text-sm text-muted-foreground">{q.hint}</p>}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {q.choices.map((c) => (
                <button key={c.id} type="button" onClick={() => pick(q.key, c.id)}
                  className={`gc-choice ${a[q.key] === c.id ? 'gc-choice-on' : ''}`}>{c.label}</button>
              ))}
            </div>
            {q.key === 'carbon' && <p className="mt-4 text-xs text-muted-foreground">Not yet is the most common answer, and the easiest to fix.</p>}
          </section>
        )}

        {!done && step === QUESTIONS.length && (
          <section className="gc-card">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Two quick basics</h1>
            {([['gst', 'Is the business GST registered?'], ['itr', 'Income tax returns filed for the last 2 years?']] as const).map(([key, label]) => (
              <div key={key} className="mt-5">
                <p className="text-sm font-medium">{label}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {YES_NO_UNSURE.map((c) => (
                    <button key={c.id} type="button" onClick={() => setA({ ...a, [key]: c.id })} className={`gc-choice text-center ${a[key] === c.id ? 'gc-choice-on' : ''}`}>{c.label}</button>
                  ))}
                </div>
              </div>
            ))}
            <Button className="mt-6 w-full sm:w-auto" disabled={!a.gst || !a.itr} onClick={() => setStep(step + 1)}>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </section>
        )}

        {!done && step === QUESTIONS.length + 1 && (
          <form className="gc-card" onSubmit={submit} noValidate>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Where should we send your checklist?</h1>
            <div className="mt-5 grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="gc-name">Your name</Label><Input id="gc-name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="gc-email">Email</Label><Input id="gc-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label htmlFor="gc-phone">WhatsApp (optional)</Label><Input id="gc-phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="gc-company">Company (optional)</Label><Input id="gc-company" autoComplete="organization" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} /></div>
              </div>
              <label htmlFor="gc-consent" className="flex items-start gap-3 text-sm text-muted-foreground">
                <Checkbox id="gc-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>I agree that Senseible may use these details and answers only to reply about green financing readiness, as set out in the <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>. I can withdraw at any time by writing to impact@senseible.earth.</span>
              </label>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" disabled={sending} className="w-full sm:w-auto">{sending ? 'Sending…' : 'Show my readiness'}</Button>
            </div>
          </form>
        )}

        {!done && step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
        )}

        {done && (
          <section className="gc-card">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your green loan readiness</h1>
            <p className="mt-1 text-sm text-muted-foreground">What a credit team will look for, and where you stand today. This is a preparation checklist, not an eligibility decision.</p>
            <ul className="mt-5 space-y-3">
              {result.lines.map((l) => (
                <li key={l.id} className={`gc-line ${l.state === 'ready' ? 'gc-line-ready' : ''} ${l.id === 'carbon' && l.state === 'next' ? 'gc-line-carbon' : ''}`}>
                  <span className="gc-dot" aria-hidden="true">{l.state === 'ready' ? <Check className="h-3.5 w-3.5" /> : null}</span>
                  <span className="min-w-0"><span className="block font-medium">{l.label}</span><span className="block text-sm text-muted-foreground">{l.detail}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-border p-4">
              <p className="font-medium">Your estimate</p>
              <p className="mt-1 text-sm text-muted-foreground">A loan size estimate needs your net profit, turnover and financial statements, so it is not shown from these quick answers. Submit the green loan application and your Estimate appears there, with every assumption listed.</p>
            </div>
            {result.carbonNext ? (
              <div className="mt-6 rounded-2xl bg-primary/10 p-4">
                <p className="font-medium">Your next plank: a measured carbon footprint</p>
                <p className="mt-1 text-sm text-muted-foreground">Upload one electricity bill or fuel invoice. Senseible reads it and shows the emissions behind it, with the source kept as evidence. No carbon expertise needed.</p>
                <Button asChild className="mt-3"><Link to="/">Measure from one invoice <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
              </div>
            ) : (
              <Button asChild className="mt-6"><Link to="/auth?next=/green-loan">Sign in to prepare your application <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
            )}
            <p className="mt-4 text-sm text-muted-foreground">{sendFailed ? 'We could not send your details just now; your checklist above is complete. You can write to impact@senseible.earth.' : 'Thanks. We have your answers and will reply by email.'}</p>
          </section>
        )}

        <p className="mt-10 text-xs text-muted-foreground">{DISCLOSURE}</p>
      </main>
    </div>
  );
}
