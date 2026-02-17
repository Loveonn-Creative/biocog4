import { Leaf, Sun, Zap, TreePine, Wind, Flame, Lightbulb, Droplets, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GREEN_CATEGORIES: Record<string, { label: string; icon: React.ComponentType<any>; className: string }> = {
  solar: { label: 'Solar', icon: Sun, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  ev: { label: 'EV', icon: Zap, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  forestation: { label: 'Forestation', icon: TreePine, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  organic: { label: 'Organic', icon: Leaf, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  wind: { label: 'Wind', icon: Wind, className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  biogas: { label: 'Biogas', icon: Flame, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  efficiency: { label: 'Energy Efficient', icon: Lightbulb, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  water: { label: 'Water Conservation', icon: Droplets, className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  recycled: { label: 'Recycled', icon: Recycle, className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
};

interface GreenCategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export const GreenCategoryBadge = ({ category, size = 'sm' }: GreenCategoryBadgeProps) => {
  const config = GREEN_CATEGORIES[category];
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge variant="outline" className={`${config.className} py-0 h-5 shrink-0 gap-1 text-xs`}>
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
};

export const isGreenCategory = (category: string): boolean => {
  return category in GREEN_CATEGORIES;
};

export const getGreenCategoryFromEmissionCategory = (emissionCategory: string): string | null => {
  const map: Record<string, string> = {
    'SOLAR_ENERGY': 'solar',
    'EV_TRANSPORT': 'ev',
    'FORESTATION': 'forestation',
    'ORGANIC_INPUT': 'organic',
    'WIND_ENERGY': 'wind',
    'BIOGAS': 'biogas',
    'ENERGY_EFFICIENCY': 'efficiency',
    'WATER_CONSERVATION': 'water',
    'RECYCLED_MATERIAL': 'recycled',
    'solar': 'solar',
    'ev': 'ev',
    'forestation': 'forestation',
    'organic': 'organic',
    'wind': 'wind',
    'biogas': 'biogas',
    'efficiency': 'efficiency',
    'water': 'water',
    'recycled': 'recycled',
  };
  return map[emissionCategory] || null;
};
