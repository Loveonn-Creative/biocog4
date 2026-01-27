import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";

// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load other pages for performance
const Mission = lazy(() => import("./pages/Mission"));
const About = lazy(() => import("./pages/About"));
const Principles = lazy(() => import("./pages/Principles"));
const CarbonCredits = lazy(() => import("./pages/CarbonCredits"));
const ClimateFinance = lazy(() => import("./pages/ClimateFinance"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const Verify = lazy(() => import("./pages/Verify"));
const Monetize = lazy(() => import("./pages/Monetize"));
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
const Profile = lazy(() => import("./pages/Profile"));
const PartnerProfile = lazy(() => import("./pages/PartnerProfile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Industries = lazy(() => import("./pages/Industries"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const CarbonMarketplace = lazy(() => import("./pages/CarbonMarketplace"));
const CMSAdmin = lazy(() => import("./pages/CMSAdmin"));
const Billing = lazy(() => import("./pages/Billing"));
const Team = lazy(() => import("./pages/Team"));
const Partners = lazy(() => import("./pages/Partners"));
const Admin = lazy(() => import("./pages/Admin"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const PartnerMarketplace = lazy(() => import("./pages/PartnerMarketplace"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Helmet>
          <title>Senseible — Turn Carbon Documents into Revenue</title>
          <meta name="description" content="Infrastructure-grade carbon MRV for 400 million MSMEs. Turn invoices into revenue or compliance in under 47 seconds. Starting with India." />
          <meta name="keywords" content="carbon credits, MSME, climate finance, carbon accounting, India, sustainability, green loans, CBAM, carbon certification" />
          <meta property="og:title" content="Senseible — Turn Carbon Documents into Revenue" />
          <meta property="og:description" content="Infrastructure-grade carbon MRV for 400 million MSMEs across emerging markets." />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Senseible — Carbon to Revenue in Seconds" />
          <meta name="twitter:description" content="Turn your invoices into carbon credits and climate finance." />
          <link rel="canonical" href="https://senseible.earth" />
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/monetize" element={<Monetize />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/mrv-dashboard" element={<MRVDashboard />} />
              <Route path="/partner" element={<PartnerDashboard />} />
              <Route path="/partner-dashboard" element={<PartnerDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/partner-profile" element={<PartnerProfile />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/about" element={<About />} />
              <Route path="/principles" element={<Principles />} />
              <Route path="/carbon-credits" element={<CarbonCredits />} />
              <Route path="/climate-finance" element={<ClimateFinance />} />
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
              <Route path="/billing" element={<Billing />} />
              <Route path="/team" element={<Team />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/partner-marketplace" element={<PartnerMarketplace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
