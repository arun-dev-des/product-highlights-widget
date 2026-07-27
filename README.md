# Product Highlights

An embeddable widget that surfaces key product facts — delivery, guarantee,
social proof, material, fit — across a merchant's product page.

One script, one payload, four presentations. Each highlight declares where it
belongs and the widget renders it there: an inline list beside the buy action, a
rating panel with a score and stars, a badge on the product image, and a
transient toast for the item worth a moment of attention.

11.8 KB gzipped, no dependencies, no build step, everything inside shadow roots.

---

## Running it locally

The widget is an ES module and fetches its content, so it needs to be served
over HTTP. Opening the HTML file directly from disk will not work.

```bash
git clone <this-repo>
cd product-highlights-widget
python3 -m http.server 8080
```

- **Demo product page** — http://localhost:8080/design-starter/host-page.html
- **Dev harness** — http://localhost:8080/dev/harness.html

Serve from the repository root so `/widget/` and `/design-starter/` are both
reachable. Any static server works.

The harness mounts the payload six ways — full, three items, one item, ragged
content, an empty array, a malformed array — and states what each should do, so
a wrong result is obvious. It also replays the toast, including at quarter speed.

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
  label: 'Why shop with us',   // optional accessible name for the list
  toast: false,                // optional: keep toast items in the list
  badges: false,               // optional: keep badge items in the list
  rating: false,               // optional: keep the rating item in the list
});
```

`mount()` resolves to the host element, or to `null` if nothing was rendered. It
never throws.

### Content format

```json
{
  "highlights": [
    {
      "type": "shipping",
      "title": "Free 2-day delivery",
      "body": "Order before 4pm and it ships today. Free returns within 30 days.",
      "icon": "truck",
      "placement": "list"
    },
    {
      "type": "material",
      "title": "100% traceable merino",
      "body": "Ethically sourced, mulesing-free wool.",
      "icon": "leaf",
      "placement": "badge",
      "anchor": ".gallery"
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Items without one are skipped |
| `body` | no | Absent renders a title-only row |
| `icon` | no | `truck`, `shield`, `star`, `leaf`, `ruler`, `avatars`; anything else falls back to a neutral glyph |
| `placement` | no | `list` *(default)*, `rating`, `toast`, `badge` |
| `anchor` | for `badge` | A CSS selector on the host page |
| `rating` / `scale` | for `rating` | Numbers, not prose. Stars are drawn from these; `scale` defaults to 5 |
| `messages` | no | Extra lines the toast cycles through after its title |
| `type` | no | Unused by the renderer; preserved for merchant-side categorisation |

**Every item always renders.** Anything that cannot be placed falls back to the
list — a selector that matches nothing, an invalid selector, a second item
competing for the toast or the rating panel, a `rating` placement with no usable
score, an unrecognised placement, a suppressed surface. The payload renders in
full on any page, however wrong the configuration.

The score is **structured data, never parsed out of the sentence beside it.**
`"Rated 4.8 out of 5"` is prose; a regex over prose breaks on `4,8`, on `4.8/5`,
on a merchant who spells it out. Same failure class as deriving placement from
`type` — inferring structure that was never declared. The star fill is honest as
a result: 4.8 of 5 renders as four and four-fifths stars, not rounded up.

### Theming

Nine optional CSS custom properties, shared across every shadow root. Set them
on the mount element from the merchant's own stylesheet; no knowledge of the
widget's internals is required.

```css
#highlights {
  --hl-ink: #2b2b2b;           /* primary text                   */
  --hl-ink-muted: #6f675b;     /* supporting text                */
  --hl-border: #e4ddcf;        /* hairlines                      */
  --hl-surface: transparent;   /* list background                */
  --hl-surface-raised: #fff;   /* toast and badge background     */
  --hl-shimmer: #8a5a1f;       /* peak colour of the toast sweep */
  --hl-font: Georgia, serif;   /* type family                    */
  --hl-radius: 4px;            /* corner radius                  */
  --hl-space: 4px;             /* base spacing unit              */
}
```

---

## Design decisions

### The content is a list of objections, not a list of features

The five facts map one-to-one onto the five reasons somebody hesitates before
buying a $148 knit: *will it arrive in time, what if it's faulty, is it actually
good, is it worth the money, will it fit.* That reframing drove everything — the
widget sits at the decision point, is sized to be scanned rather than read, and
is written to be finished with quickly.

### Everything is visible; nothing is expandable, swipeable or dismissable

An early draft was an accordion. It was removed.

Five items averaging 72 characters of body copy is roughly fifteen lines of text.
It fits. Hiding it behind a disclosure control charged the shopper a click to
reach the most useful sentence in the payload — *"Runs slightly long in the
sleeve"* — in exchange for a slightly shorter resting state.

The brief asks for interaction that is purposeful and *"never gratuitous."* An
interaction that exists so that there is an interaction is the definition of
gratuitous. Shopper-controlled pacing, taken seriously, means reading what you
want in the order you want at the speed you want — and the purest form of that is
putting it all on the page.

This also removed a great deal of accessibility surface: no `aria-expanded`, no
`aria-controls`, no regions, no keyboard model, no focus management. What remains
is a list, marked up as a list.

### Sequential forms were rejected on the shape of the data

The facts have no inherent order — nothing depends on reading shipping before
fit. A carousel or stories sequence would impose an order the content does not
have, and force a shopper worried about sizing past four irrelevant panels to
reach the one that concerns them. Sequential presentation is honest only when the
content is sequential.

### Four placements, because the items are not peers

Fully argued in [ADR 0003](docs/decisions/0003-declared-placement.md).

Delivery, guarantee and fit answer purchase hesitation, so they sit beside the
buy action. *Traceable merino* is a product attribute, so it badges the product
image. The rating is a score, so it gets a panel built for a score. *Loved by
3,100+ buyers* is social proof, so it gets a moment of its own. Rendering all of
them as identical rows treated content with different roles as though it had one,
and pushed the details column well past the product image.

Placement is **declared in the payload, never derived from `type`** — the
merchant knows where their product image is and we never do. `type === 'material'
→ image corner` is a guess about markup we have not seen.

### It reads as part of the page, not a component on it

The list uses hairlines above and below rather than a box, with no horizontal
padding, so its text aligns with the host page's own left edge. Type, palette,
radius and rhythm are taken from the host page's stylesheet: Georgia, `#e4ddcf`
hairlines, a `4px` radius, generous line-height.

Hierarchy is carried by **size and colour rather than weight**, because Georgia's
bold is heavy and dates the type badly at this size. 16px `#2b2b2b` title over
14.5px `#6f675b` body.

The toast and badge deliberately break from this — a larger radius, a raised
surface, a shadow — because they float above the page rather than sitting in it.

### Motion

Three moments, each with a job:

- **The list staggers in** once as it scrolls into view, 60ms apart, to lead the
  eye down the column in reading order.
- **The badge fades down** shortly after, so it is noticed as arriving rather than
  as having always been there.
- **A warm sweep crosses the toast's first line** once, left to right over 850ms.
  The easing is **linear on purpose**: an eased curve makes the highlight race
  across the words and then crawl, so most of the duration renders no visible
  change. A travelling light moves at a constant speed.
- **The toast then scrolls up through its messages, continuously.** It is a
  standing statement of social proof rather than a notification, so it stays.
  The rotator is locked to its widest and tallest line before the frames leave
  the flow, so the pill never resizes mid-turn, and each line's dwell scales with
  its length (2.4s–6.5s) so a long sentence is not swapped out before it can be
  read.

  Perpetual motion on someone else's page has to earn its keep, so it pauses on
  hover and on focus, pauses entirely while the tab is hidden, and is dismissible
  by click or Escape — which removes the element rather than hiding it.

Under `prefers-reduced-motion` the entrance, stagger and sweep do not run at all.
The toast still rotates, but crossfades in place rather than travelling: it is
the only surface carrying those lines, and suppressing the rotation would put the
second one out of reach. Reduced motion asks for less movement, not less content.

---

## Technical decisions

### Stack: none

Vanilla JavaScript, one ES module, no dependencies, no build step. **35 KB raw,
11.8 KB gzipped, unminified.**

A framework was considered and rejected on fit. This is third-party code running
on other people's storefronts; every kilobyte is spent from a budget belonging to
the merchant, on a page whose conversion rate is their livelihood. React would
have been roughly five times the payload for something that renders once and
never re-renders. There is no state to manage and no reconciler to benefit from.
The whole render is one pass over an array.

### Style isolation: Shadow DOM

Fully argued in [ADR 0001](docs/decisions/0001-style-isolation.md).

The host page claims `.card`, `.title`, `.btn` and `.container` — some of the most
collision-prone class names on the web. The risk runs both ways, and the outbound
direction is the serious one: a widget defining `.card` would silently restyle
the merchant's add-to-cart container, shipping a visual regression into a live
checkout path.

Each of the three surfaces renders in its own open shadow root, which makes that
structurally impossible rather than merely unlikely. Class prefixing was rejected
because it defends only against *class-name* collisions, leaving element
selectors, `* { box-sizing }`, resets and `!important` untouched — and because it
relies on discipline rather than a mechanism. An iframe was rejected on fit: it
cannot overflow its own box, needs manual height synchronisation, and cannot
inherit typography.

Shadow DOM blocks selector matching, **not inheritance** — `body { font-family:
Georgia }` would otherwise flow straight in. `all: initial` on each `:host` severs
that, after which every value inside the widget is one that was chosen.

### Theming: declared, never inferred

Fully argued in [ADR 0002](docs/decisions/0002-theming-and-native-feel.md).

Custom properties cross the shadow boundary by design, so one token block serves
all three surfaces. Runtime inference — probing the host with `getComputedStyle`
to guess its palette — was deliberately not built: it cannot be tested across
stores you have never seen, it depends on webfont timing, it forces style
recalculation, and it can pair an inherited dark surface with default dark ink to
produce unreadable text.

The defaults are treated as the primary design work rather than as fallbacks,
because most merchants will never configure anything.

### What the widget writes to the host page

Two deliberate exceptions to otherwise touching nothing, both documented in
[ADR 0003](docs/decisions/0003-declared-placement.md):

- **The toast is appended to `document.body`.** `position: fixed` resolves against
  the nearest ancestor with a `transform`, `filter` or `perspective` — not the
  viewport — and we cannot know what a merchant has applied up their tree. A
  body-level host is the only reliable containing block. It carries its own shadow
  root, and removes itself entirely on dismissal rather than leaving an invisible
  fixed layer over the page.
- **The badge sets `position: relative` on its anchor**, and only when the
  computed position is `static`. An absolutely positioned child needs a containing
  block. This has no visual effect. The alternative — a body-level element tracked
  against `getBoundingClientRect()` — would avoid the mutation at the cost of
  scroll and resize listeners, which is measurable jank.

No CSS is injected into the host document. No globals are registered.

### Keeping it light

- No dependencies, no bundler, no polyfills.
- Inline SVG icons: no icon font, no sprite request, no FOUT. All drawn on one
  24px grid at a single 1.35 stroke weight so they carry equal optical weight.
- Constructable stylesheets (`adoptedStyleSheets`) so each stylesheet is parsed
  once and shared, with a `<style>` fallback for older engines.
- One pass over the array, one DOM insertion per surface. No re-render path.
- The mount point stays empty until content resolves. Space is deliberately not
  reserved: if the payload fails, reserving space would leave a permanent hole in
  the merchant's page. Passing `content` directly instead of `url` renders
  synchronously with no shift at all.

### Failing safe

A third-party widget has no business taking a merchant's page down with it.

- `normalise()` reduces arbitrary input to items that are known to render.
  Anything unexpected is **dropped, not repaired and not thrown on**.
- Items without a `title` are skipped; a missing `body` renders a title-only row;
  an unrecognised `icon` falls back to a neutral glyph; an invalid `anchor`
  selector is caught rather than raised.
- Zero renderable items renders **nothing at all** — no empty box, no stray rule.
  The page is left exactly as it was found.
- The entire mount is wrapped: a network failure, a 404, malformed JSON or a
  payload that is not an object results in one `console.warn` and no output.
- All text is assigned through `textContent`. Merchant content is never parsed as
  markup. `innerHTML` is used only for the widget's own icon strings.
- **Content hidden pending an animation never depends on that animation
  arriving.** The list is hidden only after an `IntersectionObserver` is attached,
  and a 1600ms backstop reveals it regardless — if the observer is throttled,
  detached, or the widget is mounted in a collapsed container, the text still
  appears. *(This was a real bug, caught by screenshotting the rendered page
  rather than by reading the code.)*
- The toast's sweep uses `background-clip: text`, which needs a transparent text
  colour. The class is applied only after `CSS.supports()` confirms the technique,
  and removed on `animationend`, so a transparent colour can never outlive the
  animation that justifies it.

### Accessibility

- The list is a real `<ul>` / `<li>`, so assistive technology announces the set
  and its length before reading through it.
- Icons are `aria-hidden`; every icon's meaning is carried by adjacent text.
- The toast is the only place its content appears, so it is **not** hidden from
  assistive technology, and it dismisses on a timer, on click, or on Escape.
- `prefers-reduced-motion` is respected across all three surfaces.
- `forced-colors` blocks keep hairlines, borders and the toast title visible in
  Windows high contrast.
- The toast's fixed layer is `pointer-events: none` with the pill itself `auto`,
  so it never swallows clicks meant for the merchant's page. Its `z-index` is
  9999 — above ordinary content, below a merchant's own modals.
- No custom keyboard model, because there are no controls. Nothing is focusable,
  nothing is hidden, nothing can trap focus.

---

## A note on the host page

The mock page's product gallery distorts once the details column grows taller
than the image. This is a pre-existing conflict in its own stylesheet: `.gallery`
sets `aspect-ratio: 4/5`, but as a grid item it defaults to `align-items:
stretch`, so its height is set by the row rather than by the ratio. Any added
content triggers it — a longer description or a size selector would do the same.

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
- **Platform integrations.** On a themed platform the merchant's design tokens can
  be read directly and injected server-side as custom properties, which is
  strictly better than inferring them. The generic script tag remains the path
  most stores would take, so it stays the one that has to be excellent.
- **Dark mode** via `prefers-color-scheme`. The token contract already
  accommodates it without structural change.
- **A badge that validates its anchor.** The fallback protects against *absent*
  anchors, not *unwise* ones — a fixed-height or already-positioned container can
  still produce an awkward result.
- **Testing.** Visual regression across item counts, placements and copy lengths;
  a screen reader pass; real device testing rather than emulation.
- **A non-module build** for stores that cannot use `type="module"`.
- **A larger icon set**, and a way for merchants to supply their own.

---

## AI tools

Built with Claude (Claude Code) throughout: for implementation, for structuring
the architecture decision records, and as a foil for design reasoning.

Every line here is understood and can be explained and defended. Three places
where the reasoning was mine and the tool was wrong, since that is the more
useful thing to record:

- The accordion was originally recommended to me; I rejected it, and the static
  list is the better design.
- A `Math.min(items.length, 3)` bug laid five items out in three columns. Caught
  by looking at the rendered page, not the code.
- The single-list architecture was argued for at length before I decided the
  content's differing roles warranted distinct placements. ADR 0003 records both
  sides.

---

## Layout

```
widget/product-highlights.js         the widget — one file, no dependencies
design-starter/host-page.html        mock merchant product page
design-starter/sample-content.json   sample content payload
dev/harness.html                     edge cases and animation replay
docs/decisions/                      architecture decision records
```
