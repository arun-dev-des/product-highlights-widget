# Product Highlights

An embeddable widget that surfaces key product facts — delivery, guarantee,
social proof, material, fit — across a merchant's product page.

One script, one payload. Each highlight **declares where it belongs** and the
widget renders it there: an inline list beside the buy action, a rating panel, a
badge on the product image, a persistent toast. Six layouts if a merchant wants
them somewhere else entirely.

**20.3 KB gzipped. No dependencies, no build step, everything inside shadow roots.**

[**Product page**](https://product-highlights-widget.vercel.app/design-starter/host-page.html) ·
[Dev harness](https://product-highlights-widget.vercel.app/dev/harness.html)

---

## What is here

| Path | |
|---|---|
| [`widget/product-highlights.js`](widget/product-highlights.js) | **The widget.** One vanilla ES module. This is the submission |
| [`design-starter/host-page.html`](design-starter/host-page.html) | The mock storefront. A theme panel on the right edge configures tokens and switches layout live |
| [`dev/harness.html`](dev/harness.html) | Twelve cases — every layout, content shape and failure mode, each stating what should be true |
| [`stress/`](stress/) | Seven host pages built to break it. Findings, including the unflattering ones, in [stress/README.md](stress/README.md) |
| [`react/`](react/) | The same widget on React 19 — a measurement, not the deliverable. [react/README.md](react/README.md) |
| [`docs/decisions/`](docs/decisions/) | Three ADRs for the load-bearing choices |

## Running it

```bash
python3 -m http.server 8080
```

Serve from the repository root. It is an ES module that fetches its content, so
opening the file from disk will not work. Nothing needs building; deployment is
the same story.

## Embedding it

```html
<div id="widget-slot"></div>

<script type="module" src="/widget/product-highlights.js"
        data-mount="#widget-slot"
        data-content="/design-starter/sample-content.json"></script>
```

Or drive it directly — `mount()` resolves to the host element, or `null` if
nothing rendered. It never throws.

```js
import { mount } from '/widget/product-highlights.js';

await mount('#widget-slot', {
  url: '/design-starter/sample-content.json',
  layout: 'compact',
  label: 'Why shop with us',
});
```

### Content

The demo payload is [`design-starter/sample-content.json`](design-starter/sample-content.json) —
the file the starter shipped, extended with the optional fields below. Three of
its five items, as they actually appear:

```json
{
  "productName": "Aster Merino Crew Knit",
  "highlights": [
    { "type": "shipping", "title": "Free 2-day delivery",
      "body": "Order before 4pm and it ships today. Free returns within 30 days.",
      "icon": "truck", "placement": "list" },

    { "type": "social_proof", "title": "Loved by 3,100+ buyers",
      "body": "Rated 4.8 out of 5. 94% of reviewers say it kept its shape after washing.",
      "icon": "star", "toastIcon": "avatars", "placement": "toast" },

    { "type": "material", "title": "100% traceable merino",
      "body": "Ethically sourced, mulesing-free wool. Naturally breathable and odour-resistant.",
      "icon": "leaf", "placement": "badge", "anchor": ".gallery" }
  ]
}
```

`title` is the only requirement. `placement` is `list` *(default)*, `rating`,
`toast` or `badge`. Also optional: `body`, `icon`, `anchor`, `rating`/`scale`,
`messages`, `toastIcon`.

**Every item always renders.** Anything that cannot be placed falls back to the
list — an anchor matching nothing, an invalid selector, a second item competing
for the toast, an unknown placement. The payload renders in full on any page,
however wrong the configuration.

### Layouts

| `layout` | |
|---|---|
| `distributed` *(default)* | The four placements above |
| `list` | One list, titles and bodies |
| `compact` | Two-column grid, mark above the text |
| `simple` | Three-column grid, titles only |
| `accordion` | Bodies behind a disclosure, one open at a time |
| `steps` | The accordion, cycling its rows on its own |

The five single-surface layouts are not a second rendering path: they turn the
other surfaces off and let the fallback rule above return their items to the
list. [ADR 0003 →](docs/decisions/0003-declared-placement.md)

### Theming

Nine optional custom properties, all with crafted defaults. They must be set on
the widget's **own elements**, not on an ancestor — the toast attaches to
`document.body` and the badge to your anchor, so neither inherits from the mount,
and `:root` loses to the widget's own `:host` declarations.

```css
#widget-slot, [data-product-highlights] {
  --hl-ink: #2b2b2b;           --hl-ink-muted: #6f675b;   --hl-border: #e4ddcf;
  --hl-surface: transparent;   --hl-surface-raised: #fff; --hl-shimmer: #8a5a1f;
  --hl-font: Georgia, serif;   --hl-radius: 4px;          --hl-space: 4px;
}
```

### The theme panel

A configurator that writes exactly the block above, live, and grades every colour
pair against WCAG AA as you go. Add it below the widget's own tag — it needs no
configuration, because it reads the mount and payload from that tag:

```html
<script type="module" src="/design-starter/theme-panel.js"></script>
```

It takes the widget's **module URL** from that tag too, rather than importing a
path of its own. A module's identity is its resolved URL, so a path differing by
so much as a cache-busting query would load the widget a second time — two
auto-mounts, two toasts, and a panel driving an instance the page never rendered.
For a page that mounts programmatically and has no tag to read, point it
explicitly with `data-panel-mount` and `data-panel-content`.

It asks the build what it can do rather than assuming. `mount` exports the
layouts it renders, and the panel offers exactly those — on the
[React page](design-starter/host-page-react.html), which ships the four
placements but not the layouts, theming works and the five layout controls are
shown disabled with the reason. A control that silently does nothing is worse
than one that says it cannot.

It is a merchant tool, **not part of the widget**: zero bytes in the bundle, and
deleting the tag removes it. The widget has no idea it exists — the panel only
sets the public custom properties, the same channel a stylesheet would use.

It is also where ADR 0002's contrast gate lives, because it is the only place it
*can*: custom properties are applied by the browser directly, so at that layer
there is nothing to intercept. A configurator is the first point in the cascade
where a value exists before it is used.
[ADR 0002 →](docs/decisions/0002-theming-and-native-feel.md)

---

## Decisions

The three load-bearing choices are argued in full in their own records — the
context, the alternatives rejected, and the consequences accepted:

- [**ADR 0001 — Style isolation**](docs/decisions/0001-style-isolation.md)
  Why every surface renders in its own shadow root, and what class prefixing and
  an iframe would each have cost. The claim is tested, not assumed:
  [stress page 01](stress/01-hostile-css.html) throws `!important` and element
  selectors at every generic class the widget uses.
- [**ADR 0002 — Theming and native feel**](docs/decisions/0002-theming-and-native-feel.md)
  The token contract, why the defaults are treated as the primary design work
  rather than as fallbacks, and why probing the host page for its palette was
  deliberately not built.
- [**ADR 0003 — Declared placement**](docs/decisions/0003-declared-placement.md)
  Four placements, why placement is declared rather than derived from `type`,
  and the fallback rule that every layout is built out of.

## With more time

- **Testing.** Visual regression across layouts and copy lengths, a screen reader
  pass, real devices rather than emulation.
- **An agent that reads the page.** Give a vision model the merchant's *rendered*
  storefront, let it infer palette, type and density from what a shopper actually
  sees, and have it drive the theme configurator to produce the token block. ADR
  0002 rejected runtime inference because probing the DOM cannot be tested across
  stores you have never seen and fails silently when it guesses wrong. Looking at
  the rendered page instead, and emitting a config a human approves before it
  ships, moves that guess out of the shopper's browser and into a step where
  being wrong is cheap.

## AI tools

Built with Claude throughout — implementation, structuring the ADRs, and as a
foil for design reasoning. Every line is understood and can be defended. Three
places where the reasoning was mine and the tool was wrong:

- The accordion was recommended as *the* design; I rejected it, and the static
  list is the better default. It ships as an optional layout, which is a
  different claim.
- A `Math.min(items.length, 3)` bug laid five items out in three columns. Caught
  by looking at the rendered page, not the code.
- The single-list architecture was argued for at length before I decided the
  content's differing roles warranted distinct placements. ADR 0003 records both
  sides.
