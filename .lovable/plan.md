
# India AI Innovation Element -- Homepage and About Page

## What This Adds

A culturally meaningful, lightweight SVG animation component inspired by India's AI innovation identity (referencing the AI Impact Summit's Ashoka Chakra motif and Sovereign AI positioning). This is NOT a generic icon -- it is a purpose-built visual element combining:

- **Ashoka Chakra spokes** radiating outward (sovereignty, progress)
- **Multi-color radiating lines** in saffron, green, and blue tones (India's tricolor + climate/tech)
- **Subtle pulsing animation** suggesting AI neural activity
- A grounding tagline: **"AI infrastructure for MSMEs from India. Empowering climate impact."**

The element appears on both the **Homepage** (below the upload area, above the footer nav) and the **About page** hero section.

## Design Principles

- Pure CSS/SVG animation -- zero external libraries, zero bundle impact
- Renders in under 1ms -- no JavaScript animation loop, CSS-only transforms
- Does not interfere with OCR pipeline, upload flow, or any functional element
- Subtle and refined -- 0.05-0.15 opacity range, never competes with core UI
- Mobile-first: scales gracefully, no layout shift

## Architecture

### New Component: `src/components/IndiaAIBadge.tsx`

A self-contained SVG component that renders:

```text
        Radiating spokes (12 lines)
       in saffron, white, green, blue
              ╲  │  ╱
           ─── ◉ ───    <-- Central circle with subtle Chakra-inspired pattern
              ╱  │  ╲
        Slow rotation animation (60s cycle)
        + gentle pulse on the center (3s cycle)

  "AI infrastructure for MSMEs from India."
     "Empowering climate impact."
```

Colors used:
- Saffron (#FF9933) -- Indian identity
- Deep green (#138808) -- nature/climate
- Navy blue (#000080) -- Ashoka Chakra, sovereignty
- Primary brand green -- Senseible identity

The spokes use varying colors to reflect diversity without being a literal flag. The animation is a very slow rotation (60 seconds per revolution) making it feel alive but never distracting. The center pulses gently every 3 seconds.

### Homepage Integration (`src/pages/Index.tsx`)

Place the badge + tagline between the upload area and the footer nav, only in idle state:

```text
  [UseCaseTyper]
  [Document] | [Voice]
  "Upload a document or speak to begin"
  
       [IndiaAIBadge]  <-- NEW: subtle, small (48px)
  "AI infrastructure for MSMEs from India.
     Empowering climate impact."
  
  [Monetize] [About] [Climate Intelligence] ...
```

The tagline uses split coloring: "AI infrastructure for MSMEs" in foreground, "from India" in saffron, "Empowering climate impact" in brand green.

### About Page Integration (`src/pages/About.tsx`)

Add the same element above the "Why This Exists" heading with matching tagline, reinforcing the India-origin narrative in the infrastructure story.

```text
  [Back]
  
  [IndiaAIBadge]  <-- NEW: slightly larger (64px)
  "AI infrastructure for MSMEs from India."
  
  Why This Exists
  ...
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/IndiaAIBadge.tsx` | **CREATE** | SVG component with Chakra-inspired radiating spokes, multi-color lines, CSS-only animation |
| `src/pages/Index.tsx` | **EDIT** | Add IndiaAIBadge + tagline below upload area in idle state |
| `src/pages/About.tsx` | **EDIT** | Add IndiaAIBadge + tagline above the hero heading |

## Performance Impact

- **Bundle**: ~2KB component (inline SVG + CSS), no new dependencies
- **Render**: CSS-only animations, no useEffect, no requestAnimationFrame
- **Layout**: Fixed height, no CLS (Cumulative Layout Shift)
- **OCR pipeline**: Zero interference -- component is purely decorative

## What Does NOT Change

- Homepage layout structure, upload flow, voice input
- UseCaseTyper positioning and behavior
- CarbonParticles background animation
- Footer navigation links
- Any functional component or data pipeline
- About page content sections (Problem, Gap, Replacement, Why Now)
- Mobile responsiveness of existing elements
