import { describe, expect, it } from "bun:test";
import {
  FREIGHT_FACTORS, getFreightFactor, resolveFreightFactor, roadFactorForWeight,
  perShortTonMileToPerTKm, perVehicleDistanceToPerTKm,
} from "../src/lib/calculators/freightFactors";
import { calculateLogistics, TRANSPORT_MODES } from "../src/lib/calculators/logisticsEngine";
import { calculatePCF, PCF_TRANSPORT } from "../src/lib/calculators/pcfEngine";

describe("shared freight factors", () => {
  it("carries the India road and rail values from the primary document", () => {
    const v = (id: string) => getFreightFactor(id)?.kgCO2ePerTKm;
    expect(v("road-scv-diesel")).toBe(0.3795);
    expect(v("road-lcv-diesel")).toBe(0.2222);
    expect(v("road-mcv-diesel")).toBe(0.14);
    expect(v("road-hcv12-diesel")).toBe(0.0902);
    expect(v("road-hcv20-diesel")).toBe(0.0823);
    expect(v("road-hcv30-diesel")).toBe(0.0663);
    expect(v("road-trailer-diesel")).toBe(0.0551);
    expect(v("rail-india")).toBe(0.0106);
    for (const f of FREIGHT_FACTORS.filter(f => f.category === "road" || f.category === "rail")) {
      expect(f.status).toBe("confirmed");
    }
  });

  it("marks every non-India value as to be confirmed", () => {
    for (const f of FREIGHT_FACTORS.filter(f => f.category === "sea" || f.category === "air")) {
      expect(f.status).toBe("to_confirm");
    }
  });

  it("orders road intensity by vehicle size: bigger trucks are lower per tonne-km", () => {
    const diesel = ["road-scv-diesel", "road-lcv-diesel", "road-mcv-diesel", "road-hcv12-diesel", "road-hcv20-diesel", "road-hcv30-diesel", "road-trailer-diesel"]
      .map(id => getFreightFactor(id)!.kgCO2ePerTKm);
    for (let i = 1; i < diesel.length; i++) expect(diesel[i]).toBeLessThan(diesel[i - 1]);
  });

  it("gives both calculators the same value for the same truck", () => {
    for (const f of FREIGHT_FACTORS) {
      expect(TRANSPORT_MODES.find(m => m.id === f.id)?.kgCO2ePerTKm).toBe(f.kgCO2ePerTKm);
      expect(PCF_TRANSPORT.find(m => m.id === f.id)?.kgCO2ePerTKm).toBe(f.kgCO2ePerTKm);
    }
    // Old ids from saved runs resolve to one shared value in both engines.
    expect(getFreightFactor("road-rigid")?.kgCO2ePerTKm).toBe(getFreightFactor("truck-rigid")?.kgCO2ePerTKm);
    expect(getFreightFactor("road-articulated")?.kgCO2ePerTKm).toBe(getFreightFactor("truck-articulated")?.kgCO2ePerTKm);
  });

  it("returns no factor for modes without a reviewed value instead of guessing", () => {
    expect(resolveFreightFactor({ mode: "pipeline", weightTonnes: 10, distanceKm: 100 })).toBeNull();
    expect(resolveFreightFactor({ mode: "inland-waterway", weightTonnes: 10, distanceKm: 100 })).toBeNull();
  });

  it("falls back within the category when the vehicle is unknown", () => {
    expect(roadFactorForWeight(1).id).toBe("road-scv-diesel");
    expect(roadFactorForWeight(6).id).toBe("road-mcv-diesel");
    expect(roadFactorForWeight(18).id).toBe("road-hcv20-diesel");
    expect(roadFactorForWeight(120).id).toBe("road-trailer-diesel");
    expect(resolveFreightFactor({ category: "air", distanceKm: 900 })?.factor?.id).toBe("air-freighter-short");
    expect(resolveFreightFactor({ category: "air", distanceKm: 7000 })?.factor?.id).toBe("air-freighter-long");
    expect(resolveFreightFactor({ category: "rail" })?.basis).toBe("fallback");
  });

  it("uses a valid carrier factor as given and rejects unit errors", () => {
    expect(resolveFreightFactor({ mode: "road-hcv20-diesel", customEf: 0.071 })).toMatchObject({ kgCO2ePerTKm: 0.071, basis: "carrier" });
    // 1.45 is a per vehicle-mile figure: far above any tonne-km intensity, so it is not accepted as one.
    expect(resolveFreightFactor({ mode: "road-hcv20-diesel", customEf: 145 })?.basis).toBe("default");
  });
});

describe("unit guards", () => {
  it("converts per short ton-mile to per tonne-km", () => {
    // 0.022 kg per short ton-mile (US rail) is about 0.0151 kg per tonne-km, not 0.022.
    expect(perShortTonMileToPerTKm(0.022)).toBeCloseTo(0.01507, 4);
  });

  it("needs a payload before a per-vehicle factor can become per tonne-km", () => {
    expect(perVehicleDistanceToPerTKm(1.45, 0, true)).toBeNull();
    // 1.45 kg per vehicle-mile at 10 t average payload = 0.0901 kg per tonne-km.
    expect(perVehicleDistanceToPerTKm(1.45, 10, true)!).toBeCloseTo(0.0901, 4);
  });
});

describe("logistics engine method", () => {
  it("multiplies tonnes × km × default with no load or empty-return uplift", () => {
    const r = calculateLogistics([
      { id: "a", mode: "road-hcv20-diesel", weightTonnes: 10, distanceKm: 1000, loadFactor: 0.3, emptyReturnFactor: 1 },
    ]);
    expect(r.totalTonneKm).toBe(10000);
    expect(r.totalKgCO2e).toBe(823); // 10,000 tkm × 0.0823
    expect(r.legs[0].basis).toBe("default");
  });

  it("re-runs older saved legs through the shared table", () => {
    const r = calculateLogistics([{ id: "a", mode: "rail-diesel", weightTonnes: 20, distanceKm: 1000 }]);
    expect(r.totalKgCO2e).toBe(212); // 20,000 tkm × 0.0106
  });

  it("leaves out a leg with no reviewed factor and says so", () => {
    const r = calculateLogistics([
      { id: "a", label: "Pipe", mode: "pipeline", weightTonnes: 10, distanceKm: 100 },
      { id: "b", mode: "rail-india", weightTonnes: 10, distanceKm: 100 },
    ]);
    expect(r.legs.length).toBe(1);
    expect(r.notes.some(n => n.includes("Pipe"))).toBe(true);
  });

  it("ignores non-finite or negative inputs", () => {
    const r = calculateLogistics([{ id: "a", mode: "rail-india", weightTonnes: Number.NaN, distanceKm: 100 }]);
    expect(r.legs.length).toBe(0);
    expect(r.totalKgCO2e).toBe(0);
  });
});

describe("PCF engine transport", () => {
  it("uses the shared value, including for old factor ids", () => {
    const base = {
      productName: "x", functionalUnit: "1 kg", unitsPerBatch: 1, systemBoundary: "cradle-to-gate" as const,
      allocationMethod: "none" as const, coProductShare: 1, materials: [], energy: [], processing: [],
    };
    const r = calculatePCF({ ...base, transport: [{ id: "t", factorId: "truck-articulated", weightTonnes: 10, distanceKm: 100 }] });
    expect(r.byCategory.transport).toBe(Math.round(0.0551 * 1000 * 1000) / 1000);
  });
});
