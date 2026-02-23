# Mintlify Component Reference

## Callouts

```mdx
<Note>Informational note.</Note>
<Info>Additional context.</Info>
<Tip>Best practice recommendation.</Tip>
<Warning>Important warning or gotcha.</Warning>
<Check>Success or confirmation message.</Check>
```

## Cards

```mdx
<CardGroup cols={2}>
  <Card title="Title" icon="icon-name" color="#0EA5E9" href="/page">
    Card description text.
  </Card>
</CardGroup>
```

## Tabs

```mdx
<Tabs>
  <Tab title="Python">
    Content for Python tab.
  </Tab>
  <Tab title="TypeScript">
    Content for TypeScript tab.
  </Tab>
</Tabs>
```

## Accordions

```mdx
<Accordion title="Expandable section">
  Hidden content revealed on click.
</Accordion>

<AccordionGroup>
  <Accordion title="First">Content</Accordion>
  <Accordion title="Second">Content</Accordion>
</AccordionGroup>
```

## Steps

```mdx
<Steps>
  <Step title="First Step">
    Description of step 1.
  </Step>
  <Step title="Second Step">
    Description of step 2.
  </Step>
</Steps>
```

## Frames (for images/diagrams)

```mdx
<Frame>
  <img src="/images/diagram.svg" alt="Descriptive alt text" />
</Frame>
```

## CodeGroup

Wrap consecutive code blocks in different languages into a tabbed view. Language labels appear as tab titles.

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

The text after the language identifier (e.g., `Python` in ` ```python Python `) becomes the tab label. Without it, the tab shows the language name in lowercase.

## Code Blocks

Always include language tag:

````mdx
```python
code here
```

```typescript
code here
```

```bash
command here
```

```json
config here
```
````

## Tables

Standard markdown tables:

```mdx
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value    | Value    | Value    |
```

## Links

Internal: root-relative, no extension

```mdx
[Link text](/page-name)
[Link text](/folder/page-name)
```

External: full URL

```mdx
[Link text](https://example.com)
```
