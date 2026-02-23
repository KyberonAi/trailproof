---
name: mintlify-docs
description: Build and maintain Mintlify documentation sites for Kyberon projects. Use when creating docs pages, updating MDX content, configuring docs.json, adding components, setting up navigation, writing quickstart guides, or generating architecture diagrams. Triggers on mentions of "docs", "documentation", "mintlify", "MDX", "docs site".
license: Apache-2.0
compatibility: Requires Node.js for Mintlify CLI. Works with any Git-based workflow.
metadata:
  author: kyberon
  version: "1.0"
---

# Mintlify Documentation

Build and maintain Mintlify documentation sites following the Kyberon documentation standard. All Kyberon projects (Trailproof, Attesta, Memproof) share the same foundation with project-specific colors.

## Instructions

### Step 1: Understand the project

Read `docs/docs.json` to understand the current site structure, navigation, and theme. Identify which pages exist and which need to be created or updated.

### Step 2: Research existing content

Check the project's SPEC.md, README.md, and source code for accurate API signatures, types, and behavior. Never guess — always verify against the actual implementation.

### Step 3: Write pages

Follow the Kyberon page patterns documented in `references/page-patterns.md`. Every MDX file requires `title` frontmatter minimum. Show dual SDK examples (Python + TypeScript) for all code.

**Code Block Convention:**

Use `<CodeGroup>` to wrap Python + TypeScript code blocks into tabbed views:

```mdx
<CodeGroup>
```python Python
# Python code
```

```typescript TypeScript
// TypeScript code
```
</CodeGroup>
```

### Step 4: Update navigation

Add new pages to `docs.json` navigation. Use root-relative internal links without file extensions (e.g., `/quickstart` not `./quickstart.mdx`).

### Step 5: Verify

- Every MDX file has `title` frontmatter
- All code blocks have language tags
- Internal links use root-relative paths without extensions
- New pages are added to `docs.json` navigation
- No deprecated `mint.json` usage — always `docs.json`
- Dual SDK examples shown for all API code

## Kyberon Foundation

All Kyberon projects share:

- **Theme:** `maple`
- **Config:** `docs.json` (NOT `mint.json`)
- **Fonts:** Space Grotesk 700 (headings), Inter 400 (body)
- **Layout:** `sidenav`
- **Codeblocks:** `github-light` / `github-dark-dimmed`
- **Style:** Copy Attesta's `style.css` with project-specific color replacements

See `references/kyberon-style.md` for colors, style.css template, and logo conventions.
See `references/page-patterns.md` for page structure patterns.
See `references/component-reference.md` for Mintlify component usage.

## Project Color Palettes

| Project | Primary | Light | Dark | Dark BG |
|---------|---------|-------|------|---------|
| **Trailproof** | `#0EA5E9` | `#38BDF8` | `#0284C7` | `#1A1A1F` |
| **Attesta** | `#16A34A` | `#22C55E` | `#15803D` | `#1A1D1C` |
| **Memproof** | `#7C3AED` | `#A78BFA` | `#6D28D9` | `#1A1A1F` |

## Diagram Convention

Architecture diagrams use the same SVG style as Attesta's `attesta-flow.svg`:

- Dark slate gradient background with dot pattern
- Color-coded nodes with glow filters
- Animated dashed flow lines
- Step labels (STEP 1, STEP 2, etc.)
- Professional typography (Inter for body, Space Grotesk for headings)
- Embedded styles (no external dependencies)

See `references/diagram-style.md` for SVG template and conventions.

## Common Mistakes

- Do NOT use `<Frame>` for SVG diagrams — it adds an unwanted border/background container. Use `<img style={{ width: '100%', height: 'auto' }} />` instead
- Do NOT use `mint.json` — Mintlify v4+ uses `docs.json`
- Do NOT skip frontmatter — every page needs `title` minimum
- Do NOT use relative links with `.mdx` extension
- Do NOT omit `style.css` — the wider layout is part of the Kyberon brand
- Do NOT add colors outside the project palette

## Troubleshooting

### Error: Page not showing in navigation
Cause: Page not added to `docs.json` navigation.
Solution: Add the page path to the appropriate group in `docs.json`.

### Error: Mintlify CLI shows broken links
Cause: Using relative paths or `.mdx` extensions in links.
Solution: Use root-relative paths like `/quickstart`, not `./quickstart.mdx`.

### Error: Styles not applying
Cause: Missing `style.css` or incorrect color values.
Solution: Ensure `style.css` exists in `docs/` root with project-specific colors.
