import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Mission from "./pages/Mission";
import About from "./pages/About";
import Principles from "./pages/Principles";
import CarbonCredits from "./pages/CarbonCredits";
import ClimateFinance from "./pages/ClimateFinance";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
          <link rel="canonical" href="https://senseible.ai" />
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/about" element={<About />} />
            <Route path="/principles" element={<Principles />} />
            <Route path="/carbon-credits" element={<CarbonCredits />} />
            <Route path="/climate-finance" element={<ClimateFinance />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
