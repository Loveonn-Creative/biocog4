import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { CarbonParticles } from "@/components/CarbonParticles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Leaf, Search, Shield, CheckCircle,
  MapPin, Calendar, ArrowRight, Verified,
  Building2, Zap, TreePine, Droplets
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

// Sample carbon credits data - in production this would come from Supabase
const sampleCredits = [
  {
    id: "1",
    projectName: "Solar Rooftop - Tamil Nadu MSME Cluster",
    location: "Chennai, India",
    type: "Renewable Energy",
    vintage: "2025",
    pricePerTonne: 850,
    availableTonnes: 1200,
    methodology: "CDM AMS-I.D",
    verified: true,
    verifier: "Verra VCS",
    sdgGoals: [7, 13, 8],
    description: "Aggregated rooftop solar installations across 45 small manufacturing units in Chennai.",
    cobenefits: ["Job creation", "Air quality improvement", "Energy independence"],
    icon: Zap
  },
  {
    id: "2",
    projectName: "Mangrove Restoration - Gujarat Coast",
    location: "Kutch, Gujarat",
    type: "Blue Carbon",
    vintage: "2024",
    pricePerTonne: 1200,
    availableTonnes: 500,
    methodology: "Verra VM0033",
    verified: true,
    verifier: "Gold Standard",
    sdgGoals: [14, 15, 13, 1],
    description: "Coastal mangrove restoration protecting fishing communities and sequestering carbon.",
    cobenefits: ["Coastal protection", "Biodiversity", "Livelihood support"],
    icon: Droplets
  },
  {
    id: "3",
    projectName: "Biochar from Rice Husk - Punjab",
    location: "Ludhiana, Punjab",
    type: "Biochar Sequestration",
    vintage: "2025",
    pricePerTonne: 950,
    availableTonnes: 800,
    methodology: "Puro.earth",
    verified: true,
    verifier: "Puro.earth",
    sdgGoals: [13, 12, 2],
    description: "Converting rice stubble into biochar, eliminating stubble burning and improving soil.",
    cobenefits: ["Reduced air pollution", "Soil improvement", "Farmer income"],
    icon: TreePine
  },
  {
    id: "4",
    projectName: "Energy Efficiency - Steel MSME",
    location: "Raigarh, Chhattisgarh",
    type: "Energy Efficiency",
    vintage: "2024",
    pricePerTonne: 750,
    availableTonnes: 2000,
    methodology: "CDM AMS-II.D",
    verified: true,
    verifier: "Verra VCS",
    sdgGoals: [9, 13, 12],
    description: "Waste heat recovery and furnace optimization in small-scale steel manufacturing.",
    cobenefits: ["Reduced energy costs", "Technology transfer", "Capacity building"],
    icon: Building2
  },
  {
    id: "5",
    projectName: "Agroforestry - Maharashtra",
    location: "Vidarbha, Maharashtra",
    type: "Nature-Based",
    vintage: "2023",
    pricePerTonne: 1100,
    availableTonnes: 650,
    methodology: "Gold Standard AR",
    verified: true,
    verifier: "Gold Standard",
    sdgGoals: [15, 13, 1, 2],
    description: "Farmer-led agroforestry integrating fruit trees with traditional crops.",
    cobenefits: ["Farmer income diversification", "Biodiversity", "Food security"],
    icon: TreePine
  }
];

const sectors = ["All Sectors", "Renewable Energy", "Blue Carbon", "Nature-Based", "Energy Efficiency", "Biochar Sequestration"];
const priceRanges = ["All Prices", "Under ₹800", "₹800 - ₹1000", "₹1000 - ₹1200", "Above ₹1200"];

const CarbonMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedPrice, setSelectedPrice] = useState("All Prices");

  const filteredCredits = useMemo(() => {
    return sampleCredits.filter(credit => {
      const matchesSearch = credit.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           credit.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           credit.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSector = selectedSector === "All Sectors" || credit.type === selectedSector;
      
      const matchesPrice = selectedPrice === "All Prices" ||
        (selectedPrice === "Under ₹800" && credit.pricePerTonne < 800) ||
        (selectedPrice === "₹800 - ₹1000" && credit.pricePerTonne >= 800 && credit.pricePerTonne <= 1000) ||
        (selectedPrice === "₹1000 - ₹1200" && credit.pricePerTonne > 1000 && credit.pricePerTonne <= 1200) ||
        (selectedPrice === "Above ₹1200" && credit.pricePerTonne > 1200);
      
      return matchesSearch && matchesSector && matchesPrice;
    });
  }, [searchQuery, selectedSector, selectedPrice]);

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <SEOHead 
        title="Carbon Marketplace — Senseible"
        description="Discover, evaluate and purchase verified carbon credits from Indian MSMEs. Net-zero aligned, UN SDG compliant, transparent pricing."
        keywords={["carbon marketplace", "carbon credits India", "buy carbon credits", "MSME carbon", "verified credits"]}
      />
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Verified & Net-Zero Aligned
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Carbon Credit Marketplace
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover verified carbon credits from Indian MSMEs. Every credit is traceable, 
            compliant with global standards, and aligned with UN Sustainable Development Goals.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border rounded-xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, locations, or types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredCredits.length}</span> verified credits
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Verified className="w-4 h-4 text-success" />
            All credits independently verified
          </div>
        </div>

        {/* Credits Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCredits.map((credit) => {
            const Icon = credit.icon;
            return (
              <Card key={credit.id} className="group hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {credit.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {credit.projectName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {credit.location}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        ₹{credit.pricePerTonne.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">per tCO₂e</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{credit.availableTonnes.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">tonnes available</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">{credit.verifier}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      <Calendar className="w-3 h-3 mr-1" />
                      {credit.vintage}
                    </Badge>
                  </div>

                  {/* SDG Goals */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">SDGs:</span>
                    {credit.sdgGoals.map(goal => (
                      <div key={goal} className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {goal}
                      </div>
                    ))}
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                        variant="outline"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-primary" />
                          {credit.projectName}
                        </DialogTitle>
                        <DialogDescription>
                          {credit.location} • {credit.type}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <p className="text-muted-foreground">{credit.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="text-xl font-semibold">₹{credit.pricePerTonne}/tCO₂e</p>
                          </div>
                          <div className="p-3 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Available</p>
                            <p className="text-xl font-semibold">{credit.availableTonnes.toLocaleString()} t</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Co-benefits</p>
                          <div className="flex flex-wrap gap-2">
                            {credit.cobenefits.map(benefit => (
                              <Badge key={benefit} variant="secondary">{benefit}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                          <Shield className="w-5 h-5 text-success" />
                          <div>
                            <p className="text-sm font-medium">Verified by {credit.verifier}</p>
                            <p className="text-xs text-muted-foreground">{credit.methodology}</p>
                          </div>
                        </div>

                        <Button className="w-full" asChild>
                          <Link to="/contact">
                            Express Interest
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground">
                          Seller details shared after mutual interest confirmation
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCredits.length === 0 && (
          <div className="text-center py-12">
            <Leaf className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No credits match your filters</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("");
              setSelectedSector("All Sectors");
              setSelectedPrice("All Prices");
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Trust Banner */}
        <div className="mt-12 p-6 bg-gradient-to-r from-primary/5 to-success/5 rounded-xl border">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Buyer Protection Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                All credits are verified against global standards. Seller MSME data remains confidential 
                until transaction agreement. Full traceability to source documentation.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CarbonMarketplace;
