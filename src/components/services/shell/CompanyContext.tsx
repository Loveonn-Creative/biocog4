import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SectorKey } from "@/lib/nicSectors";

export interface CompanyFacts {
  idType?: "gstin" | "cin" | "pan";
  state?: string;
  sector?: SectorKey;
  sectorSource?: "cin" | "user";
  listed?: boolean;
  holderType?: string;
  yearIncorporated?: number;
}

const Ctx = createContext<{ facts: CompanyFacts; setFacts: (f: CompanyFacts) => void }>({ facts: {}, setFacts: () => {} });

/** Facts read from a company ID, shared by the page's tool and visual. Never stored or sent. */
export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [facts, setFacts] = useState<CompanyFacts>({});
  const value = useMemo(() => ({ facts, setFacts }), [facts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCompany = () => useContext(Ctx);
