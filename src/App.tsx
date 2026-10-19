import { lazy, Suspense, type ReactNode } from "react";
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
const AutoVerifier = lazy(() => import("./components/AutoVerifier"));
// App pages where pending records are verified in the background. /verify runs
// its own visible check, so it is not listed.
const AUTO_VERIFY_PATHS = new Set(["/", "/dashboard", "/history", "/reports", "/monetize", "/mrv-dashboard", "/intelligence"]);
function AutoVerifyGate() {
  const { pathname } = useLocation();
  if (!AUTO_VERIFY_PATHS.has(pathname)) return null;
  return <Suspense fallback={null}><AutoVerifier /></Suspense>;
}
// The "?" help button and side panel on app pages; its code loads only there.
const InAppHelp = lazy(() => import("./components/help/InAppHelp"));
const IN_APP_HELP_PATHS = new Set(["/dashboard", "/history", "/verify", "/reports", "/mrv-dashboard", "/monetize", "/profile", "/settings", "/subscription", "/billing", "/team"]);
function InAppHelpGate() {
  const { pathname } = useLocation();
  if (!IN_APP_HELP_PATHS.has(pathname)) return null;
  return <Suspense fallback={null}><InAppHelp /></Suspense>;
}
import { RequireAuth } from "./components/RequireAuth";
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
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// Perf: the Radix toast viewport is not needed for first paint, so it loads right
// after it. Toast state lives in hooks/use-toast (module memory), so toasts fired
// before this mounts are still shown once it does.
const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const GuestImportPrompt = lazy(() => import("@/components/GuestImportPrompt"));

// Lazy load other pages for performance
const Mission = lazy(() => import("./pages/Mission"));
const EmissionFactors = lazy(() => import("./pages/EmissionFactors"));
const CbamCost = lazy(() => import("./pages/CbamCost"));
const About = lazy(() => import("./pages/About"));
const Principles = lazy(() => import("./pages/Principles"));
const CarbonCredits = lazy(() => import("./pages/CarbonCredits"));
const ClimateFinance = lazy(() => import("./pages/ClimateFinance"));
const GreenLoan = lazy(() => import("./pages/GreenLoan"));
const GreenLoanCheck = lazy(() => import("./pages/GreenLoanCheck"));
const WhitePaper = lazy(() => import("./pages/WhitePaper"));
const Help = lazy(() => import("./pages/Help"));
const EsgReportSample = lazy(() => import("./pages/lead/EsgReportSample"));
const CaseStudies = lazy(() => import("./pages/stories/CaseStudies"));
const CaseStudy = lazy(() => import("./pages/stories/CaseStudy"));
const ShareStory = lazy(() => import("./pages/stories/ShareStory"));
const WithdrawStory = lazy(() => import("./pages/stories/WithdrawStory"));
const StoryReview = lazy(() => import("./pages/stories/StoryReview"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const Verify = lazy(() => import("./pages/Verify"));
const Monetize = lazy(() => import("./pages/Monetize"));
const SolarSignal = lazy(() => import("./pages/SolarSignal"));
const ReductionSignal = lazy(() => import("./pages/ReductionSignal"));
const Reports = lazy(() => import("./pages/Reports"));
const MRVDashboard = lazy(() => import("./pages/MRVDashboard"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const Legal = lazy(() => import("./pages/Legal"));
const Contact = lazy(() => import("./pages/Contact"));
const ClimateStack = lazy(() => import("./pages/ClimateStack"));
const CMSArticle = lazy(() => import("./pages/CMSArticle"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const SupplierEvidence = lazy(() => import("./pages/lead/SupplierEvidence"));
const Answers = lazy(() => import("./pages/Answers"));
const MsmeCarbonNumber = lazy(() => import("./pages/lead/MsmeCarbonNumber"));
const Profile = lazy(() => import("./pages/Profile"));
const PartnerProfile = lazy(() => import("./pages/PartnerProfile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Industries = lazy(() => import("./pages/Industries"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const CMSAdmin = lazy(() => import("./pages/CMSAdmin"));
const Billing = lazy(() => import("./pages/Billing"));
const Team = lazy(() => import("./pages/Team"));
const Partners = lazy(() => import("./pages/Partners"));
const Admin = lazy(() => import("./pages/Admin"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const PartnerMarketplace = lazy(() => import("./pages/PartnerMarketplace"));
const PartnerReports = lazy(() => import("./pages/PartnerReports"));
const CompetitorComparison = lazy(() => import("./pages/CompetitorComparison"));
const Grants = lazy(() => import("./pages/Grants"));
const DecarbonizeIndia = lazy(() => import("./pages/DecarbonizeIndia"));
const CBAMCalculator = lazy(() => import("./pages/CBAMCalculator"));
const NetZero = lazy(() => import("./pages/NetZero"));
const Solutions = lazy(() => import("./pages/Solutions"));
const Trust = lazy(() => import("./pages/Trust"));
const Platform = lazy(() => import("./pages/Platform"));
const Careers = lazy(() => import("./pages/Careers"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const CalculatorsHub = lazy(() => import("./pages/calculators/CalculatorsHub"));
const CalculatorHistory = lazy(() => import("./pages/calculators/CalculatorHistory"));
const PCFCalculatorPage = lazy(() => import("./pages/calculators/PCFCalculator"));
const SupplierRiskCalculator = lazy(() => import("./pages/calculators/SupplierRiskCalculator"));
const EnergyTransitionCalculator = lazy(() => import("./pages/calculators/EnergyTransitionCalculator"));
const LogisticsCalculator = lazy(() => import("./pages/calculators/LogisticsCalculator"));
const CarbonPricingCalculator = lazy(() => import("./pages/calculators/CarbonPricingCalculator"));
const CloudEmissionsCalculator = lazy(() => import("./pages/calculators/CloudEmissionsCalculator"));

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
              <Route path="/scope-3-supplier-evidence" element={<SupplierEvidence />} />
              <Route path="/msme-carbon-number" element={<MsmeCarbonNumber />} />
              {serviceNav.map(sp => <Route key={sp.slug} path={`/${sp.slug}`} element={<ServicePage slug={sp.slug} />} />)}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/monetize" element={<Monetize />} />
              <Route path="/solar-signal" element={<SolarSignal />} />
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
              <Route path="/climate-finance" element={<ClimateFinance />} />
              <Route path="/green-loan" element={<GreenLoan />} />
              <Route path="/green-loan-check" element={<GreenLoanCheck />} />
              <Route path="/white-paper" element={<WhitePaper />} />
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
              <Route path="/cbam-calculator" element={<CBAMCalculator />} />
              <Route path="/emission-factors" element={<EmissionFactors />} />
              <Route path="/emission-factors/:slug" element={<EmissionFactors />} />
              <Route path="/cbam-cost" element={<CbamCost />} />
              <Route path="/cbam-cost/:sector" element={<CbamCost />} />
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
