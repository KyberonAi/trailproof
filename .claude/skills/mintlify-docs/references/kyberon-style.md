# Kyberon Documentation Style Reference

## Trailproof Brand

- **Primary:** `#1E40AF` (deep blue)
- **Light:** `#3B82F6`
- **Dark:** `#1E3A8A`
- **Dark BG:** `#1A1A1F`
- **Icon:** `shield-check` (Lucide)
- **Logo SVG:** Lucide `shield-check` + "Trailproof" in Space Grotesk 700

## Color Replacement from Attesta

When adapting Attesta's style.css for Trailproof, replace:

| Attesta (green) | Trailproof (blue) |
|---|---|
| `#16A34A` | `#1E40AF` |
| `#22C55E` | `#3B82F6` |
| `#15803D` | `#1E3A8A` |
| `#1A1D1C` | `#1A1A1F` |
| `rgba(22, 163, 74, ...)` | `rgba(30, 64, 175, ...)` |
| `rgba(34, 197, 94, ...)` | `rgba(59, 130, 246, ...)` |

## docs.json Template

The `docs.json` structure follows Attesta exactly — only change:
- `name`, `logo`, `favicon`
- `colors` to Trailproof palette
- `background.color.dark` to `#1A1A1F`
- `navbar.links` GitHub URL
- `navigation` to match project pages
- `footer.socials` GitHub URL

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
