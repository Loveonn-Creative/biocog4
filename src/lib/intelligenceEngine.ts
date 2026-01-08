// Personalized Intelligence Engine
// Generates data-driven operational insights replacing generic AI recommendations

export interface IntelligenceRecommendation {
  id: string;
  type: 'operational' | 'financial' | 'compliance' | 'technology';
  priority: 'high' | 'medium' | 'low';
  title: string;
  insight: string;
  action: string;
  impact: {
    co2ReductionKg: number;
    costSavingsINR: number;
    paybackMonths: number;
  };
  category: string;
  icon: string;
}

export interface EmissionData {
  category: string;
  scope: number;
  co2_kg: number;
  activity_data?: number | null;
  activity_unit?: string | null;
  emission_factor?: number | null;
}

export interface EmissionSummary {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

// Industry benchmarks (kgCO₂e per ₹1000 revenue)
const INDUSTRY_BENCHMARKS: Record<string, number> = {
  manufacturing: 2.8,
  textile: 3.2,
  food_processing: 2.1,
  chemicals: 4.5,
  logistics: 3.8,
  services: 0.8,
  retail: 1.2,
  construction: 4.0,
  default: 2.0,
};

// Intervention templates with ROI data
const INTERVENTIONS = {
  solar_rooftop: {
    type: 'technology' as const,
    title: 'Rooftop Solar Installation',
    reductionFactor: 0.6, // 60% of Scope 2
    costPerKW: 45000, // ₹45,000/kW
    savingsPerKWH: 7, // ₹7/kWh saved
    paybackYears: 4,
    applicableTo: 'scope2',
  },
  led_upgrade: {
    type: 'operational' as const,
    title: 'LED Lighting Upgrade',
    reductionFactor: 0.15, // 15% of electricity
    investmentFactor: 500, // ₹500 per kgCO₂e reduced
    paybackMonths: 18,
    applicableTo: 'scope2',
  },
  fleet_cng: {
    type: 'operational' as const,
    title: 'Fleet CNG Conversion',
    reductionFactor: 0.25, // 25% reduction in fuel emissions
    costPerVehicle: 85000,
    paybackMonths: 24,
    applicableTo: 'scope1',
  },
  energy_audit: {
    type: 'compliance' as const,
    title: 'Professional Energy Audit',
    reductionFactor: 0.12, // 12% potential savings identified
    fixedCost: 25000,
    paybackMonths: 6,
    applicableTo: 'all',
  },
  waste_recycling: {
    type: 'operational' as const,
    title: 'Certified Waste Recycling',
    reductionFactor: 0.08, // 8% of total
    creditValue: 750, // ₹750/tCO₂e in credits
    paybackMonths: 3,
    applicableTo: 'scope3',
  },
  green_procurement: {
    type: 'financial' as const,
    title: 'Green Supplier Program',
    reductionFactor: 0.1, // 10% of Scope 3
    implementationCost: 15000,
    paybackMonths: 12,
    applicableTo: 'scope3',
  },
  iot_monitoring: {
    type: 'technology' as const,
    title: 'IoT Energy Monitoring',
    reductionFactor: 0.08, // 8% savings through visibility
    monthlyFee: 2500,
    paybackMonths: 8,
    applicableTo: 'all',
  },
};

function analyzeEmissionHotspots(emissions: EmissionData[], summary: EmissionSummary): { 
  topCategory: string; 
  topCategoryPct: number;
  dominantScope: number;
  categoryBreakdown: Record<string, number>;
} {
  const categoryTotals: Record<string, number> = {};
  
  emissions.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.co2_kg;
  });
  
  let topCategory = 'general';
  let topCategoryValue = 0;
  
  Object.entries(categoryTotals).forEach(([cat, val]) => {
    if (val > topCategoryValue) {
      topCategory = cat;
      topCategoryValue = val;
    }
  });
  
  const dominantScope = summary.scope1 >= summary.scope2 && summary.scope1 >= summary.scope3 
    ? 1 
    : summary.scope2 >= summary.scope3 
      ? 2 
      : 3;
  
  return {
    topCategory,
    topCategoryPct: summary.total > 0 ? Math.round((topCategoryValue / summary.total) * 100) : 0,
    dominantScope,
    categoryBreakdown: categoryTotals,
  };
}

export function generateIntelligentRecommendations(
  emissions: EmissionData[],
  summary: EmissionSummary,
  sector?: string
): IntelligenceRecommendation[] {
  if (summary.total === 0 || emissions.length === 0) {
    return [];
  }
  
  const recommendations: IntelligenceRecommendation[] = [];
  const hotspots = analyzeEmissionHotspots(emissions, summary);
  const benchmark = INDUSTRY_BENCHMARKS[sector || 'default'] || INDUSTRY_BENCHMARKS.default;
  
  // Priority 1: Address dominant scope
  if (summary.scope2 > summary.total * 0.3) {
    // Scope 2 dominant - recommend solar
    const solarReduction = summary.scope2 * INTERVENTIONS.solar_rooftop.reductionFactor;
    const estimatedKW = Math.ceil(solarReduction / 100); // Rough kW needed
    const investment = estimatedKW * INTERVENTIONS.solar_rooftop.costPerKW;
    const annualSavings = estimatedKW * 1500 * INTERVENTIONS.solar_rooftop.savingsPerKWH; // 1500 units/kW/year
    
    recommendations.push({
      id: 'solar_priority',
      type: 'technology',
      priority: 'high',
      title: 'Install Rooftop Solar',
      insight: `Your Scope 2 emissions (${Math.round(summary.scope2)}kg) represent ${Math.round((summary.scope2/summary.total)*100)}% of total footprint - grid electricity is your largest emission source.`,
      action: `Install ${estimatedKW}kW rooftop solar system to reduce Scope 2 by 60%. Apply for PM-KUSUM or state subsidy (up to 40% off).`,
      impact: {
        co2ReductionKg: Math.round(solarReduction),
        costSavingsINR: Math.round(annualSavings),
        paybackMonths: Math.round((investment * 0.6) / (annualSavings / 12)), // After 40% subsidy
      },
      category: 'electricity',
      icon: 'Sun',
    });
  }
  
  if (summary.scope1 > summary.total * 0.25) {
    // Scope 1 dominant - likely fuel/diesel
    const fuelEmissions = emissions.filter(e => 
      e.category.toLowerCase().includes('diesel') || 
      e.category.toLowerCase().includes('fuel') ||
      e.category.toLowerCase().includes('petrol') ||
      e.scope === 1
    );
    
    const fuelTotal = fuelEmissions.reduce((sum, e) => sum + e.co2_kg, 0);
    
    if (fuelTotal > 0) {
      recommendations.push({
        id: 'fuel_optimization',
        type: 'operational',
        priority: 'high',
        title: 'Optimize Fuel Consumption',
        insight: `Direct fuel emissions (${Math.round(fuelTotal)}kg CO₂) account for ${Math.round((fuelTotal/summary.total)*100)}% of your carbon footprint.`,
        action: `Switch to CNG where possible (25% lower emissions), implement driver training for 10% fuel efficiency gains, and consider route optimization.`,
        impact: {
          co2ReductionKg: Math.round(fuelTotal * 0.20),
          costSavingsINR: Math.round(fuelTotal * 0.20 * 35), // ~₹35/kg CO₂ in fuel costs
          paybackMonths: 6,
        },
        category: 'transport',
        icon: 'Fuel',
      });
    }
  }
  
  // Category-specific recommendation
  if (hotspots.topCategoryPct > 20) {
    recommendations.push({
      id: 'category_focus',
      type: 'operational',
      priority: 'medium',
      title: `Reduce ${hotspots.topCategory.charAt(0).toUpperCase() + hotspots.topCategory.slice(1)} Emissions`,
      insight: `"${hotspots.topCategory}" is your largest emission category at ${hotspots.topCategoryPct}% of total footprint.`,
      action: `Conduct a focused audit on ${hotspots.topCategory} operations. Look for supplier alternatives, process improvements, or equipment upgrades.`,
      impact: {
        co2ReductionKg: Math.round(hotspots.categoryBreakdown[hotspots.topCategory] * 0.15),
        costSavingsINR: Math.round(hotspots.categoryBreakdown[hotspots.topCategory] * 0.15 * 20),
        paybackMonths: 12,
      },
      category: hotspots.topCategory,
      icon: 'Target',
    });
  }
  
  // LED lighting recommendation if electricity is significant
  if (summary.scope2 > 50) {
    const ledSavings = summary.scope2 * INTERVENTIONS.led_upgrade.reductionFactor;
    recommendations.push({
      id: 'led_upgrade',
      type: 'operational',
      priority: 'medium',
      title: 'Switch to LED Lighting',
      insight: `Lighting typically accounts for 15-20% of electricity consumption in MSMEs.`,
      action: `Replace conventional lighting with LED. Priority: production floor, warehouse, outdoor areas. Payback under 18 months.`,
      impact: {
        co2ReductionKg: Math.round(ledSavings),
        costSavingsINR: Math.round(ledSavings * 8), // ₹8/kgCO₂e in electricity savings
        paybackMonths: INTERVENTIONS.led_upgrade.paybackMonths,
      },
      category: 'electricity',
      icon: 'Lightbulb',
    });
  }
  
  // Scope 3 recommendation
  if (summary.scope3 > summary.total * 0.2) {
    recommendations.push({
      id: 'supply_chain',
      type: 'financial',
      priority: 'medium',
      title: 'Green Supply Chain Initiative',
      insight: `Scope 3 (value chain) emissions of ${Math.round(summary.scope3)}kg represent ${Math.round((summary.scope3/summary.total)*100)}% - significant monetization opportunity.`,
      action: `Request emission data from top 5 suppliers. Prioritize suppliers with green certifications. This improves CBAM compliance and access to green finance.`,
      impact: {
        co2ReductionKg: Math.round(summary.scope3 * 0.10),
        costSavingsINR: Math.round(summary.scope3 * 0.10 * 500), // Carbon credit value
        paybackMonths: 18,
      },
      category: 'procurement',
      icon: 'Link',
    });
  }
  
  // IoT monitoring for larger operations
  if (summary.total > 1000) {
    recommendations.push({
      id: 'iot_monitoring',
      type: 'technology',
      priority: 'low',
      title: 'Deploy IoT Energy Monitoring',
      insight: `Your emission volume (${Math.round(summary.total)}kg) justifies real-time monitoring for continuous optimization.`,
      action: `Install smart meters on major equipment. Identify peak usage, detect anomalies, and track reduction progress automatically.`,
      impact: {
        co2ReductionKg: Math.round(summary.total * 0.08),
        costSavingsINR: Math.round(summary.total * 0.08 * 15),
        paybackMonths: INTERVENTIONS.iot_monitoring.paybackMonths,
      },
      category: 'monitoring',
      icon: 'Activity',
    });
  }
  
  // Recycling/Credits opportunity
  recommendations.push({
    id: 'recycling_credits',
    type: 'compliance',
    priority: summary.total > 500 ? 'medium' : 'low',
    title: 'Earn Carbon Credits via Recycling',
    insight: `Waste recycling with certified recyclers generates verifiable carbon credits worth ₹750-1500/tCO₂e.`,
    action: `Partner with CPCB-certified e-waste and plastic recyclers. Obtain recycling certificates for credit generation. No upfront investment needed.`,
    impact: {
      co2ReductionKg: Math.round(summary.total * 0.08),
      costSavingsINR: Math.round(summary.total * 0.08 * 0.75), // ₹750/tCO₂e = ₹0.75/kgCO₂e
      paybackMonths: 3,
    },
    category: 'waste',
    icon: 'Recycle',
  });
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations.slice(0, 6); // Return top 6 recommendations
}

export function getQuickWins(recommendations: IntelligenceRecommendation[]): IntelligenceRecommendation[] {
  return recommendations
    .filter(r => r.impact.paybackMonths <= 12)
    .slice(0, 3);
}

export function getTotalImpact(recommendations: IntelligenceRecommendation[]): {
  totalReduction: number;
  totalSavings: number;
  avgPayback: number;
} {
  if (recommendations.length === 0) {
    return { totalReduction: 0, totalSavings: 0, avgPayback: 0 };
  }
  
  return {
    totalReduction: recommendations.reduce((sum, r) => sum + r.impact.co2ReductionKg, 0),
    totalSavings: recommendations.reduce((sum, r) => sum + r.impact.costSavingsINR, 0),
    avgPayback: Math.round(
      recommendations.reduce((sum, r) => sum + r.impact.paybackMonths, 0) / recommendations.length
    ),
  };
}
