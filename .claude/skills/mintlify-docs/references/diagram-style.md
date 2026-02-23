# Diagram Style Reference

All Kyberon architecture diagrams follow the same SVG style established by Attesta.

## Core Properties

- **ViewBox:** Sized to content, typically 840 x height
- **Background:** Linear gradient from `#0f172a` to `#1e293b` with dot pattern overlay
- **Typography:** Inter for body text, Space Grotesk conceptually for headings
- **Flow:** Top-to-bottom with animated dashed flow lines

## SVG Structure

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 HEIGHT" fill="none">
  <defs>
    <!-- Background gradient -->
    <!-- Node gradients (project-specific colors) -->
    <!-- Glow filters -->
    <!-- Dot pattern -->
    <!-- Arrow markers -->
  </defs>

  <style>
    text { font-family: 'Inter', system-ui, sans-serif; }
    .step-label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; }
    .node-title { font-size: 15px; font-weight: 700; }
    .node-sub { font-size: 10px; font-weight: 500; }
    .flow-dash {
      stroke-dasharray: 5,4;
      fill: none;
      stroke-linecap: round;
      animation: dash-flow 1.2s linear infinite;
    }
    @keyframes dash-flow {
      to { stroke-dashoffset: -18; }
    }
  </style>

  <!-- Background -->
  <rect width="840" height="HEIGHT" fill="url(#bgGrad)"/>
  <rect width="840" height="HEIGHT" fill="url(#dots)"/>

  <!-- Nodes and flow arrows -->
</svg>
```

## Node Pattern

Each node consists of:

1. Step label above: `<text class="step-label" fill="COLOR">STEP N</text>`
2. Glow filter wrapper: `<g filter="url(#glowColor)">`
3. Rounded rect background with gradient fill at low opacity
4. Rounded rect border with stroke color
5. Icon (Lucide-style SVG paths)
6. Title text (`.node-title`, light color)
7. Subtitle text (`.node-sub`, medium color)

## Flow Arrows

Animated dashed lines between nodes:

```xml
<line x1="400" y1="92" x2="400" y2="126" stroke="COLOR" stroke-width="1.5" class="flow-dash" opacity="0.5"/>
<polygon points="395,122 400,132 405,122" fill="COLOR" opacity="0.6"/>
```

## Glow Filter Template

```xml
<filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="6" result="b"/>
  <feFlood flood-color="#0EA5E9" flood-opacity="0.3" result="c"/>
  <feComposite in="c" in2="b" operator="in" result="s"/>
  <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
```

## Dot Pattern

```xml
<pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
  <circle cx="2" cy="2" r="0.6" fill="#334155" opacity="0.4"/>
</pattern>
```

## Color Conventions for Trailproof Diagrams

| Element | Color | Use |
|---------|-------|-----|
| Primary nodes | `#0EA5E9` / `#38BDF8` | Main flow steps |
| Secondary nodes | `#6366f1` / `#8b5cf6` | Supporting elements |
| Success | `#22c55e` / `#4ade80` | Verification passed |
| Warning | `#f59e0b` / `#fbbf24` | Caution states |
| Error | `#ef4444` / `#f87171` | Chain broken |
| Background text | `#94a3b8` | Labels, annotations |

## Branching Pattern

For diagrams with multiple paths (like risk levels), use:
- Curved paths from center to columns
- Color-coded cards for each branch
- Score badges as pills
- Merge lines converging back to a single point
