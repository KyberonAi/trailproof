# Kyberon Documentation Style Reference

## Trailproof Brand

- **Primary:** `#0EA5E9` (sky blue)
- **Light:** `#38BDF8`
- **Dark:** `#0284C7`
- **Dark BG:** `#1A1A1F`
- **Icon:** `shield-check` (Lucide)
- **Logo SVG:** Lucide `shield-check` + "Trailproof" in Space Grotesk 700

## Color Replacement from Attesta

When adapting Attesta's style.css for Trailproof, replace:

| Attesta (green) | Trailproof (sky blue) |
|---|---|
| `#16A34A` | `#0EA5E9` |
| `#22C55E` | `#38BDF8` |
| `#15803D` | `#0284C7` |
| `#1A1D1C` | `#1A1A1F` |
| `#2d3130` | `#2d3033` |
| `rgba(22, 163, 74, ...)` | `rgba(14, 165, 233, ...)` |
| `rgba(34, 197, 94, ...)` | `rgba(56, 189, 248, ...)` |

## style.css Sections

The `style.css` file contains the following key sections:

0. **Layout** — Wider content area (`#content-area`, `#content-container`, screen max-width)
1. **Code Blocks** — Minimal styling: `border-radius: 8px`, `border: none`, `overflow: hidden` (matches Attesta exactly)
2. **Pagination + Footer** — Transparent backgrounds, pagination link cards with border hover in primary color
3. **Headings** — Page title weight, eyebrow uppercase with primary color
4. **Cards** — Border hover in primary color with box-shadow
5. **Table** — Font weight, padding, responsive stacking

## docs.json Template

The `docs.json` structure follows Attesta exactly — only change:
- `name`, `logo`, `favicon`
- `colors` to Trailproof palette
- `background.color.dark` to `#1A1A1F`
- `navbar.links` GitHub URL
- `navigation` to match project pages
- `footer.socials` GitHub URL

## Dark Mode Selector

Mintlify maple theme uses `html.dark` class (NOT `[data-theme="dark"]`). All dark mode overrides use this pattern:

```css
html.dark .element {
  /* dark mode styles */
}
```

## Logo SVG Pattern

Both logos use:
- viewBox `0 0 190 28`
- Lucide icon at left, `scale(1.08)`, `translate(1, 1)`
- Brand text at `x="34" y="22.5"`, Space Grotesk 700, font-size 28
- Light logo: icon stroke = project primary, text fill = `#0F172A`
- Dark logo: icon stroke = project light color, text fill = `white`

## Favicon Pattern

Standalone Lucide icon SVG, viewBox `0 0 24 24`, stroke = project primary color.

## Icon Reference

Trailproof docs use these Font Awesome icons consistently:

- `shield-check` — tamper-evidence, Trailproof identity
- `link` — hash chain
- `key` — HMAC signing, cryptography
- `scroll` — audit trail, event ledger
- `code` — SDK, developer tools
- `rocket` — quickstart
- `feather` — lightweight, zero dependencies
- `file-code` — configuration
- `gauge-high` — performance
