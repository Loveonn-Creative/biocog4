import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Rocket, Globe, Zap, BadgeCheck, ArrowRight, Sparkles, TrendingUp, Building2, Leaf } from "lucide-react";
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
  { icon: Zap, value: "$13,000", label: "Platform Access", desc: "12-month premium tier" },
  { icon: TrendingUp, value: "$150,000", label: "Cash Benefits", desc: "Matched funding pool" },
  { icon: Globe, value: "100+", label: "Countries", desc: "Global cohort access" },
  { icon: BadgeCheck, value: "1:1", label: "Advisory", desc: "Climate finance experts" },
];

const Grants = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<GrantFormData>({
    resolver: zodResolver(grantSchema),
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
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead
          title="Application Submitted — Senseible Accelerator"
          description="Thank you for applying to the Senseible Accelerator Program."
        />
        <div className="min-h-screen bg-background">
          <MinimalNav />
          <main className="pt-24 pb-16 px-4">
            <motion.div 
              className="max-w-2xl mx-auto text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <BadgeCheck className="w-10 h-10 text-primary" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Application Received</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Our team will review your application and respond within 5 business days. 
                Check your inbox for a confirmation email.
              </p>
              <Button asChild size="lg">
                <a href="/dashboard">Go to Dashboard</a>
              </Button>
            </motion.div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
        <SEOHead
          title="Accelerator Grants — AI Startups & MSMEs | Senseible"
          description="Unlock $13,000 in platform access and up to $150,000 in cash benefits. Priority for India and emerging markets. Apply now for climate-tech acceleration."
          keywords={["AI grants", "startup accelerator", "MSME funding", "India startup grants", "climate tech funding", "emerging market accelerator", "carbon credits startup"]}
        />
      <div className="min-h-screen bg-background">
        <MinimalNav />
        
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-50" />
          
          <div className="container relative z-10 px-4 md:px-6">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {/* Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                variants={fadeInUp}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Applications Open — 2025 Cohort</span>
              </motion.div>
              
              {/* Headline */}
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                variants={fadeInUp}
              >
                Accelerate Your
                <span className="block text-primary">Climate Impact</span>
              </motion.h1>
              
              <motion.p 
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
                variants={fadeInUp}
              >
                Unlock platform access worth $13,000 and cash benefits up to $150,000. 
                Built for AI startups and MSMEs in India and emerging markets.
              </motion.p>

              {/* CTA */}
              <motion.div variants={fadeInUp}>
                <Button 
                  size="lg" 
                  className="group text-base px-8 py-6"
                  onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Start Application
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container px-4 md:px-6">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  className="relative group p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                  variants={fadeInUp}
                  whileHover={{ y: -4 }}
                >
                  <benefit.icon className="w-8 h-8 text-primary mb-4" />
                  <div className="text-2xl md:text-3xl font-bold mb-1">{benefit.value}</div>
                  <div className="font-medium text-foreground">{benefit.label}</div>
                  <div className="text-sm text-muted-foreground">{benefit.desc}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Eligibility Section */}
        <section className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Should Apply</h2>
                <p className="text-muted-foreground text-lg">
                  We prioritize high-intent founders solving real climate problems
                </p>
              </motion.div>

              <motion.div 
                className="grid md:grid-cols-3 gap-6"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                {[
                  { 
                    icon: Rocket, 
                    title: "AI & Climate Startups", 
                    desc: "Building technology for carbon measurement, reduction, or finance" 
                  },
                  { 
                    icon: Building2, 
                    title: "MSMEs", 
                    desc: "Micro, small, and medium enterprises ready to quantify and monetize carbon impact" 
                  },
                  { 
                    icon: Leaf, 
                    title: "Emerging Markets", 
                    desc: "Priority for India, Southeast Asia, Africa, and Latin America" 
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="p-6 rounded-xl bg-muted/50 border border-border"
                    variants={fadeInUp}
                  >
                    <item.icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="application-form" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <motion.div 
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Apply Now</h2>
                <p className="text-muted-foreground">
                  Takes less than 5 minutes. No login required.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Info */}
                  <div className="p-6 rounded-xl bg-background border border-border space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">1</span>
                      Your Details
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
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
                  <div className="p-6 rounded-xl bg-background border border-border space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">2</span>
                      Company Details
                    </h3>

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
                  <div className="p-6 rounded-xl bg-background border border-border space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">3</span>
                      Your Application
                    </h3>

                    <FormField
                      control={form.control}
                      name="useCase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How will you use Senseible? *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your primary use case for the platform..."
                              className="min-h-[100px] resize-none"
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
                          <FormLabel>Your 60-Second Pitch *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What problem are you solving, and why now? What makes your approach unique?"
                              className="min-h-[120px] resize-none"
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
                              className="min-h-[80px] resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full text-base py-6"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-pulse">Submitting...</span>
                        </>
                      ) : (
                        <>
                          Submit Application
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <p className="text-center text-sm text-muted-foreground">
                    By submitting, you agree to our{" "}
                    <a href="/legal/terms" className="text-primary hover:underline">Terms</a>
                    {" "}and{" "}
                    <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                  </p>
                </form>
              </Form>
            </motion.div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="py-16 md:py-20 border-t border-border">
          <div className="container px-4 md:px-6">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <p className="text-muted-foreground mb-8">
                Inspired by accelerator programs from
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
                {["Google", "Microsoft", "NVIDIA", "Cloudflare"].map((name) => (
                  <span key={name} className="text-lg font-semibold text-muted-foreground">
                    {name}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Grants;
