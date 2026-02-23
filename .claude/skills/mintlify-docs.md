# Skill: Mintlify Documentation

When writing or updating documentation for Mintlify, follow these conventions. This matches the Kyberon documentation style established by Memproof.

## Kyberon Doc Style

All Kyberon projects share the same Mintlify foundation:
- **Theme:** `maple`
- **Config file:** `docs.json` (not `mint.json`)
- **Fonts:** Space Grotesk 700 (headings), Inter 400 (body)
- **Layout:** `sidenav`
- **Codeblocks:** `github-light` / `github-dark-dimmed`
- **Custom CSS:** `style.css` with wider content area, card hover effects, transparent pagination/footer

### Trailproof Brand

- **Primary color:** `#1E40AF` (deep blue)
- **Light color:** `#3B82F6`
- **Dark color:** `#1E3A8A`
- **Background dark:** `#1A1A1F`
- **Icon:** `shield-check` (Trailproof's identity icon)
- **Logo SVG:** Lucide `shield-check` icon in deep blue + "Trailproof" in Space Grotesk 700

## Project Structure

```
docs/
├── docs.json              # Site config (NOT mint.json — Mintlify v4+ uses docs.json)
├── favicon.svg            # shield-check icon in #1E40AF
├── style.css              # Custom overrides (wider layout, card hover, pagination)
├── introduction.mdx       # Landing page
├── quickstart.mdx         # Getting started guide
├── logo/
│   ├── dark.svg           # shield-check + "Trailproof" in #3B82F6 on dark bg
│   └── light.svg          # shield-check + "Trailproof" in #1E40AF on light bg
├── images/                # Static assets (diagrams, architecture SVGs)
├── concepts/              # Core concept pages
│   ├── hash-chain.mdx
│   ├── canonical-json.mdx
│   └── event-envelope.mdx
├── api-reference/         # API docs
│   ├── overview.mdx
│   ├── trailproof-class.mdx
│   ├── models.mdx
│   ├── errors.mdx
│   └── config.mdx
└── guides/                # How-to guides
    ├── hmac-signing.mdx
    ├── jsonl-store.mdx
    ├── typescript-sdk.mdx
    └── verification.mdx
```

## docs.json Configuration

```json
{
  "$schema": "https://mintlify.com/docs.json",
  "theme": "maple",
  "name": "Trailproof",
  "logo": { "dark": "/logo/dark.svg", "light": "/logo/light.svg" },
  "favicon": "/favicon.svg",
  "colors": {
    "primary": "#1E40AF",
    "light": "#3B82F6",
    "dark": "#1E3A8A"
  },
  "background": {
    "color": {
      "light": "#FFFFFF",
      "dark": "#1A1A1F"
    }
  },
  "fonts": {
    "heading": { "family": "Space Grotesk", "weight": 700 },
    "body": { "family": "Inter", "weight": 400 }
  },
  "navbar": {
    "links": [
      { "label": "GitHub", "href": "https://github.com/kyberon/trailproof", "type": "github" }
    ],
    "primary": { "label": "Get Started", "href": "/quickstart", "type": "button" }
  },
  "navigation": {
    "tabs": [
      {
        "tab": "Documentation",
        "groups": [
          {
            "group": "Getting Started",
            "pages": ["introduction", "quickstart"]
          },
          {
            "group": "Core Concepts",
            "pages": [
              "concepts/hash-chain",
              "concepts/canonical-json",
              "concepts/event-envelope"
            ]
          }
        ]
      },
      {
        "tab": "API Reference",
        "groups": [
          {
            "group": "API Reference",
            "pages": [
              "api-reference/overview",
              "api-reference/trailproof-class",
              "api-reference/models",
              "api-reference/errors",
              "api-reference/config"
            ]
          }
        ]
      },
      {
        "tab": "Guides",
        "groups": [
          {
            "group": "Guides",
            "pages": [
              "guides/hmac-signing",
              "guides/jsonl-store",
              "guides/verification",
              "guides/typescript-sdk"
            ]
          }
        ]
      }
    ],
    "global": {}
  },
  "footer": {
    "socials": {
      "github": "https://github.com/kyberon/trailproof"
    }
  },
  "branding": false,
  "layout": "sidenav",
  "styling": {
    "codeblocks": {
      "theme": {
        "light": "github-light",
        "dark": "github-dark-dimmed"
      }
    }
  },
  "feedback": { "thumbsRating": true, "suggestEdit": true, "raiseIssue": true }
}
```

## style.css

Copy Memproof's `style.css` but replace all purple color references:
- `#7C3AED` → `#1E40AF` (primary deep blue)
- `#A78BFA` → `#3B82F6` (light blue)
- `#6D28D9` → `#1E3A8A` (dark blue)
- `rgba(124, 58, 237, ...)` → `rgba(30, 64, 175, ...)`
- `rgba(167, 139, 250, ...)` → `rgba(59, 130, 246, ...)`

Keep all structural CSS identical (wider layout, transparent pagination/footer, card hover, etc.).

## MDX Page Format

Every MDX page starts with frontmatter:

```mdx
---
title: Page Title
description: One-line description for SEO and navigation
---
```

### Headings

- Use `#` for the page title (first heading only), then `##` for main sections
- Use `###` for subsections
- Keep heading hierarchy clean: `#` > `##` > `###` > `####`
- This matches Memproof's pattern (see introduction.mdx: `# What is Memproof?`)

### Code Blocks — Dual SDK

For dual SDK docs, show Python and TypeScript side by side. Use raw code blocks with language labels (NOT CodeGroup — Memproof doesn't use it):

```python
from trailproof import Trailproof

tp = Trailproof()
event = tp.emit(
    event_type="app.user.action",
    actor_id="agent-47",
    tenant_id="acme-corp",
    payload={"key": "value"},
)
```

```typescript
import { Trailproof } from "@kyberonai/trailproof";

const tp = new Trailproof();
const event = tp.emit({
    eventType: "app.user.action",
    actorId: "agent-47",
    tenantId: "acme-corp",
    payload: { key: "value" },
});
```

### Callouts

Use Mintlify's built-in components:

```mdx
<Note>Informational note — use for "good to know" context.</Note>
<Warning>Important warning — use for gotchas or breaking changes.</Warning>
<Tip>Helpful tip — use for best practices and recommendations.</Tip>
```

### Cards and Card Groups

Used for feature highlights and navigation. Always use `cols={2}`:

```mdx
<CardGroup cols={2}>
  <Card title="Tamper-Evident" icon="shield-check">
    SHA-256 hash chain proves no event was modified after recording.
  </Card>
  <Card title="Dual SDK" icon="code">
    Native libraries for Python and TypeScript with identical behavior.
  </Card>
  <Card title="Zero Dependencies" icon="feather">
    Stdlib-only in Python, Node.js built-ins only in TypeScript.
  </Card>
  <Card title="HMAC Signing" icon="key">
    Optional HMAC-SHA256 signatures prove event provenance.
  </Card>
</CardGroup>
```

For navigation cards (linking to other pages):

```mdx
<CardGroup cols={2}>
  <Card title="Quickstart" icon="rocket" href="/quickstart">
    Install and emit your first event in 5 minutes.
  </Card>
  <Card title="Hash Chain" icon="link" href="/concepts/hash-chain">
    Understand how events are cryptographically linked.
  </Card>
</CardGroup>
```

### Frames (for images/diagrams)

```mdx
<Frame>
  <img src="/images/architecture.svg" alt="Descriptive alt text" />
</Frame>
```

### Announcements

```json
"announcement": {
  "title": "Trailproof v1.0 is in early release. APIs are stable.",
  "url": "/quickstart"
}
```

## Page Conventions

### Introduction Page Pattern

Follow Memproof's introduction.mdx structure:
1. `# What is Trailproof?` — 2-3 sentence summary
2. `## The Problem` — bullet list of pain points
3. `## How Trailproof Solves This` — code example showing the API
4. `## Key Properties` — `<CardGroup cols={2}>` with 4 feature cards
5. `## Architecture at a Glance` — `<Frame>` with architecture diagram
6. `## Next Steps` — `<CardGroup cols={2}>` linking to quickstart and release info

### Quickstart Page Pattern

Follow Memproof's quickstart.mdx structure:
1. `## Installation` — pip/npm install
2. Numbered sections: `## 1. First Step`, `## 2. Second Step`, etc.
3. Each section has a code block showing the complete working example
4. `## Next Steps` — `<CardGroup cols={2}>` linking to concepts and guides

### Concept Pages Pattern

Follow Memproof's architecture.mdx structure:
1. Frontmatter with title + description
2. `# Title` with overview paragraph
3. `<Note>` callout for key context
4. `## Design Principles` or key concepts as numbered list
5. `<Frame>` diagram if applicable
6. `## Components` — `<CardGroup cols={2}>` describing each component
7. Code examples showing the relevant API
8. `<Tip>` for production recommendations

### API Reference Pages Pattern

1. Method signature as code block
2. Parameter documentation inline (not ParamField — Memproof doesn't use it)
3. Return type documentation
4. Code example showing usage
5. Error cases

### Guide Pages Pattern

1. Opening paragraph explaining what you'll learn
2. Step-by-step with code
3. Edge cases and gotchas in `<Warning>` or `<Note>`
4. `<Tip>` for production best practices
5. `## Next Steps` card group

## Writing Style

- **Concise** — one idea per paragraph, short sentences
- **Action-oriented** — start guides with what the reader will accomplish
- **Code-first** — show code before explaining it
- **Dual SDK** — always show both Python and TypeScript examples
- **No jargon without definition** — define terms on first use
- **Present tense** — "Trailproof creates a hash" not "Trailproof will create a hash"
- **Em dashes** — use `--` (double hyphen) for em dashes, matching Memproof's style

## Icon Reference

Trailproof docs use these Font Awesome icons consistently:
- `shield-check` — Trailproof identity, tamper-evidence
- `link` — hash chain, chain linking
- `key` — HMAC signing, cryptography
- `scroll` — audit trail, event ledger
- `code` — SDK, developer tools
- `rocket` — quickstart, getting started
- `feather` — lightweight, zero dependencies
- `puzzle-piece` — integrations, adapters
- `file-code` — configuration
- `gauge-high` — performance

## Common Mistakes to Avoid

- Do NOT use `mint.json` — Mintlify v4+ uses `docs.json`
- Do NOT skip frontmatter — every page needs title and description
- Do NOT write walls of text — break up with code examples and callouts
- Do NOT use relative links with .mdx extension — use paths like `/quickstart` not `./quickstart.mdx`
- Do NOT use colors that aren't in the Trailproof palette (deep blue family)
- Do NOT omit `style.css` — the wider layout and card hover effects are part of the Kyberon brand
- Do NOT use different fonts — always Space Grotesk for headings, Inter for body
