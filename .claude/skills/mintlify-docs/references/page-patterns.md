# Page Patterns

## MDX Frontmatter

Every page starts with:

```mdx
---
title: "Page Title"
description: "One-line description for SEO and navigation"
icon: "icon-name"    # optional, for nav sidebar
---
```

## Introduction Page

Structure (matches Attesta's introduction.mdx):

1. `<Warning>` or `<Note>` for early release notice
2. `<Note>` with product tagline
3. `## The Problem` — bullet list or comparison table
4. `## How [Product] Solves This` — architecture diagram as `<img>` with `style={{ width: '100%', height: 'auto' }}`
5. `## Core Pillars` — `<CardGroup cols={2}>` with 4 feature cards using `color` prop
6. `## Quick Example` — code blocks showing the API
7. `## Next Steps` — `<CardGroup cols={2}>` linking to key pages

## Quickstart Page

1. Installation (pip/npm)
2. Numbered steps: `## 1. Create Instance`, `## 2. Emit Events`, etc.
3. Each step has Python + TypeScript code blocks
4. `<Note>`, `<Warning>`, `<Tip>` callouts for important details
5. `## Next Steps` — `<CardGroup cols={2}>`

## Concept Pages

1. Frontmatter with title + description
2. `# Title` with overview paragraph
3. `<Note>` callout for key context
4. Main content with `##` sections
5. Code examples showing relevant behavior
6. `<Tip>` for recommendations
7. `## Next Steps` card group

## API Reference Pages

1. Method signature as code block
2. Parameters documented inline (not ParamField)
3. Return type documentation
4. Code examples for Python + TypeScript
5. Error cases
6. `<Warning>` for important behavior notes

## Guide Pages

1. Opening paragraph explaining what you'll learn
2. Step-by-step with code
3. Edge cases in `<Warning>` or `<Note>`
4. `<Tip>` for production best practices
5. `## Next Steps` card group

## Code Block Convention

Wrap Python and TypeScript pairs in `<CodeGroup>` for tabbed views. Add language labels after backticks:

```mdx
<CodeGroup>
```python Python
from trailproof import Trailproof
tp = Trailproof()
```

```typescript TypeScript
import { Trailproof } from "@kyberonai/trailproof";
const tp = new Trailproof();
```
</CodeGroup>
```

Standalone blocks (bash, json, single-language) do NOT get wrapped in CodeGroup.

## Callouts

```mdx
<Note>Informational — "good to know" context.</Note>
<Warning>Important — gotchas or breaking changes.</Warning>
<Tip>Best practice — recommendations.</Tip>
```

## Cards

Feature highlight cards with `color` prop matching project palette:

```mdx
<CardGroup cols={2}>
  <Card title="Feature" icon="icon-name" color="#0EA5E9">
    Description of the feature.
  </Card>
</CardGroup>
```

Navigation cards with `href`:

```mdx
<CardGroup cols={2}>
  <Card title="Page" icon="icon-name" color="#0EA5E9" href="/page">
    Description.
  </Card>
</CardGroup>
```

## Writing Style

- Concise — one idea per paragraph
- Action-oriented — start guides with what the reader will accomplish
- Code-first — show code before explaining it
- Dual SDK — always show both Python and TypeScript
- Present tense — "Trailproof creates" not "will create"
- Em dashes — use `—` for em dashes
