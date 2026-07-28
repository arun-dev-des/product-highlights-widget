# Product Highlights

An embeddable widget that surfaces key product facts — delivery, guarantee,
social proof, material, fit — across a merchant's product page.

One script, one payload. Each highlight **declares where it belongs** and the
widget renders it there: an inline list beside the buy action, a rating panel, a
badge on the product image, a persistent toast. Six layouts if a merchant wants
them somewhere else entirely.

**20.3 KB gzipped. No dependencies, no build step, everything inside shadow roots.**

[**Product page**](https://product-highlights-widget.vercel.app/design-starter/host-page.html) ·
[Dev harness](https://product-highlights-widget.vercel.app/dev/harness.html) ·
[Stress suite](https://product-highlights-widget.vercel.app/stress/) ·
[React variant](https://product-highlights-widget.vercel.app/design-starter/host-page-react.html)

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
<div id="highlights"></div>

<script type="module" src="/widget/product-highlights.js"
        data-mount="#highlights" data-content="/highlights.json"></script>
```

Or drive it directly — `mount()` resolves to the host element, or `null` if
nothing rendered. It never throws.

```js
import { mount } from '/widget/product-highlights.js';
await mount('#highlights', { content, layout: 'compact', label: 'Why shop with us' });
```

### Content

```json
{ "highlights": [
  { "title": "Free 2-day delivery", "body": "Order before 4pm…", "icon": "truck" },
  { "title": "100% traceable merino", "icon": "leaf", "placement": "badge", "anchor": ".gallery" }
]}
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
#highlights, [data-product-highlights] {
  --hl-ink: #2b2b2b;           --hl-ink-muted: #6f675b;   --hl-border: #e4ddcf;
  --hl-surface: transparent;   --hl-surface-raised: #fff; --hl-shimmer: #8a5a1f;
  --hl-font: Georgia, serif;   --hl-radius: 4px;          --hl-space: 4px;
}
```

### The theme panel

A configurator that writes exactly the block above, live, and grades every colour
pair against WCAG AA as you go. Add it with one tag — it needs no attributes if
your mount is `#widget-slot`:

```html
<script type="module" src="/design-starter/theme-panel.js"
        data-panel-mount="#highlights"
        data-panel-content="/highlights.json"></script>
```

It is a merchant tool, **not part of the widget**: zero bytes in the bundle, and
deleting the tag removes it. The widget has no idea it exists — the panel only
sets the public custom properties, the same channel a stylesheet would use.
Keep it beside `widget/`, since it imports the module by relative path.

It is also where ADR 0002's contrast gate lives, because it is the only place it
*can*: custom properties are applied by the browser directly, so at that layer
there is nothing to intercept. A configurator is the first point in the cascade
where a value exists before it is used.
[ADR 0002 →](docs/decisions/0002-theming-and-native-feel.md)

---

## Design decisions

**A list of objections, not of features.** The five facts map one-to-one onto the
five reasons somebody hesitates before buying a $148 knit. The widget sits at the
decision point and is sized to be scanned rather than read.

**Everything is visible by default.** An accordion was drafted and removed:
fifteen lines of text fit, and hiding them charged a click to reach the most
useful sentence in the payload. It ships as a *layout* for payloads that do not
fit — the argument was about the default, not the capability.

**Four placements, because the items are not peers.** Delivery and fit answer
purchase hesitation; a material is a product attribute; a score wants a panel
built for a score. Rendering them identically treated content with different
roles as though it had one. [ADR 0003 →](docs/decisions/0003-declared-placement.md)

**Placement is declared, never derived from `type`.** `type === 'material'` →
image corner is a guess about markup we have never seen. The merchant knows where
their product image is; we never do. [ADR 0003 →](docs/decisions/0003-declared-placement.md)

**It reads as part of the page, not a component on it.** Hairlines instead of a
box, no horizontal padding, and type, palette and rhythm taken from the host
page's own stylesheet. Hierarchy comes from size and colour rather than weight,
because Georgia's bold dates the type at this size.

**Motion has three jobs.** The list staggers in once to lead the eye down the
column; the badge fades down so it reads as arriving; a warm sweep crosses the
toast's first line, linear on purpose because a travelling light moves at a
constant speed. Reduced motion suppresses the entrance and the sweep entirely.

## Technical decisions

**No framework.** Third-party code on someone else's storefront spends every
kilobyte from the merchant's budget, and there is no state to manage — the whole
render is one pass over an array. Measured, not asserted:
[`react/`](react/README.md) is the same widget on React 19 at **112.6 KB gzipped
against 20.3 KB**, and none of the difference is widget code.

**Shadow DOM for isolation.** The host page claims `.card`, `.title` and `.btn`;
a widget defining `.card` would ship a visual regression into a live checkout
path. Class prefixing defends against class collisions only, and relies on
discipline rather than a mechanism. [ADR 0001 →](docs/decisions/0001-style-isolation.md)

**Theming is declared, never inferred.** Probing the host with
`getComputedStyle` cannot be tested across stores you have never seen, depends on
webfont timing, and can pair an inherited dark surface with default dark ink to
produce unreadable text. [ADR 0002 →](docs/decisions/0002-theming-and-native-feel.md)

**Two deliberate writes to the host page.** The toast is appended to
`document.body`, because `position: fixed` resolves against any transformed
ancestor rather than the viewport. The badge sets `position: relative` on its
anchor, and only when the computed position is `static`.
[ADR 0003 →](docs/decisions/0003-declared-placement.md)

**Failing safe.** `normalise()` reduces arbitrary input to items known to render,
dropping anything unexpected rather than repairing it. A 404, malformed JSON or a
payload of the wrong shape produces one `console.warn` and no output. All text is
assigned through `textContent`. [Findings →](stress/README.md)

**Content hidden pending an animation never depends on that animation arriving.**
The list is hidden only after an `IntersectionObserver` is attached, and a 1600ms
backstop reveals it regardless. *This was a real bug, caught by screenshotting
the rendered page rather than by reading the code.*

## Accessibility

A real `<ul>`, so the set and its length are announced before it is read through.
Icons are `aria-hidden` and every icon's meaning is carried by adjacent text.
Accordion headers are real `<button>`s with `aria-expanded`, and a row with
nothing to reveal is not a control. The toast is dismissible by click or Escape
and is never hidden from assistive technology, because it is the only place its
content appears. `prefers-reduced-motion` and `forced-colors` are handled on
every surface.

## With more time

- **A focusable toast.** It dismisses on click and Escape but is not in the tab
  order — the one keyboard gap the widget has.
- **A `theme` block in the payload**, so non-technical merchants configure
  without touching CSS. The contrast gate in ADR 0002 becomes enforceable the
  moment that exists.
- **Dark mode** via `prefers-color-scheme`. The token contract already
  accommodates it.
- **A badge that validates its anchor.** The fallback protects against *absent*
  anchors, not *unwise* ones.
- **Testing.** Visual regression across layouts and copy lengths, a screen reader
  pass, real devices rather than emulation.

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
