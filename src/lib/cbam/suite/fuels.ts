// IPCC 2006 Guidelines, Volume 2 (Energy), Chapter 1, Table 1.2 (default net
// calorific values, TJ/Gg) and Table 1.4 (default CO2 emission factors for
// combustion, kg CO2/TJ, oxidation factor 1). Read from the chapter PDF on
// 24 Oct 2026:
// https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf
// TJ/Gg equals GJ/t; kg CO2/TJ divided by 1000 is t CO2/TJ, the units the
// Commission's communication template uses (sheet B_EmInst).
// These are offered, never applied silently: the user picks one and the
// source is stored with the source stream. Measured values always win.

export interface FuelDefault { id: string; name: string; ncvGJperT: number; efTco2PerTJ: number }

export const IPCC_SOURCE = 'IPCC 2006 Guidelines, Vol. 2, Ch. 1, Tables 1.2 and 1.4 (default values)';

export const IPCC_FUELS: FuelDefault[] = [
  { id: 'natural_gas', name: 'Natural gas', ncvGJperT: 48.0, efTco2PerTJ: 56.1 },
  { id: 'gas_diesel_oil', name: 'Gas/diesel oil', ncvGJperT: 43.0, efTco2PerTJ: 74.1 },
  { id: 'residual_fuel_oil', name: 'Residual fuel oil (furnace oil)', ncvGJperT: 40.4, efTco2PerTJ: 77.4 },
  { id: 'lpg', name: 'Liquefied petroleum gases', ncvGJperT: 47.3, efTco2PerTJ: 63.1 },
  { id: 'motor_gasoline', name: 'Motor gasoline', ncvGJperT: 44.3, efTco2PerTJ: 69.3 },
  { id: 'other_kerosene', name: 'Other kerosene', ncvGJperT: 43.8, efTco2PerTJ: 71.9 },
  { id: 'naphtha', name: 'Naphtha', ncvGJperT: 44.5, efTco2PerTJ: 73.3 },
  { id: 'petroleum_coke', name: 'Petroleum coke', ncvGJperT: 32.5, efTco2PerTJ: 97.5 },
  { id: 'anthracite', name: 'Anthracite', ncvGJperT: 26.7, efTco2PerTJ: 98.3 },
  { id: 'coking_coal', name: 'Coking coal', ncvGJperT: 28.2, efTco2PerTJ: 94.6 },
  { id: 'other_bituminous_coal', name: 'Other bituminous coal', ncvGJperT: 25.8, efTco2PerTJ: 94.6 },
  { id: 'sub_bituminous_coal', name: 'Sub-bituminous coal', ncvGJperT: 18.9, efTco2PerTJ: 96.1 },
  { id: 'lignite', name: 'Lignite', ncvGJperT: 11.9, efTco2PerTJ: 101.0 },
  { id: 'coke_oven_coke', name: 'Coke oven coke and lignite coke', ncvGJperT: 28.2, efTco2PerTJ: 107.0 },
];

export const fuelById = (id: string) => IPCC_FUELS.find((f) => f.id === id) ?? null;
