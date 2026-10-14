import { useState } from "react";
import { Link } from "react-router-dom";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/platform/Reveal";
import { StickyCta } from "@/components/lead/LeadKit";
import { ApplicationCard3D } from "@/components/grants/ApplicationCard3D";
import { CoinStack, FactoryRoof, GlobeLines, KeyAccess, RisingSun, SparkLeaf, TwoVoices } from "@/components/doodles/Doodles";

const BENEFIT_ART = [KeyAccess, CoinStack, GlobeLines, TwoVoices];
const AUDIENCE_ART = [SparkLeaf, FactoryRoof, RisingSun];

const grantSchema = z.object({
  applicantName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  phone: z.string().optional(),
  companyName: z.string().min(2, "Company name is required").max(150),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  country: z.string().min(1, "Please select your country"),
  companyStage: z.string().min(1, "Please select your company stage"),
  sector: z.string().min(1, "Please select your sector"),
  employeeCount: z.string().optional(),
  annualRevenue: z.string().optional(),
  useCase: z.string().min(20, "Please describe your use case (min 20 characters)").max(500),
  pitch: z.string().min(50, "Please share your pitch (min 50 characters)").max(1000),
  carbonFocus: z.string().optional(),
  // DPDP: an active, specific agreement, not implied by submitting.
  consent: z.boolean().refine((v) => v === true, "Please agree so we can review your application"),
});

type GrantFormData = z.infer<typeof grantSchema>;

const countries = [
  "India", "United States", "United Kingdom", "Singapore", "UAE", 
  "Indonesia", "Brazil", "Nigeria", "Kenya", "South Africa",
  "Germany", "France", "Japan", "Australia", "Canada", "Other"
];

const companyStages = [
  { value: "idea", label: "Idea Stage" },
  { value: "prototype", label: "Prototype / MVP" },
  { value: "early-revenue", label: "Early Revenue" },
  { value: "scaling", label: "Scaling" },
  { value: "established", label: "Established MSME" },
];

const sectors = [
  "Manufacturing", "Agriculture & Food", "Energy & Utilities", 
  "Transportation & Logistics", "Textiles", "Construction",
  "Retail & E-commerce", "Healthcare", "Technology / SaaS", 
  "Financial Services", "Waste Management", "Other"
];

const benefits = [
  { value: "$13,000", label: "Platform Access", desc: "12-month premium tier" },
  { value: "$150,000", label: "Cash Benefits", desc: "Matched funding pool" },
  { value: "100+", label: "Countries", desc: "Global cohort access" },
  { value: "1:1", label: "Advisory", desc: "Climate finance experts" },
];

const audiences = [
  { title: "AI & Climate Startups", desc: "Building technology for carbon measurement, reduction, or finance" },
  { title: "MSMEs", desc: "Micro, small, and medium enterprises ready to quantify and monetize carbon impact" },
  { title: "Emerging Markets", desc: "Priority for India, Southeast Asia, Africa, and Latin America" },
];

/** What happens after you press submit, from the page's own promises. */
const journey = [
  { n: "01", title: "Apply", desc: "Takes less than 5 minutes. No login required." },
  { n: "02", title: "Confirmation", desc: "Check your inbox for a confirmation email." },
  { n: "03", title: "Review", desc: "Our team will review your application and respond within 5 business days." },
];

const scrollToForm = () => {
  document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => document.querySelector<HTMLInputElement>('#application-form input[name="applicantName"]')?.focus({ preventScroll: true }), 600);
};

/** Live character count against the field's limits, so the applicant knows where they stand before submitting. */
const Counter = ({ value, min, max }: { value: string; min: number; max: number }) => {
  const n = value.trim().length;
  const ok = n >= min;
  return (
    <span className={`text-xs tabular-nums ${ok ? "text-muted-foreground" : "text-muted-foreground/70"}`} aria-live="polite">
      {ok ? `${n}/${max}` : `${min - n} more characters`}
    </span>
  );
};

const teamSizes = ["1-5", "6-20", "21-50", "51-200", "200+"].map((v) => ({ value: v, label: v }));

type FieldName = keyof GrantFormData;
type Option = { value: string; label: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** What each blank needs, in the letter's own words. */
const NEEDS: Partial<Record<FieldName, string>> = {
  applicantName: "your name", email: "an email we can reply to", companyName: "your company's name",
  website: "a website like yourcompany.com, or leave it blank", country: "your country", companyStage: "your stage", sector: "your sector",
};

/** The blanks that must be filled before the letter can be sent; they drive the ink line. */
const REQUIRED: Array<[FieldName, (v: GrantFormData) => boolean]> = [
  ["applicantName", (v) => v.applicantName.trim().length >= 2],
  ["email", (v) => EMAIL_RE.test(v.email.trim())],
  ["companyName", (v) => v.companyName.trim().length >= 2],
  ["country", (v) => !!v.country],
  ["companyStage", (v) => !!v.companyStage],
  ["sector", (v) => !!v.sector],
  ["useCase", (v) => v.useCase.trim().length >= 20],
  ["pitch", (v) => v.pitch.trim().length >= 50],
  ["consent", (v) => v.consent],
];

/** Accept "yourcompany.com" as well as a full URL. */
const withScheme = (v: unknown) => {
  const t = String(v ?? "").trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
};

/** A blank inside a sentence that grows with what is typed. */
const Blank = ({ name, label, placeholder, type = "text", autoComplete, inputMode }: {
  name: FieldName; label: string; placeholder: string; type?: string; autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
}) => {
  const { register, watch, formState: { errors } } = useFormContext<GrantFormData>();
  const value = String(watch(name) ?? "");
  const width = Math.min(Math.max(value.length, placeholder.length) + 2, 40);
  return (
    <input {...register(name, name === "website" ? { setValueAs: withScheme } : undefined)} type={type} aria-label={label}
      placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} aria-invalid={!!errors[name]}
      className={`lt-blank ${value.trim() ? "lt-filled" : ""}`} style={{ width: `${width}ch` }} />
  );
};

/** A choice inside a sentence: a native select, so phones show their own picker. */
const Pick = ({ name, label, placeholder, options }: { name: FieldName; label: string; placeholder: string; options: Option[] }) => {
  const { register, watch, formState: { errors } } = useFormContext<GrantFormData>();
  const value = String(watch(name) ?? "");
  const shown = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <span className="lt-pick">
      <select {...register(name)} aria-label={label} aria-invalid={!!errors[name]}
        className={`lt-blank lt-select ${value ? "lt-filled" : ""}`} style={{ width: `${Math.min(shown.length + 3, 34)}ch` }}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  );
};

/** One gentle line under a sentence naming what is still missing in it. */
const Missing = ({ names }: { names: FieldName[] }) => {
  const { formState: { errors } } = useFormContext<GrantFormData>();
  const needs = names.filter((n) => errors[n]).map((n) => NEEDS[n]);
  if (!needs.length) return null;
  return <p className="-mt-2 mb-4 text-sm text-destructive" role="alert">Still needed: {needs.join(", ")}.</p>;
};

/** A paragraph the applicant writes, on ruled lines, with a live count. */
const Para = ({ name, lead, placeholder, rows, min, max }: {
  name: "useCase" | "pitch" | "carbonFocus"; lead: string; placeholder: string; rows: number; min?: number; max?: number;
}) => {
  const { register, watch, formState: { errors } } = useFormContext<GrantFormData>();
  const value = watch(name) ?? "";
  const err = errors[name];
  const id = `lt-${name}`;
  return (
    <div className="lt-para">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="lt-lead">{lead}</label>
        {min && max ? <Counter value={value} min={min} max={max} /> : null}
      </div>
      <textarea id={id} {...register(name)} rows={rows} maxLength={max} placeholder={placeholder}
        aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} className={`lt-area ${value.trim() ? "lt-filled" : ""}`} />
      {err && <p id={`${id}-err`} className="text-sm text-destructive" role="alert">{err.message}</p>}
    </div>
  );
};

const Grants = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<GrantFormData>({
    resolver: zodResolver(grantSchema),
    mode: "onTouched",
    defaultValues: {
      applicantName: "",
      email: "",
      phone: "",
      companyName: "",
      website: "",
      country: "",
      companyStage: "",
      sector: "",
      employeeCount: "",
      annualRevenue: "",
      useCase: "",
      pitch: "",
      carbonFocus: "",
      consent: false,
    },
  });

  const onSubmit = async (data: GrantFormData) => {
    setIsSubmitting(true);
    try {
      // Insert application into database
      const { error: dbError } = await supabase
        .from("grant_applications")
        .insert({
          applicant_name: data.applicantName,
          email: data.email,
          phone: data.phone || null,
          company_name: data.companyName,
          website: data.website || null,
          country: data.country,
          company_stage: data.companyStage,
          sector: data.sector,
          employee_count: data.employeeCount || null,
          annual_revenue: data.annualRevenue || null,
          use_case: data.useCase,
          pitch: data.pitch,
          carbon_focus: data.carbonFocus || null,
        });

      if (dbError) throw dbError;

      // Trigger notification emails
      const { error: emailError } = await supabase.functions.invoke("notify-grant-application", {
        body: {
          applicantName: data.applicantName,
          email: data.email,
          companyName: data.companyName,
          country: data.country,
          companyStage: data.companyStage,
          sector: data.sector,
          pitch: data.pitch,
        },
      });

      if (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the submission if email fails
      }

      setSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and get back to you within 5 business days.",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: (error instanceof Error && error.message) || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = () => {
    // Take the applicant straight to the first field that needs attention.
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('#application-form [aria-invalid="true"]');
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }, 50);
  };

  if (submitted) {
    return (
      <>
        <SEOHead
          title="Application Submitted | Senseible Accelerator"
          description="Thank you for applying to the Senseible Accelerator Program."
        />
        <div className="min-h-screen bg-background">
          <MinimalNav />
          <main className="pt-28 pb-20 px-5">
            <div className="max-w-xl mx-auto text-center animate-fade-in">
              <svg viewBox="0 0 64 64" className="mx-auto mb-8 h-16 w-16 text-primary" aria-hidden="true">
                <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
                <path d="M19 33 L28 42 L46 23" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray={1} className="animate-[lm-draw_700ms_200ms_cubic-bezier(.6,0,.2,1)_both] motion-reduce:animate-none" />
              </svg>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Application Received</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our team will review your application and respond within 5 business days.
                Check your inbox for a confirmation email.
              </p>
              <ol className="mt-10 grid gap-3 text-left">
                {journey.map((j, i) => (
                  <li key={j.n} className={`flex gap-4 rounded-2xl border p-4 ${i === 0 ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                    <span className={`font-mono text-xs pt-0.5 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i === 0 ? "Done" : j.n}</span>
                    <div>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-sm text-muted-foreground">{j.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Button asChild size="lg" className="mt-10 rounded-full px-7">
                <Link to="/platform">Explore the platform <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  const values = form.watch();
  const filled = REQUIRED.filter(([, ok]) => ok(values)).length;
  const consent = values.consent;
  const applicantName = values.applicantName ?? "";
  const errors = form.formState.errors;

  return (
    <>
        <SEOHead
          title="Accelerator Grants: AI Startups & MSMEs | Senseible"
          description="Unlock $13,000 in platform access and up to $150,000 in cash benefits. Priority for India and emerging markets. Apply now for climate-tech acceleration."
          keywords={["AI grants", "startup accelerator", "MSME funding", "India startup grants", "climate tech funding", "emerging market accelerator", "carbon credits startup"]}
        />
      <div className="min-h-screen bg-background">
        <MinimalNav />

        {/* 1. The offer and the one action, with what it costs the founder in time */}
        <section className="overflow-x-clip pt-28 pb-14 md:pt-36 md:pb-20">
          <div className="container max-w-5xl mx-auto px-5">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 px-3 py-1 text-[13px] font-medium text-primary">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/50 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Applications Open
                </div>
                <h1 className="mt-6 text-[2.6rem] leading-[1.04] md:text-6xl font-semibold tracking-tight">
                  Accelerate Your
                  <span className="block text-primary">Climate Impact</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Unlock platform access worth $13,000 and cash benefits up to $150,000.
                  Built for AI startups and MSMEs in India and emerging markets.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Button size="lg" className="group h-12 rounded-full px-7 text-base" onClick={scrollToForm}>
                    Start Application
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>

              {/* The application filling itself in, and what happens after */}
              <div>
                <ApplicationCard3D />
                <ol className="mt-6 grid grid-cols-3 gap-3" aria-label="What happens after you apply">
                  {journey.map((j, i) => (
                    <li key={j.n} className="border-t-2 pt-3" style={{ borderColor: i === 0 ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                      <div className="text-sm font-medium">{j.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{j.desc}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* 2. What you get: four facts, each with a drawing of what it is */}
        <section className="py-16 md:py-20 bg-secondary/30 border-y border-border">
          <div className="container max-w-5xl mx-auto px-5">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {benefits.map((b, i) => {
                const Art = BENEFIT_ART[i];
                return (
                  <Reveal key={b.label} delay={i * 80} className="group rounded-3xl border border-border bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-34px_hsl(var(--foreground)/.45)] md:p-6">
                    <div className="text-foreground/60"><Art /></div>
                    <dt className="sr-only">{b.label}</dt>
                    <dd>
                      <div className="mt-4 font-mono text-2xl md:text-3xl leading-none text-foreground">{b.value}</div>
                      <div className="mt-2 font-medium">{b.label}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{b.desc}</div>
                    </dd>
                  </Reveal>
                );
              })}
            </dl>
          </div>
        </section>

        {/* 3. Who should apply: a quick self-check */}
        <section className="py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-5">
            <div className="grid gap-10 md:grid-cols-2">
              <div className="md:col-span-2 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Who Should Apply</h2>
                <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                  We prioritize high-intent founders solving real climate problems
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-3 md:col-span-2">
                {audiences.map((a, i) => {
                  const Art = AUDIENCE_ART[i];
                  return (
                    <li key={a.title}>
                      <Reveal delay={i * 90} className="h-full rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                        <div className="text-foreground/60"><Art /></div>
                        <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* 4. The application as a short letter: blanks in plain sentences, the ink settles as each one is filled */}
        <section id="application-form" className="scroll-mt-20 py-16 md:py-24 bg-secondary/30 border-t border-border">
          <div className="container max-w-3xl mx-auto px-5">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Write to us</h2>
            <p className="mt-3 text-muted-foreground">Fill the blanks. Less than 5 minutes, no login.</p>
            <div className="lt-ink mt-6" role="progressbar" aria-label="Letter completed" aria-valuemin={0} aria-valuemax={REQUIRED.length} aria-valuenow={filled}>
              <span style={{ transform: `scaleX(${filled / REQUIRED.length})` }} />
            </div>

            <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="lt-paper mt-4">
              <p className="lt-greeting">Dear Senseible team,</p>

              <p className="lt-line">
                I'm <Blank name="applicantName" label="Your full name" placeholder="your name" autoComplete="name" />, and you can reach me at{" "}
                <Blank name="email" label="Email" placeholder="you@company.com" type="email" autoComplete="email" inputMode="email" />{" "}
                or on <Blank name="phone" label="Phone (optional)" placeholder="phone, optional" type="tel" autoComplete="tel" inputMode="tel" />.
              </p>
              <Missing names={["applicantName", "email"]} />

              <p className="lt-line">
                I run <Blank name="companyName" label="Company name" placeholder="company name" autoComplete="organization" />{" "}
                (online at <Blank name="website" label="Website (optional)" placeholder="website, optional" autoComplete="url" inputMode="url" />) from{" "}
                <Pick name="country" label="Country" placeholder="country" options={countries.map((c) => ({ value: c, label: c }))} />.
                {" "}We're at the <Pick name="companyStage" label="Company stage" placeholder="stage" options={companyStages} /> stage, working in{" "}
                <Pick name="sector" label="Sector" placeholder="sector" options={sectors.map((s) => ({ value: s, label: s }))} />, with a team of{" "}
                <Pick name="employeeCount" label="Team size (optional)" placeholder="size" options={teamSizes} />.
              </p>
              <Missing names={["companyName", "website", "country", "companyStage", "sector"]} />

              <Para name="useCase" lead="Here's how we'd use Senseible:" placeholder="The invoices, reports or buyer requests you want to handle first" min={20} max={500} rows={3} />
              <Para name="pitch" lead="And our 60-second pitch:" placeholder="The problem, why now, and what makes your approach different" min={50} max={1000} rows={5} />
              <Para name="carbonFocus" lead="On carbon specifically (optional):" placeholder="Any reduction, measurement or finance goal" rows={2} />

              <div className="lt-sign">
                <label htmlFor="grant-consent" className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Checkbox id="grant-consent" checked={consent} aria-invalid={!!errors.consent}
                    onCheckedChange={(v) => form.setValue("consent", v === true, { shouldValidate: true, shouldTouch: true })} className="mt-0.5" />
                  <span>
                    I agree that Senseible may store and use these details only to review this application and contact me about it, as set out in the{" "}
                    <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
                    <Link to="/legal/terms" className="text-primary hover:underline">Terms</Link>. I can withdraw consent at any time by writing to impact@senseible.earth.
                  </span>
                </label>
                {errors.consent && <p className="mt-2 text-sm text-destructive" role="alert">{errors.consent.message}</p>}
                <p className="lt-signoff">Warm regards,<span className="lt-signature">{applicantName.trim() || " "}</span></p>
                <Button type="submit" size="lg" className="mt-5 h-14 w-full rounded-full text-base" disabled={isSubmitting}>
                  {isSubmitting ? <span className="animate-pulse">Sending…</span> : <>Send application <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Senseible provides data infrastructure to support sustainable-finance applications; it does not itself approve, provide or disburse loans, grants or financing.
                </p>
              </div>
            </form>
            </FormProvider>
            <p className="mt-6 text-center text-sm text-muted-foreground">Our team will review your application and respond within 5 business days.</p>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="py-12 border-t border-border">
          <p className="container px-5 text-center text-muted-foreground text-sm">
            Building infrastructure for MSMEs across emerging markets
          </p>
        </section>

        <Footer />
        <StickyCta label="Start Application" onClick={scrollToForm} hideWhenVisible="application-form" />
      </div>
    </>
  );
};

export default Grants;
