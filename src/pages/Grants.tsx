import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/platform/Reveal";
import { StickyCta } from "@/components/lead/LeadKit";

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

  const useCase = form.watch("useCase") ?? "";
  const pitch = form.watch("pitch") ?? "";

  const sectionTitle = (n: string, label: string, hint: string) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4 mb-5">
      <h3 className="flex items-baseline gap-3 text-lg font-semibold">
        <span className="font-mono text-xs text-primary">{n}</span>{label}
      </h3>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );

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
        <section className="pt-28 pb-14 md:pt-36 md:pb-20">
          <div className="container max-w-5xl mx-auto px-5">
            <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
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

              {/* What happens next, so applying feels safe */}
              <ol className="relative space-y-6 border-l border-border pl-6" aria-label="What happens after you apply">
                {journey.map((j, i) => (
                  <li key={j.n} className="relative">
                    <span className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${i === 0 ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{j.n}</span>
                      <span className="font-medium">{j.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{j.desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 2. What you get: four facts, read in one glance */}
        <section className="border-y border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-5">
            <dl className="grid grid-cols-2 md:grid-cols-4">
              {benefits.map((b, i) => (
                <Reveal key={b.label} delay={i * 70} className={`py-8 md:py-10 ${i % 2 ? "pl-5 md:pl-6" : "pr-5 md:pr-6"} ${i > 0 ? "md:border-l md:border-border md:pl-6" : ""} ${i === 1 || i === 3 ? "border-l border-border" : ""} ${i > 1 ? "border-t border-border md:border-t-0" : ""}`}>
                  <dt className="sr-only">{b.label}</dt>
                  <dd>
                    <div className="font-mono text-3xl md:text-4xl leading-none text-foreground">{b.value}</div>
                    <div className="mt-3 font-medium">{b.label}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{b.desc}</div>
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* 3. Who should apply: a quick self-check */}
        <section className="py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-5">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Who Should Apply</h2>
                <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                  We prioritize high-intent founders solving real climate problems
                </p>
              </div>
              <ul className="border-t border-border">
                {audiences.map((a, i) => (
                  <li key={a.title} className="border-b border-border py-5">
                    <Reveal delay={i * 80} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-6">
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{a.desc}</p>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 4. The application: three short parts, with feedback as you type */}
        <section id="application-form" className="scroll-mt-20 py-16 md:py-24 bg-secondary/30 border-t border-border">
          <div className="container max-w-5xl mx-auto px-5">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Apply Now</h2>
                <p className="mt-3 text-muted-foreground">
                  Takes less than 5 minutes. No login required.
                </p>
                <ol className="mt-8 hidden space-y-3 text-sm lg:block">
                  {["Your Details", "Company Details", "Your Application"].map((l, i) => (
                    <li key={l} className="flex items-center gap-3 text-muted-foreground">
                      <span className="font-mono text-xs text-primary">0{i + 1}</span>{l}
                    </li>
                  ))}
                </ol>
                <p className="mt-8 hidden text-sm text-muted-foreground lg:block">Our team will review your application and respond within 5 business days.</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate>
                  {/* Personal Info */}
                  <div className="rounded-3xl bg-background border border-border p-5 md:p-7">
                    {sectionTitle("01", "Your Details", "3 fields")}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="applicantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 98765 43210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Company Info */}
                  <div className="rounded-3xl bg-background border border-border p-5 md:p-7 space-y-4">
                    {sectionTitle("02", "Company Details", "6 fields")}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your company" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yourcompany.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country}>{country}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyStage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Stage *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companyStages.map((stage) => (
                                  <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sector"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sector *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sector" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sectors.map((sector) => (
                                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="employeeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Size</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1-5">1-5</SelectItem>
                                <SelectItem value="6-20">6-20</SelectItem>
                                <SelectItem value="21-50">21-50</SelectItem>
                                <SelectItem value="51-200">51-200</SelectItem>
                                <SelectItem value="200+">200+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="rounded-3xl bg-background border border-border p-5 md:p-7 space-y-5">
                    {sectionTitle("03", "Your Application", "3 answers")}
                    <FormField
                      control={form.control}
                      name="useCase"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-baseline justify-between gap-3"><FormLabel>How will you use Senseible? *</FormLabel><Counter value={useCase} min={20} max={500} /></div>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your primary use case for the platform..."
                              className="min-h-[110px] resize-y" maxLength={500}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pitch"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-baseline justify-between gap-3"><FormLabel>Your 60-Second Pitch *</FormLabel><Counter value={pitch} min={50} max={1000} /></div>
                          <FormControl>
                            <Textarea 
                              placeholder="What problem are you solving, and why now? What makes your approach unique?"
                              className="min-h-[140px] resize-y" maxLength={1000}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carbonFocus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carbon / Climate Focus (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any specific carbon reduction, measurement, or finance goals?"
                              className="min-h-[90px] resize-y"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit */}
                  <div>
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 w-full rounded-full text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="animate-pulse">Submitting...</span>
                      ) : (
                        <>
                          Submit Application
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      By submitting, you agree to our{" "}
                      <Link to="/legal/terms" className="text-primary hover:underline">Terms</Link>
                      {" "}and{" "}
                      <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    </p>
                  </div>
                </form>
              </Form>
            </div>
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
