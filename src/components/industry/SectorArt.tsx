import type { ReactNode } from "react";
import { Doodle } from "@/components/doodles/Doodles";

/**
 * One line drawing per sector, showing the equipment where its emissions
 * actually happen. Each drawing names where its Scope 1 (fuel), Scope 2
 * (power) and Scope 3 (inputs) markers sit, in percent of the frame.
 */
export interface Art { draw: ReactNode; pins: { 1: [number, number]; 2: [number, number]; 3: [number, number] } }

const P = "hsl(var(--primary))";
const ground = <path pathLength={1} d="M10 140 h220" />;
const pylon = (x: number) => <path pathLength={1} d={`M${x} 140 l8 -50 l8 50 M${x + 2} 120 h12 M${x + 4} 104 h8 M${x - 4} 92 h24`} />;

export const SECTOR_ART: Record<string, Art> = {
  steel: { pins: { 1: [38, 48], 2: [86, 58], 3: [12, 78] }, draw: <>
    {ground}
    <path pathLength={1} d="M70 140 V70 l12 -18 h16 l12 18 v70" />
    <path pathLength={1} d="M86 52 V30 M94 52 V24" />
    <path pathLength={1} d="M110 110 h40 l10 30" stroke={P} />
    <path pathLength={1} d="M150 110 c8 4 10 14 14 30" stroke={P} strokeWidth={2.6} />
    <path pathLength={1} d="M20 140 l14 -22 l14 22 z" />
    {pylon(196)}
  </> },
  aluminium: { pins: { 1: [44, 56], 2: [84, 50], 3: [14, 80] }, draw: <>
    {ground}
    <path pathLength={1} d="M80 140 V92 h50 v48" />
    <path pathLength={1} d="M92 92 v-20 h26 v20" stroke={P} />
    <path pathLength={1} d="M20 140 h40 v-10 h-40z M24 130 h32 v-10 h-32z M28 120 h24 v-10 h-24z" />
    <path pathLength={1} d="M140 120 h50 M140 128 h50" />
    {pylon(198)}
  </> },
  cement: { pins: { 1: [52, 58], 2: [86, 46], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M70 118 l90 -24 v18 l-90 24z" stroke={P} />
    <path pathLength={1} d="M80 132 v8 M150 114 v26" />
    <path pathLength={1} d="M176 140 V60 h20 v80" />
    <path pathLength={1} d="M20 140 q14 -30 28 0" />
    {pylon(206)}
  </> },
  fertiliser: { pins: { 1: [40, 52], 2: [86, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M80 140 V60 a10 10 0 0 1 20 0 v80" stroke={P} />
    <path pathLength={1} d="M110 140 V80 a8 8 0 0 1 16 0 v60" />
    <path pathLength={1} d="M20 140 v-18 q10 -6 20 0 v18 M44 140 v-18 q10 -6 20 0 v18" />
    <path pathLength={1} d="M140 100 h30" />
    {pylon(196)}
  </> },
  textile: { pins: { 1: [30, 52], 2: [84, 50], 3: [60, 80] }, draw: <>
    {ground}
    <path pathLength={1} d="M40 140 V84 l20 -12 l20 12 l20 -12 l20 12 V140" />
    <path pathLength={1} d="M60 72 V48 h10 v24" />
    <circle pathLength={1} cx="150" cy="118" r="14" stroke={P} />
    <circle pathLength={1} cx="150" cy="118" r="5" />
    <path pathLength={1} d="M164 118 C 180 108, 186 128, 200 116" stroke={P} />
    {pylon(204)}
  </> },
  chemical: { pins: { 1: [36, 56], 2: [86, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M70 140 V50 h10 v90 M90 140 V64 h10 v76" />
    <path pathLength={1} d="M120 140 v-30 a16 16 0 0 1 32 0 v30" stroke={P} />
    <path pathLength={1} d="M100 90 h20 M80 76 h10" />
    <path pathLength={1} d="M20 140 v-24 h24 v24 M26 116 v-8 h12 v8" />
    {pylon(196)}
  </> },
  ceramics: { pins: { 1: [44, 60], 2: [84, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M60 140 V100 h110 v40" stroke={P} />
    <path pathLength={1} d="M70 100 v-14 M160 100 v-14" />
    <path pathLength={1} d="M80 120 h14 v10 h-14z M100 120 h14 v10 h-14z M120 120 h14 v10 h-14z" />
    <path pathLength={1} d="M20 140 l10 -20 h14 l10 20" />
    {pylon(196)}
  </> },
  paper: { pins: { 1: [36, 52], 2: [84, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M70 140 V70 h16 v70" />
    <circle pathLength={1} cx="130" cy="116" r="20" stroke={P} />
    <circle pathLength={1} cx="130" cy="116" r="6" />
    <path pathLength={1} d="M150 116 h40" stroke={P} />
    <path pathLength={1} d="M20 140 h30 v-14 h-30z" />
    {pylon(198)}
  </> },
  "food-processing": { pins: { 1: [34, 54], 2: [84, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M60 140 V96 h40 v44" />
    <path pathLength={1} d="M110 140 V90 h50 v50" stroke={P} />
    <path pathLength={1} d="M120 104 h30 M120 116 h30" />
    <path pathLength={1} d="M70 96 V76 h10 v20" />
    <path pathLength={1} d="M20 140 v-20 q6 -10 12 0 v20" />
    {pylon(196)}
  </> },
  logistics: { pins: { 1: [44, 64], 2: [86, 48], 3: [16, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M40 128 V98 h70 v30 M110 106 h22 l14 14 v8 h-36" stroke={P} />
    <circle pathLength={1} cx="60" cy="132" r="8" />
    <circle pathLength={1} cx="128" cy="132" r="8" />
    <path pathLength={1} d="M160 140 V94 l24 -14 l24 14 v46" />
    {pylon(208)}
  </> },
  construction: { pins: { 1: [40, 68], 2: [80, 40], 3: [16, 84] }, draw: <>
    {ground}
    <path pathLength={1} d="M120 140 V34 M120 34 h80 M120 34 l-24 10 M180 34 v30" stroke={P} />
    <path pathLength={1} d="M176 64 h8 v10 h-8z" />
    <path pathLength={1} d="M40 140 V106 h50 v34 M52 118 h8 M70 118 h8" />
    <path pathLength={1} d="M20 140 q8 -14 16 0" />
  </> },
  automobile: { pins: { 1: [40, 54], 2: [86, 48], 3: [14, 82] }, draw: <>
    {ground}
    <path pathLength={1} d="M60 140 V92 h70 v48" />
    <circle pathLength={1} cx="150" cy="114" r="16" stroke={P} />
    <path pathLength={1} d="M150 94 v6 M150 128 v6 M130 114 h6 M164 114 h6 M136 100 l4 4 M160 124 l4 4 M136 128 l4 -4 M160 104 l4 -4" stroke={P} />
    <path pathLength={1} d="M70 92 V74 h10 v18" />
    <path pathLength={1} d="M20 140 v-16 h22 v16" />
    {pylon(196)}
  </> },
};

export function SectorDrawing({ id, className = "" }: { id: string; className?: string }) {
  const art = SECTOR_ART[id];
  if (!art) return null;
  return <Doodle viewBox="0 0 240 160" className={className}>{art.draw}</Doodle>;
}
