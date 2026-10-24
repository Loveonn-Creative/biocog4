import { Suspense, type ReactNode } from "react";
import { lazyPage } from "@/lib/reliability/lazyPage";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";

// Eagerly load the homepage only; everything else is route-split.
import Index from "./pages/Index";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
// Loaded only on app pages, so public pages keep their small first download.
const AutoVerifier = lazyPage(() => import("./components/AutoVerifier"));
// App pages where pending records are verified in the background. /verify runs
// its own visible check, so it is not listed.
const AUTO_VERIFY_PATHS = new Set(["/", "/dashboard", "/history", "/reports", "/monetize", "/mrv-dashboard", "/intelligence"]);
function AutoVerifyGate() {
  const { pathname } = useLocation();
  if (!AUTO_VERIFY_PATHS.has(pathname)) return null;
  return <Suspense fallback={null}><AutoVerifier /></Suspense>;
}
// The "?" help button and side panel on app pages; its code loads only there.
const InAppHelp = lazyPage(() => import("./components/help/InAppHelp"));
const IN_APP_HELP_PATHS = new Set(["/dashboard", "/history", "/verify", "/reports", "/mrv-dashboard", "/monetize", "/profile", "/settings", "/subscription", "/billing", "/team"]);
function InAppHelpGate() {
  const { pathname } = useLocation();
  if (!IN_APP_HELP_PATHS.has(pathname)) return null;
  return <Suspense fallback={null}><InAppHelp /></Suspense>;
}
import { RequireAuth } from "./components/RequireAuth";
import { MACHINERY_BETA } from "./lib/betaFlags";
import { RouteSEO } from "./components/RouteSEO";
import { TranslationScope } from "./components/TranslationScope";
import { STATIC_PAGE_META } from "@/lib/seo/seoMeta";
import { serviceNav } from "@/data/services/nav";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { installChunkRecovery } from "@/lib/reliability/chunkRecovery";
import { installNewBuildCheck } from "@/lib/reliability/newBuild";
import { NewBuildReload } from "./components/NewBuildReload";
import { RoutePrefetcher } from "./components/RoutePrefetcher";
import { ScrollManager } from "./components/ScrollManager";
import { AuthLinkRouter } from "./components/AuthLinkRouter";

// Perf: Auth was eager; lazy keeps it (and its form deps) out of the homepage bundle.
const Auth = lazyPage(() => import("./pages/Auth"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword"));
// Perf: the Radix toast viewport is not needed for first paint, so it loads right
// after it. Toast state lives in hooks/use-toast (module memory), so toasts fired
// before this mounts are still shown once it does.
const Toaster = lazyPage(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const GuestImportPrompt = lazyPage(() => import("@/components/GuestImportPrompt"));

// Lazy load other pages for performance
const Mission = lazyPage(() => import("./pages/Mission"));
const EmissionFactors = lazyPage(() => import("./pages/EmissionFactors"));
const Templates = lazyPage(() => import("./pages/Templates"));
const CbamCost = lazyPage(() => import("./pages/CbamCost"));
const About = lazyPage(() => import("./pages/About"));
const Principles = lazyPage(() => import("./pages/Principles"));
const CarbonCredits = lazyPage(() => import("./pages/CarbonCredits"));
const CarbonCreditsIndia = lazyPage(() => import("./pages/CarbonCreditsIndia"));
const SoftwareChooser = lazyPage(() => import("./pages/SoftwareChooser"));
const ClimateFinance = lazyPage(() => import("./pages/ClimateFinance"));
const GreenLoan = lazyPage(() => import("./pages/GreenLoan"));
const GreenLoanCheck = lazyPage(() => import("./pages/GreenLoanCheck"));
const WhitePaper = lazyPage(() => import("./pages/WhitePaper"));
const IndiaClimateData = lazyPage(() => import("./pages/IndiaClimateData"));
const Help = lazyPage(() => import("./pages/Help"));
const EsgReportSample = lazyPage(() => import("./pages/lead/EsgReportSample"));
const CaseStudies = lazyPage(() => import("./pages/stories/CaseStudies"));
const CaseStudy = lazyPage(() => import("./pages/stories/CaseStudy"));
const ShareStory = lazyPage(() => import("./pages/stories/ShareStory"));
const WithdrawStory = lazyPage(() => import("./pages/stories/WithdrawStory"));
const StoryReview = lazyPage(() => import("./pages/stories/StoryReview"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const History = lazyPage(() => import("./pages/History"));
const Verify = lazyPage(() => import("./pages/Verify"));
const Monetize = lazyPage(() => import("./pages/Monetize"));
const SolarSignal = lazyPage(() => import("./pages/SolarSignal"));
const MachineryBeta = lazyPage(() => import("./pages/MachineryBeta"));
const ReductionSignal = lazyPage(() => import("./pages/ReductionSignal"));
const Reports = lazyPage(() => import("./pages/Reports"));
const MRVDashboard = lazyPage(() => import("./pages/MRVDashboard"));
const PartnerDashboard = lazyPage(() => import("./pages/PartnerDashboard"));
const Settings = lazyPage(() => import("./pages/Settings"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
const Intelligence = lazyPage(() => import("./pages/Intelligence"));
const Legal = lazyPage(() => import("./pages/Legal"));
const Contact = lazyPage(() => import("./pages/Contact"));
const ClimateStack = lazyPage(() => import("./pages/ClimateStack"));
const CMSArticle = lazyPage(() => import("./pages/CMSArticle"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const ServicePage = lazyPage(() => import("./pages/ServicePage"));
const SupplierEvidence = lazyPage(() => import("./pages/lead/SupplierEvidence"));
const Answers = lazyPage(() => import("./pages/Answers"));
const MsmeCarbonNumber = lazyPage(() => import("./pages/lead/MsmeCarbonNumber"));
const GreenLoanLanding = lazyPage(() => import("./pages/lead/ads/GreenLoanLanding"));
const SupplierLanding = lazyPage(() => import("./pages/lead/ads/SupplierLanding"));
const Profile = lazyPage(() => import("./pages/Profile"));
const PartnerProfile = lazyPage(() => import("./pages/PartnerProfile"));
const Subscription = lazyPage(() => import("./pages/Subscription"));
const Industries = lazyPage(() => import("./pages/Industries"));
const PaymentSuccess = lazyPage(() => import("./pages/PaymentSuccess"));
const CMSAdmin = lazyPage(() => import("./pages/CMSAdmin"));
const Billing = lazyPage(() => import("./pages/Billing"));
const Team = lazyPage(() => import("./pages/Team"));
const Partners = lazyPage(() => import("./pages/Partners"));
const Admin = lazyPage(() => import("./pages/Admin"));
const AcceptInvite = lazyPage(() => import("./pages/AcceptInvite"));
const PartnerMarketplace = lazyPage(() => import("./pages/PartnerMarketplace"));
const PartnerReports = lazyPage(() => import("./pages/PartnerReports"));
const CompetitorComparison = lazyPage(() => import("./pages/CompetitorComparison"));
const Grants = lazyPage(() => import("./pages/Grants"));
const DecarbonizeIndia = lazyPage(() => import("./pages/DecarbonizeIndia"));
const CbamIndia = lazyPage(() => import("./pages/CbamIndia"));
const CBAMCalculator = lazyPage(() => import("./pages/CBAMCalculator"));
const NetZero = lazyPage(() => import("./pages/NetZero"));
const Solutions = lazyPage(() => import("./pages/Solutions"));
const Trust = lazyPage(() => import("./pages/Trust"));
const Platform = lazyPage(() => import("./pages/Platform"));
const Careers = lazyPage(() => import("./pages/Careers"));
const Enterprise = lazyPage(() => import("./pages/Enterprise"));
const CalculatorsHub = lazyPage(() => import("./pages/calculators/CalculatorsHub"));
const CalculatorHistory = lazyPage(() => import("./pages/calculators/CalculatorHistory"));
const PCFCalculatorPage = lazyPage(() => import("./pages/calculators/PCFCalculator"));
const SupplierRiskCalculator = lazyPage(() => import("./pages/calculators/SupplierRiskCalculator"));
const EnergyTransitionCalculator = lazyPage(() => import("./pages/calculators/EnergyTransitionCalculator"));
const LogisticsCalculator = lazyPage(() => import("./pages/calculators/LogisticsCalculator"));
const CarbonPricingCalculator = lazyPage(() => import("./pages/calculators/CarbonPricingCalculator"));
const CloudEmissionsCalculator = lazyPage(() => import("./pages/calculators/CloudEmissionsCalculator"));
const ElectricityBillCarbon = lazyPage(() => import("./pages/calculators/ElectricityBillCarbon"));
const FuelCarbon = lazyPage(() => import("./pages/calculators/FuelCarbon"));
const DeCbamKosten = lazyPage(() => import("./pages/de/CbamKosten"));
const DeCbamRechner = lazyPage(() => import("./pages/de/CbamRechner"));
const DeCbamLieferanten = lazyPage(() => import("./pages/de/CbamLieferanten"));
const CbamSuite = lazyPage(() => import("./pages/CbamSuite"));
const CbamSupplierPack = lazyPage(() => import("./pages/CbamSupplierPack"));
const AnswersHi = lazyPage(() => import("./pages/AnswersHi"));

// Shown only on a first visit to a page whose code is still loading (in-app
// navigation keeps the current page on screen instead, see BrowserRouter).
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary reveal-after-delay" />
  </div>
);

installChunkRecovery();
installNewBuildCheck();


/** Error boundary that resets on navigation. */
const RoutedBoundary = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <AppErrorBoundary resetKey={pathname}>{children}</AppErrorBoundary>;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <TooltipProvider>
        <Helmet>
          <title>{STATIC_PAGE_META["/"].title}</title>
          <meta name="description" content={STATIC_PAGE_META["/"].description} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Senseible" />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
        <Suspense fallback={null}>
          <Toaster />
          <GuestImportPrompt />
        </Suspense>
        <Sonner />
        {/* v7_startTransition: opening a page whose code is not loaded yet keeps
            the current page on screen until it is ready, instead of a blank spinner. */}
        <BrowserRouter future={{ v7_startTransition: true }}>
          <AuthLinkRouter />
          <RoutePrefetcher />
          <ScrollManager />
          <AnalyticsTracker />
          <AutoVerifyGate />
          <InAppHelpGate />
          <NewBuildReload />
          <RouteSEO />
          <TranslationScope />
          <RoutedBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/answers" element={<Answers />} />
              <Route path="/answers/:slug" element={<Answers />} />
              <Route path="/hi/answers/:slug" element={<AnswersHi />} />
              <Route path="/scope-3-supplier-evidence" element={<SupplierEvidence />} />
              <Route path="/msme-carbon-number" element={<MsmeCarbonNumber />} />
              {/* Ad landing pages (A/B colour tests), noindex */}
              <Route path="/go/green-loan-a" element={<GreenLoanLanding variant="a" />} />
              <Route path="/go/green-loan-b" element={<GreenLoanLanding variant="b" />} />
              <Route path="/go/suppliers-a" element={<SupplierLanding variant="a" />} />
              <Route path="/go/suppliers-b" element={<SupplierLanding variant="b" />} />
              {serviceNav.map(sp => <Route key={sp.slug} path={`/${sp.slug}`} element={<ServicePage slug={sp.slug} />} />)}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/monetize" element={<Monetize />} />
              <Route path="/solar-signal" element={<SolarSignal />} />
              {MACHINERY_BETA && <Route path="/beta/machinery" element={<RequireAuth><MachineryBeta /></RequireAuth>} />}
              <Route path="/reduction-signal" element={<ReductionSignal />} />
              <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
              <Route path="/mrv-dashboard" element={<RequireAuth><MRVDashboard /></RequireAuth>} />
              <Route path="/partner" element={<RequireAuth><PartnerDashboard /></RequireAuth>} />
              <Route path="/partner-dashboard" element={<RequireAuth><PartnerDashboard /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/partner-profile" element={<RequireAuth><PartnerProfile /></RequireAuth>} />
              <Route path="/subscription" element={<RequireAuth><Subscription /></RequireAuth>} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/about" element={<About />} />
              <Route path="/principles" element={<Principles />} />
              <Route path="/carbon-credits" element={<CarbonCredits />} />
              <Route path="/carbon-credits-india" element={<CarbonCreditsIndia />} />
              <Route path="/carbon-accounting-software-india" element={<SoftwareChooser />} />
              <Route path="/climate-finance" element={<ClimateFinance />} />
              <Route path="/green-loan" element={<GreenLoan />} />
              <Route path="/green-loan-check" element={<GreenLoanCheck />} />
              <Route path="/white-paper" element={<WhitePaper />} />
              <Route path="/india-climate-data" element={<IndiaClimateData />} />
              <Route path="/help" element={<Help />} />
              <Route path="/help/:slug" element={<Help />} />
              <Route path="/esg-report-sample" element={<EsgReportSample />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/case-studies/share" element={<ShareStory />} />
              <Route path="/case-studies/withdraw" element={<WithdrawStory />} />
              <Route path="/case-studies/:slug" element={<CaseStudy />} />
              <Route path="/admin/stories" element={<StoryReview />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/legal/:slug" element={<Legal />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/climate-intelligence" element={<ClimateStack />} />
              <Route path="/climate-intelligence/:slug" element={<CMSArticle />} />
              <Route path="/industries" element={<Industries />} />
              <Route path="/industries/:industry" element={<Industries />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/marketplace" element={<PartnerMarketplace />} />
              <Route path="/cms-admin" element={<CMSAdmin />} />
              <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
              <Route path="/team" element={<RequireAuth><Team /></RequireAuth>} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/partner-marketplace" element={<PartnerMarketplace />} />
              <Route path="/partner-reports" element={<RequireAuth><PartnerReports /></RequireAuth>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/grants" element={<Grants />} />
              <Route path="/decarbonize-india" element={<DecarbonizeIndia />} />
              <Route path="/cbam" element={<CbamIndia />} />
              <Route path="/cbam-calculator" element={<CBAMCalculator />} />
              <Route path="/emission-factors" element={<EmissionFactors />} />
              <Route path="/emission-factors/:slug" element={<EmissionFactors />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/templates/:slug" element={<Templates />} />
              <Route path="/cbam-suite" element={<CbamSuite />} />
              <Route path="/cbam-suite/supplier-pack" element={<CbamSupplierPack />} />
              <Route path="/cbam-cost" element={<CbamCost />} />
              <Route path="/cbam-cost/:sector" element={<CbamCost />} />
              <Route path="/de/cbam-kosten" element={<DeCbamKosten />} />
              <Route path="/de/cbam-rechner" element={<DeCbamRechner />} />
              <Route path="/de/cbam-indische-lieferanten" element={<DeCbamLieferanten />} />
              <Route path="/net-zero" element={<NetZero />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/platform" element={<Platform />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/enterprise" element={<Enterprise />} />
              <Route path="/vs/:competitor" element={<CompetitorComparison />} />
              <Route path="/solutions/:useCase" element={<Solutions />} />
              <Route path="/calculators" element={<CalculatorsHub />} />
              <Route path="/calculators/history" element={<CalculatorHistory />} />
              <Route path="/calculators/product-carbon-footprint" element={<PCFCalculatorPage />} />
              <Route path="/calculators/supplier-emissions-risk" element={<SupplierRiskCalculator />} />
              <Route path="/calculators/energy-transition-savings" element={<EnergyTransitionCalculator />} />
              <Route path="/calculators/logistics-emissions" element={<LogisticsCalculator />} />
              <Route path="/calculators/carbon-pricing-impact" element={<CarbonPricingCalculator />} />
              <Route path="/calculators/cloud-data-centre-emissions" element={<CloudEmissionsCalculator />} />
              <Route path="/calculators/electricity-bill-carbon" element={<ElectricityBillCarbon />} />
              <Route path="/calculators/fuel-carbon" element={<FuelCarbon />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </RoutedBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
