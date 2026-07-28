# Product Highlights

An embeddable widget that surfaces key product facts — delivery, guarantee,
social proof, material, fit — across a merchant's product page.

One script, one payload, four presentations. Each highlight declares where it
belongs and the widget renders it there: an inline list beside the buy action, a
rating panel with a score and stars, a badge on the product image, and a
persistent toast that cycles its social proof.

13.5 KB gzipped, no dependencies, no build step, everything inside shadow roots.

**Live demo:**
[product page](https://arun-dev-des.github.io/product-highlights-widget/design-starter/host-page.html) ·
[React variant](https://arun-dev-des.github.io/product-highlights-widget/design-starter/host-page-react.html) ·
[dev harness](https://arun-dev-des.github.io/product-highlights-widget/dev/harness.html) ·
[stress suite](https://arun-dev-des.github.io/product-highlights-widget/stress/)

---

## What is in this repository

| Path | What it is |
|---|---|
| `widget/product-highlights.js` | **The widget.** One vanilla ES module, no dependencies. This is the submission. |
| `design-starter/host-page.html` | The mock merchant page with the widget mounted |
| `design-starter/theme-panel.js` | A merchant-facing theme configurator for the token contract, with the WCAG AA gate from ADR 0002. Ships with the host page, not with the widget |
| `dev/harness.html` | Edge cases, degradation states, and animation replay |
| `stress/` | Seven host pages built to break the widget — hostile CSS, transformed ancestors, dark theme, broken payloads, strict CSP. Each states its pass condition inline; findings in [stress/README.md](stress/README.md) |
| `react/` | **A comparative exhibit, not the deliverable.** The same widget rebuilt on React 19 + Motion 12, so the stack decision below rests on a measured comparison rather than an assertion. See [react/README.md](react/README.md) |
| `docs/decisions/` | Architecture decision records for the three load-bearing choices |

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
- **Stress suite** — http://localhost:8080/stress/

Serve from the repository root so `/widget/` and `/design-starter/` are both
reachable. Any static server works; nothing needs building. (The React variant
has its own dev setup — see [react/README.md](react/README.md) — but its
compiled bundle is committed, so its demo page works from the same static
server.)

The harness mounts the payload six ways — full, three items, one item, ragged
content, an empty array, a malformed array — and states what each should do, so
a wrong result is obvious. It also shows the rating panel and its degraded
state, and replays the toast, including at quarter speed.

Deployment is the same story: the repository is static files, so any static
host serves it as-is.

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
  layout: 'grid',              // optional: 'distributed' (default), 'list', 'grid'
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
| `icon` | no | `truck`, `shield`, `star`, `leaf`, `ruler`, `avatars`; anything else falls back to a neutral glyph. In the toast, `avatars` renders as three overlapping discs with figures rather than a flat glyph |
| `toastIcon` | no | Toast-only override for `icon`, honoured nowhere else. Exists because one item can present differently per surface — the demo's social proof leads with the avatar stack in the toast and a star in every list layout |
| `placement` | no | `list` *(default)*, `rating`, `toast`, `badge` |
| `anchor` | for `badge` | A CSS selector on the host page |
| `rating` / `scale` | for `rating` | Numbers, not prose. Stars are drawn from these; `scale` defaults to 5 |
| `messages` | no | Extra lines the toast cycles through after its title. Absent, a `body` rotates as the second line instead — the toast is a one-line pill, and a line it can show one at a time is not made a second row |
| `type` | no | Unused by the renderer; preserved for merchant-side categorisation |

**This schema extends the starter payload.** The provided `sample-content.json`
carried five items with `title`, `body` and `icon`; the starter materials invite
extension, and `placement`, `anchor`, `rating` and `messages` are the
extensions. Every added field is optional, so the original unmodified payload
still renders — all five items default to the list, which is exactly the
degradation path everything else falls back to.

One consequence stated plainly: the demo payload keeps its score as prose
inside the toast line ("Rated 4.8 out of 5 …"), and declares no `rating` item,
so **the rating panel does not appear on the demo page**. It is exercised in
the dev harness instead, alongside its degraded state. The panel exists
precisely so a score can be structured data rather than a sentence to scrape;
giving the item `"placement": "rating", "rating": 4.8` is all it would take to
surface it.

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

### Layout

Placement is per-item; **layout is per-installation.** A merchant who wants
everything in one place says so once, and the individual `placement` values stop
applying.

| `layout` | What it renders |
|---|---|
| `distributed` *(default)* | The four placements above — list, rating panel, toast, badge |
| `list` | Every item in the inline list, title and body |
| `compact` | Every item in a two-column grid — mark above title above body |
| `simple` | Every item in a three-column grid — mark and title only |
| `accordion` | Every item in one list, titles upfront, bodies behind a disclosure |
| `steps` | The accordion, cycling through its rows continuously |

```html
<script type="module" src="/widget/product-highlights.js"
        data-mount="#highlights" data-content="/highlights.json"
        data-layout="compact"></script>
```

The four single-surface layouts are **not a second rendering path.** They turn
the other surfaces off and let ADR 0003's fallback rule do the work — a
suppressed surface returns its items to the list rather than dropping them, which
is the same road `toast: false` already travelled. Every item that declared
`toast` or `badge` renders inside the mount instead. No second resolver, no
parallel set of edge cases.

Four of the five layouts also share one row shape and differ only in CSS.
`accordion` is the exception, and deliberately so: a disclosure has to be a real
`<button>` to be operable, so it gets different markup rather than a `<div>` with
a click handler bolted on.

The column counts are minimum-track-driven rather than fixed, so a product
details column yields the intended two and three, and a narrower container drops
a column instead of crushing the measure.

`simple` shows titles only, so it suits payloads whose titles are
self-sufficient. *"Free 2-day delivery"* is a complete thought; *"True to size"*
is not — it needs the body to say *"runs slightly long in the sleeve."* That is
why it is offered rather than defaulted to, and why `compact` keeps the body.

Both grids centre the mark above the text and keep hierarchy in **size and colour
rather than weight**, for the same reason the inline list does: Georgia has no
light-touch bold at this size, and a grid of bold serif headings reads
considerably louder than the page around it.

`accordion` opens one row at a time and separates rows with a hairline. What it
costs and what it buys is argued below under *Everything is visible*; what it
does technically is worth stating here:

- Each header is a real `<button>` carrying `aria-expanded` and `aria-controls`,
  so focus, Enter, Space and the expanded/collapsed announcement come from the
  platform rather than from us.
- **A row with no body is not a control.** It renders as a plain row with no
  button, no chevron and no panel — a disclosure that reveals nothing is the
  gratuitous interaction this widget argues against.
- Rows animate on `grid-template-rows: 0fr → 1fr`, so the browser resolves the
  content height itself. There is no measured pixel height to cache or to
  invalidate when the text reflows.
- A collapsed panel is `visibility: hidden`, applied after the row has finished
  collapsing, so a screen reader is never read the body of a row that presents
  itself as closed.

`steps` is that accordion playing itself, each row led by its mark and the
active row lifted in the emphasis colour. It cycles continuously — a standing
rotation, the same claim the toast makes — and perpetual motion inside the
column is bolder than a corner pill, so it keeps every civility the toast has:

- **It holds on hover and on focus**, and resumes on what is *left* of the dwell
  rather than on a fresh one, so a glance does not reset a row already half read.
- **It pauses entirely while the tab is hidden** — an endless animation nobody
  is watching is just battery.
- **The first click ends it permanently**, leaving an ordinary accordion behind.
  A shopper who takes control keeps it.

The fill on the row's bottom edge is the clock, not a decoration running beside
one. An earlier version paused the fill in CSS on `:hover` while a JavaScript
timer kept the sequence advancing — the indicator froze and the rows carried on
without it. Both now come from the same animation, so they cannot disagree.

Under `prefers-reduced-motion` it does not play at all: row one is simply open
and every row is clickable. That differs from the toast, which still rotates
under reduced motion, and the difference is the reason — the toast's rotation is
the only route to its second line, whereas here nothing is out of reach.

Dwell scales with the length of the body being read, on the same 2.4s–6.5s curve
the toast uses.

### Theming

Nine optional CSS custom properties, shared across every shadow root, set from
the merchant's own stylesheet; no knowledge of the widget's internals is
required.

They must be set on the widget's own elements, not on a shared ancestor. The
three surfaces attach in three different places — the list to the mount element,
the toast to `document.body`, the badge inside the anchor — so tokens set on the
mount reach the list and rating panel only. Hoisting them to `:root` does not
work either: the widget *declares* its defaults inside `:host`, and a declared
value beats an inherited one. What wins is a selector matching the host elements
themselves. The toast and badge tag themselves with `data-product-highlights`
for exactly this purpose.

```css
#highlights,
[data-product-highlights] {
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

The demo page ships a **theme panel** that writes precisely this block, live, and
grades every colour pair against WCAG AA as you go — open
[host-page.html](design-starter/host-page.html) and use the tab on the right edge,
or link straight to it with `?theme` (`?theme=dark`, `?layout=grid`). It switches
layout too, and emits the script tag for it alongside the CSS, because layout
changes what is rendered and so cannot be a style override.

Tokens the current layout has no surface for — the toast colours once nothing
floats, body colour in the grid — are greyed out with the reason, and the
contrast gate drops the pairs that layout does not draw. A control that silently
does nothing is worse than no control, which is also why `--hl-accent` has none:
the vanilla build declares it and no rule reads it.

It is a merchant-facing tool, not part of the widget: it lives entirely in
[design-starter/theme-panel.js](design-starter/theme-panel.js), adds nothing to
the bundle, and deleting its one script tag removes it.

It is also where ADR 0002's contrast gate is implemented. That gate could not
live inside the widget — custom properties are applied by the browser directly,
leaving nothing to intercept — so a configurator is the first point in the
cascade where a value can be judged before it is used.

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

This also kept a great deal of accessibility surface out of the default: no
`aria-expanded`, no `aria-controls`, no regions, no keyboard model, no focus
management. What remains is a list, marked up as a list.

**An accordion exists now, as `layout: "accordion"`, and that is not a reversal.**
The argument above is about what to *default* to, and it turns on a fact about
this payload: five items at roughly seventy characters is fifteen lines, and
fifteen lines fit. That stops being true somewhere around twelve items, and a
merchant with a payload that long should not have to choose between a wall of
text and forking the widget. So the disclosure is offered and never assumed — the
static list remains the default, and the reasoning for it is unchanged.

Offering it also means paying for it properly rather than approximating it: real
buttons, real `aria-expanded`, a panel that leaves the accessibility tree when it
closes, and no measured heights. A half-built accordion would have been the
"several rough ones" the brief warns against; the point of declining it as a
default was never that it is hard.

### Sequential forms were rejected on the shape of the data

The facts have no inherent order — nothing depends on reading shipping before
fit. A carousel or stories sequence would impose an order the content does not
have, and force a shopper worried about sizing past four irrelevant panels to
reach the one that concerns them. Sequential presentation is honest only when the
content is sequential.

**`layout: "steps"` is that last sentence taken at its word, not a reversal of
it.** A merchant whose payload *is* ordered — how it works, what happens after
you order, a setup flow — has content the numbering describes accurately, and
they should not have to fork the widget to say so. This payload is not that,
which is why `steps` is offered and `distributed` is the default.

It also avoids the specific harm the paragraph above objects to. A carousel
*gates* content: the fourth panel cannot be reached without moving through three
others. Here every row is a button from the first frame, the sequence is a reveal
rather than a gate, and a shopper worried about sizing clicks straight to it —
which stops the sequence for good.

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
  standing statement of social proof rather than a notification, so it stays
  until the shopper dismisses it — there is no timer. The rotator is locked to
  its widest and tallest line before the frames leave the flow, so the pill
  never resizes mid-turn, and each line's dwell scales with its length
  (2.4s–6.5s) so a long sentence is not swapped out before it can be read.

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

Vanilla JavaScript, one ES module, no dependencies, no build step. **40 KB raw,
13.5 KB gzipped, unminified.**

A framework was considered and rejected on fit. This is third-party code running
on other people's storefronts; every kilobyte is spent from a budget belonging to
the merchant, on a page whose conversion rate is their livelihood. There is no
state to manage and no reconciler to benefit from: the whole render is one pass
over an array.

That claim is measured rather than asserted. [`react/`](react/) holds the same
widget rebuilt on React 19 and Motion 12 — same payload, same four placements,
same host page — and its bundle is **~110 KB gzipped, roughly eight times the
vanilla build**, before writing any widget code at all. The comparison, what the
framework genuinely bought (declarative rotation state, error boundaries per
surface), and what it cost beyond bytes are in
[react/README.md](react/README.md). The vanilla build is the submission; the
React build exists so this section is a measurement, not an opinion.

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

The isolation claim is tested, not assumed: [stress page 01](stress/01-hostile-css.html)
throws `!important` rules and element selectors at every generic class the
widget uses, and the boundary holds in both directions. The one caveat the suite
surfaced is documented there: `--hl-surface` defaults to `transparent` for
native feel, so a busy host background sits directly behind the list text — the
reason that token is in the contract.

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
- **Two mounts racing for one host resolve to the later call, not the slower
  fetch.** `mount()` is async, so a remount can interleave with a mount still
  awaiting its payload — a replay, a layout switch, a duplicated script tag.
  Each call takes a sequence number on the host; a call that returns from an
  await to find a newer number renders nothing, and its deferred reveal cannot
  float a toast or badge belonging to a render that is gone.
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

Beyond the harness, [`stress/`](stress/) drops the widget into seven pages built
to break it — hostile CSS, transformed and contained ancestors, a dark theme, a
320px RTL column, a strict CSP, and a battery of broken payloads. Findings,
including the ones that did not flatter the widget, are written up in
[stress/README.md](stress/README.md).

### Accessibility

- The list is a real `<ul>` / `<li>`, so assistive technology announces the set
  and its length before reading through it.
- Icons are `aria-hidden`; every icon's meaning is carried by adjacent text.
- The toast is the only place its content appears, so it is **not** hidden from
  assistive technology. All of its lines are in the DOM at once and read in
  order; the rotation is a visual treatment, not a change of content, so no live
  region is needed.
- The toast stays until dismissed — by click, or by Escape from anywhere on the
  page. The pill itself is not in the tab order; Escape is the keyboard path.
  Making the pill focusable, with Enter and Space to dismiss and the existing
  focus-pause doing its work for keyboard users, is first on the list below.
- `prefers-reduced-motion` is respected across all three surfaces.
- `forced-colors` blocks keep hairlines, borders and the toast title visible in
  Windows high contrast.
- The toast's fixed layer is `pointer-events: none` with the pill itself `auto`,
  so it never swallows clicks meant for the merchant's page. Its `z-index` is
  9999 — above ordinary content, below a merchant's own modals.
- The list itself has no controls: nothing is focusable, nothing is hidden,
  nothing can trap focus.

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

- **A focusable toast.** The pill dismisses on click and on Escape, but is not
  itself in the tab order, so a keyboard user cannot reach it to pause the
  rotation the way a hover does. `tabindex="0"`, a button role, and Enter/Space
  to dismiss would close the one keyboard gap the widget has.
- **Contrast validation at the payload boundary.** ADR 0002's WCAG AA gate is
  implemented in the theme panel, which is the only place it can be while theming
  flows through CSS custom properties — the browser applies those directly, with
  nothing to intercept. The panel reports a failing pair; it does not substitute
  the default, because discarding what a merchant just typed reads as a broken
  control. The substitution the ADR specifies becomes both possible and necessary
  the moment a `theme` object is accepted in the payload.
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

- The accordion was originally recommended to me as *the* design; I rejected it,
  and the static list is the better default. It ships as an optional layout for
  payloads the default is not sized for, which is a different claim.
- A `Math.min(items.length, 3)` bug laid five items out in three columns. Caught
  by looking at the rendered page, not the code.
- The single-list architecture was argued for at length before I decided the
  content's differing roles warranted distinct placements. ADR 0003 records both
  sides.
