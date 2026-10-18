import { describe, expect, test } from "bun:test";
import { closestRoutes, editDistance, normalisePath } from "../src/lib/routeMatch";

const routes = [
  { p: "/pricing", t: "Pricing: Carbon MRV Plans for MSMEs" },
  { p: "/principles", t: "Principles" },
  { p: "/cbam-cost/steel", t: "CBAM Cost per Tonne of Steel" },
  { p: "/cbam-cost/cement", t: "CBAM Cost per Tonne of Cement" },
  { p: "/emission-factors/diesel", t: "Diesel emission factor" },
];

describe("404 route match", () => {
  test("a one-letter typo finds the page", () => {
    const [best] = closestRoutes("/pricng", routes);
    expect(best.route.p).toBe("/pricing");
    expect(best.dist).toBe(1);
  });
  test("typed words find pages by title", () => {
    expect(closestRoutes("cbam steel", routes, 1, true)[0].route.p).toBe("/cbam-cost/steel");
    expect(closestRoutes("diesel factor", routes, 1, true)[0].route.p).toBe("/emission-factors/diesel");
  });
  test("addresses are normalised", () => {
    expect(normalisePath("https://senseible.earth/Pricing/?x=1")).toBe("/pricing");
    expect(editDistance("abc", "abd")).toBe(1);
  });
});
