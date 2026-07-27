# Product Highlights

An embeddable widget that surfaces a handful of key product facts — delivery,
guarantee, social proof, material, fit — on an ecommerce product page.

It is 5 KB gzipped, has no dependencies and no build step, renders entirely
inside a shadow root, and is driven by a JSON payload supplied per merchant.

---

## Running it locally

The widget is an ES module and fetches its content, so it needs to be served
over HTTP. Opening the HTML file directly from disk will not work.

```bash
git clone <this-repo>
cd product-highlights-widget
python3 -m http.server 8080
```

Then open **http://localhost:8080/design-starter/host-page.html**

Any static server works — `npx serve`, `php -S`, whatever is to hand. Serve
from the repository root so that `/widget/` and `/design-starter/` are both
reachable.

## Embedding it

One script tag. It mounts itself into the element named by `data-mount`.

```html
<div id="highlights"></div>

<script type="module"
        src="/widget/product-highlights.js"
        data-mount="#highlights"
        data-content="/highlights.json"></script>
```

Or drive it directly, if the content is already on the page:

```js
import { mount } from '/widget/product-highlights.js';

await mount('#highlights', {
  content: { highlights: [ /* … */ ] },
  label: 'Why shop with us',      // optional accessible name
});
```

`mount()` resolves to the host element, or to `null` if nothing was rendered.
It never throws.

### Theming

Nine optional CSS custom properties. Set them on the mount element from the
merchant's own stylesheet; no knowledge of the widget's internals is required.

```css
#highlights {
  --hl-ink: #2b2b2b;          /* primary text            */
  --hl-ink-muted: #6f675b;    /* supporting text         */
  --hl-border: #e4ddcf;       /* hairlines               */
  --hl-surface: transparent;  /* background              */
  --hl-font: Georgia, serif;  /* type family             */
  --hl-radius: 4px;           /* corner radius           */
  --hl-space: 4px;            /* base spacing unit       */
  --hl-accent: #2b2b2b;       /* interactive accent      */
  --hl-surface-muted: #faf8f4;/* secondary fill          */
}
```

### Content format

```json
{
  "highlights": [
    {
      "type": "shipping",
      "title": "Free 2-day delivery",
      "body": "Order before 4pm and it ships today. Free returns within 30 days.",
      "icon": "truck"
    }
  ]
}
```

Only `title` is required. `body` is optional — an item without one renders as a
title-only row. `icon` accepts `truck`, `shield`, `star`, `leaf`, `ruler`;
anything unrecognised falls back to a neutral glyph. `type` is currently unused
by the renderer and is preserved for merchant-side categorisation.

---

## Design decisions

### The content is a list of objections, not a list of features

The five facts in the sample payload map one-to-one onto the five reasons
somebody hesitates before buying a $148 knit: *will it arrive in time, what if
it's faulty, is it actually good, is it worth the money, will it fit.* That
reframing drove everything else — the widget is positioned at the decision
point, sized to be scanned rather than read, and written to be finished with
quickly.

### Everything is visible; there is nothing to expand, swipe, or dismiss

The earlier draft was an accordion. It was removed.

Five items averaging 72 characters of body copy is roughly fifteen lines of
text. It fits. Hiding it behind a disclosure control charged the shopper a
click to reach the most useful sentence in the payload — *"Runs slightly long
in the sleeve"* — in exchange for a slightly shorter resting state.

The brief asks for interaction that is purposeful and *"never gratuitous."* An
interaction that exists so that there is an interaction is the definition of
gratuitous. Shopper-controlled pacing, taken seriously, means the shopper reads
what they want in the order they want at the speed they want — and the purest
form of that is putting it all on the page.

This also removed a great deal of accessibility surface: no `aria-expanded`, no
`aria-controls`, no regions, no keyboard model, no focus management. What
remains is a list, marked up as a list.

### Sequential forms were rejected on the shape of the data

The five facts have no inherent order — nothing depends on reading shipping
before fit. A carousel or stories sequence would impose an order the content
does not have, and force a shopper worried about sizing to move past four
irrelevant panels to reach the one that concerns them. Sequential presentation
is honest only when the content is sequential.

### Layout adapts to how much content there is

Two or three items sit side by side where there is room; four or more stack.
This is one declarative CSS rule driven by a `data-cols` attribute, not
imperative layout branching — the grid also reflows to a single column on
narrow viewports without a second code path.

### It reads as a section of the page, not a component on it

Hairlines above and below rather than a bordered box, and no horizontal padding
— so the text aligns with the host page's own left edge. Type, palette, radius
and rhythm are taken from the host page's stylesheet: Georgia, `#e4ddcf`
hairlines, a `4px` radius, generous line-height.

Hierarchy is carried by **size and colour rather than weight**, because
Georgia's bold is heavy and dates the type badly at this size. 16px `#2b2b2b`
title over 14.5px `#6f675b` body.

### The only motion is a staggered entrance

Items rise 6px and fade in, 60ms apart, once, when the list first scrolls into
view. Its purpose is to lead the eye down the column in reading order. It never
repeats, and under `prefers-reduced-motion` it does not run at all — the content
is simply present.

---

## Technical decisions

### Stack: none

Vanilla JavaScript, one ES module, no dependencies, no build step. **12.5 KB
raw, 5.0 KB gzipped, unminified.**

A framework was considered and rejected on fit. This is third-party code that
runs on other people's storefronts; every kilobyte is spent from a budget that
belongs to the merchant, on a page whose conversion rate is their livelihood.
React would have been roughly ten times the payload for a component that
renders once and never re-renders. There is no state to manage, no reconciler
to benefit from, and no ecosystem dependency worth taking on. The whole render
is one pass over an array.

### Style isolation: Shadow DOM

Fully argued in [ADR 0001](docs/decisions/0001-style-isolation.md).

The host page claims `.card`, `.title`, `.btn` and `.container` — some of the
most collision-prone class names on the web. The risk runs both ways, and the
outbound direction is the serious one: a widget that defines `.card` would
silently restyle the merchant's add-to-cart container, shipping a visual
regression into a live checkout path.

An open shadow root makes that structurally impossible rather than merely
unlikely. Class prefixing was rejected because it only defends against
*class-name* collisions, leaving element selectors, `* { box-sizing }`, resets
and `!important` untouched — and because it relies on discipline rather than a
mechanism. An iframe was rejected on fit: it cannot overflow its own box,
requires manual height synchronisation, and cannot inherit typography.

Shadow DOM blocks selector matching, **not inheritance** — `body { font-family:
Georgia }` would otherwise flow straight in. `all: initial` on `:host` severs
that, after which every value inside the widget is one that was chosen.

### Theming: declared, never inferred

Fully argued in [ADR 0002](docs/decisions/0002-theming-and-native-feel.md).

Nine CSS custom properties, which cross the shadow boundary by design. Runtime
inference — probing the host with `getComputedStyle` to guess its palette — was
deliberately not built: it cannot be tested across stores you have never seen,
it depends on webfont timing, it forces style recalculation, and it can pair an
inherited dark surface with default dark ink and produce unreadable text.

The defaults are treated as the primary design work rather than as fallbacks,
because most merchants will never configure anything.

### Keeping it light

- No dependencies, no bundler, no polyfills.
- Inline SVG icons: no icon font, no sprite request, no FOUT. All drawn on one
  24px grid at a single 1.35 stroke weight so they carry equal optical weight.
- Constructable stylesheets (`adoptedStyleSheets`) so the CSS is parsed once and
  shared across instances, with a `<style>` fallback for older engines.
- One pass over the array, one DOM insertion. No re-render path exists.
- The mount point stays empty until content resolves. Space is deliberately not
  reserved: if the payload fails, reserving space would leave a permanent hole
  in the merchant's page. Passing `content` directly instead of `url` renders
  synchronously with no shift at all.

### Failing safe

A third-party widget has no business taking a merchant's page down with it.

- `normalise()` reduces arbitrary input to items that are known to render.
  Anything unexpected is **dropped, not repaired and not thrown on**.
- Items without a `title` are skipped; a missing `body` renders a title-only
  row; an unrecognised `icon` name falls back to a neutral glyph.
- Zero renderable items renders **nothing at all** — no empty box, no stray
  rule. The page is left exactly as it was found.
- The entire mount is wrapped: a network failure, a 404, malformed JSON or a
  payload that is not an object results in one `console.warn` and no output.
- All text is assigned through `textContent`. Merchant content is never parsed
  as markup. `innerHTML` is used only for the widget's own icon strings.
- The entrance animation renders content **visible first**, and only hides it
  once both `IntersectionObserver` and motion permission are confirmed. A failed
  observer leaves the text on screen. Content you might not be able to reveal is
  never hidden.

### Accessibility

- A real `<ul>` / `<li>`, so assistive technology announces the set and its
  length before reading through it.
- Icons are `aria-hidden`; every icon's meaning is carried by adjacent text.
- The list carries an accessible name, overridable via `data-label`.
- `prefers-reduced-motion` is respected — the entrance does not run.
- A `forced-colors` block keeps the hairlines visible in Windows high contrast.
- No custom keyboard model, because there are no controls. Nothing is
  focusable, nothing is hidden, nothing can trap focus.

---

## A note on the host page

The mock page's product gallery distorts once the details column grows taller
than the image. This is a pre-existing conflict in its own stylesheet:
`.gallery` sets `aspect-ratio: 4/5`, but as a grid item it defaults to
`align-items: stretch`, so its height is set by the row rather than by the
ratio. Any added content triggers it — a longer description or a size selector
would do the same.

Fixed in the demo page with `align-items: start` on `.product`, commented in
place. The widget needs no change and renders correctly either way. On a real
merchant's store this would be reported rather than patched.

---

## With more time

- **Contrast validation.** ADR 0002 specifies a WCAG AA gate on merchant-supplied
  colour. It is unimplemented, because theming currently flows through CSS custom
  properties, which the browser applies directly with nothing to intercept. It
  becomes necessary the moment a `theme` object is accepted in the payload.
- **A `theme` block in the content payload**, so non-technical merchants can
  configure the widget without touching CSS.
- **Platform integrations.** On a themed platform the merchant's design tokens
  can be read directly and injected server-side as custom properties, which is
  strictly better than inferring them. The generic script tag remains the path
  most stores would take, so it stays the one that has to be excellent.
- **Dark mode** via `prefers-color-scheme`. The token contract already
  accommodates it without structural change.
- **An optional `placement` hint per item**, so a merchant can distribute
  highlights across their page. Deriving placement from `type` was rejected —
  it hardcodes assumptions about markup that has never been seen.
- **Testing.** Visual regression across item counts and copy lengths, a screen
  reader pass, and real device testing rather than emulation.
- **A non-module build** for stores that cannot use `type="module"`.
- **A larger icon set**, and a way for merchants to supply their own.

---

## AI tools

This was built with Claude (Claude Code) used throughout: for implementation,
for structuring the architecture decision records, and as a foil for design
reasoning — the accordion-versus-static-list decision in particular was argued
out and reversed in that conversation.

Every line here is understood and can be explained and defended. Two examples
of where the reasoning was mine and the tool was wrong: the accordion was
originally recommended and I rejected it, and the `data-cols` bug that laid five
items out in three columns was caught by looking at the rendered page, not by
the code that produced it.

---

## Layout

```
widget/product-highlights.js     the widget — one file, no dependencies
design-starter/host-page.html    mock merchant product page
design-starter/sample-content.json   sample content payload
docs/decisions/                  architecture decision records
```
