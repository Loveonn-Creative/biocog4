import type { ServiceModule } from "./types";

/** One lazily loaded chunk (tool + visual) per service page. */
export const serviceModules: Record<string, () => Promise<ServiceModule>> = {
  "carbon-accounting": () => import("./carbon-accounting"),
  "esg-reporting": () => import("./esg-reporting"),
  "supplier-due-diligence": () => import("./supplier-due-diligence"),
  "decarbonization": () => import("./decarbonization"),
  "circular-economy": () => import("./circular-economy"),
  "climate-risk": () => import("./climate-risk"),
  "esg-data-management": () => import("./esg-data-management"),
  "ehs-social": () => import("./ehs-social"),
  "product-compliance": () => import("./product-compliance"),
  "esg-ratings": () => import("./esg-ratings"),
  "green-finance": () => import("./green-finance"),
};
