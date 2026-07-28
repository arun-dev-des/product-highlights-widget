# Product Highlights

An embeddable widget that surfaces key product facts — delivery, guarantee,
social proof, material, fit — across a merchant's product page.

One script, one payload. Each highlight **declares where it belongs** and the
widget renders it there: an inline list beside the buy action, a rating panel, a
badge on the product image, a persistent toast. Six layouts if a merchant wants
them somewhere else entirely.

**20.4 KB gzipped. No dependencies, no build step, everything inside shadow roots.**

[**Product page**](https://product-highlights-widget.vercel.app/design-starter/host-page.html) ·
[Dev harness](https://product-highlights-widget.vercel.app/dev/harness.html)

---

## What is here

| Path | |
|---|---|
| [`widget/product-highlights.js`](widget/product-highlights.js) | **The widget.** One vanilla ES module. This is the submission |
| [`design-starter/host-page.html`](design-starter/host-page.html) | The mock storefront. A theme panel on the right edge configures tokens and switches layout live |
| [`design-starter/theme-panel.js`](design-starter/theme-panel.js) | **A merchant tool, not part of the widget.** It writes the token block live and grades every colour pair against WCAG AA. Its own 12.4 KB is not in the 20.4 KB above, and deleting its script tag removes it entirely |
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

![The six layouts, each rendered from the same payload](docs/images/layouts.png)

*The same five items through every layout, captured from
[`dev/harness.html`](dev/harness.html). `distributed` shows its list surface here;
its badge and toast sit elsewhere on the page, as in the screenshot below.*

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

![The theme configurator open on the mock storefront](docs/images/theme-configurator.png)

*The panel open on [`design-starter/host-page.html`](design-starter/host-page.html).
Behind it, the `distributed` layout in full: the badge on the product image, the
list beside the buy action, the toast pinned to the viewport. **Legibility** grades
only the pairs the selected layout actually renders; **Output** is the CSS block,
ready to copy.*

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

## Design decisions

**The highlights go where the question is asked.**

A shopper on a product page is not reading a feature list. They are working
through a small set of hesitations, and each one has a place on the page where
it naturally comes up. Delivery, guarantee and fit are answers to *should I buy
this*, so they sit with the buy action. Traceable merino is a claim about the
thing itself, so it sits on the product image. Social proof is the one item that
earns an interruption, so it takes a persistent pill the shopper can leave up or
dismiss.

Five equivalent rows under the button would have asserted that all five are the
same kind of fact. They are not — and the column ran past the image, which is
the point at which the page stops reading as one composition.

**Nothing takes the pace out of the shopper's hands.**

- The list is static. Everything is readable in one pass, with no control to
  operate and nothing to wait for.
- The toast is permanent and never dismisses on a timer. It holds the current
  line while a pointer is over it or focus is inside it, and each line's dwell is
  set by its own length rather than a fixed interval, so a long sentence is not
  swapped out before it can be read.
- `steps`, the only self-advancing layout, hands the list over permanently on the
  first click or key press. A shopper who touches it is not fighting the
  animation for control afterwards.
- Motion serves orientation, not decoration: rows rise once, on entry, when the
  widget comes into view. Reduced motion removes the movement, not the content —
  everything still appears, it simply arrives rather than rises.

**The semantics are structural, not applied afterwards.** The list is a real
`<ul>` with an accessible name, so its length is announced before it is read
through. Accordion rows are `<button>`s carrying `aria-expanded` and
`aria-controls`. The score is a single `role="img"` labelled *Rated 4.8 out of
5*, with the numeral and stars marked decorative so it is not read three times.
The toast keeps every line in the DOM at once and read in order, because the
rotation is a visual treatment rather than a change of content. `all: initial`
takes the UA focus ring with it, so it is put back explicitly.

## Technical decisions

**Stack — a vanilla ES module. No dependencies, no build step.** This runs on
other people's pages, so the unit that matters is not download but main-thread
time before the *merchant's* first paint, against Core Web Vitals that are
theirs and not ours. I built the same widget on React 19 and Motion to price the
alternative rather than assert it: **112.6 kB gzipped against 20.4 kB**, of which
~98 kB is fixed framework overhead that buys a shopper nothing. The framework
bought real things — drag-to-dismiss, one clock driving both the rotation and its
indicator, ~80 lines of measurement code deleted — and none of them are worth
98 kB on a stranger's product page. The measurement, including where it flatters
the vanilla build, is in [react/README.md](react/README.md).

**Isolation — a shadow root per surface, `all: initial` on each `:host`.** The
mock page's class names are exactly the collision the brief points at: `.card`,
`.title`, `.details`. Prefixing only avoids the collisions I remember to prefix,
and does nothing at all about the host's own `p` and `ul` rules reaching my
elements. Shadow DOM makes the guarantee structural and bidirectional — nothing
of the host's reaches in, nothing of mine leaks out. The cost is accepted rather
than waved away: no global stylesheet and no `:root` tokens, which is why there
is no Tailwind here. [ADR 0001 →](docs/decisions/0001-style-isolation.md)

**Light — one file, 20.4 kB gzipped, no dependencies to audit and nothing to
build at deploy time.** The entrance is gated behind an IntersectionObserver, so
nothing animates until the widget is on screen, and the toast's rotation stops
outright while the tab is in the background.

**Fails safe — the page is never worse for the widget being on it.** `mount()`
never throws; it warns and resolves `null`. The payload passes through one
normaliser that drops what it does not recognise rather than repairing it, so
nothing downstream re-validates. Anything that cannot be placed falls back to the
list, so the payload renders in full however wrong the configuration. Nothing
renderable means nothing rendered — no empty box, no reserved space. And every
effect that hides text carries a backstop: a 1600 ms timer behind the entrance
observer, a timer as well as `animationend` behind the shimmer, and a
`CSS.supports` check before the sweep is applied at all. Text hidden pending an
animation must never depend on that animation arriving. Seven
[stress pages](stress/) and twelve [harness cases](dev/harness.html) exist to
hold that claim to account.

## The records

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
