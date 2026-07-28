# Product Highlights — React build

A second implementation of the same widget, built on React 19 and Motion 12.

It renders the same payload into the same four placements as the vanilla build,
on a copy of the same merchant page. The vanilla build in [`../widget/`](../widget/)
is untouched — the two sit side by side so the trade can be judged rather than
argued about.

| | page | widget |
|---|---|---|
| vanilla | [`../design-starter/host-page.html`](../design-starter/host-page.html) | [`../widget/product-highlights.js`](../widget/product-highlights.js) |
| React | [`../design-starter/host-page-react.html`](../design-starter/host-page-react.html) | `dist/product-highlights.react.js` |

---

## Running it

```bash
cd react
npm install
npm run dev      # dev server, hot reload, loads src directly
npm run build    # emits dist/product-highlights.react.js
```

`npm run dev` serves [`index.html`](index.html) — the merchant page copied verbatim
from the starter, so development happens against exactly the hazard the widget
ships into. The sample content is read straight out of `../design-starter/` via
Vite's `publicDir`, not from a copy, so the two cannot drift apart.

After `npm run build`, open `../design-starter/host-page-react.html` over HTTP
(the content payload is fetched, so `file://` will not do).

## Embedding

One compiled file, one script tag. The component tree inside changes nothing
about how it is installed:

```html
<div id="widget-slot"></div>

<script src="product-highlights.react.js"
        data-mount="#widget-slot"
        data-content="/highlights.json"></script>
```

Or programmatically, for a merchant who already has the payload:

```js
ProductHighlights.mount('#widget-slot', {
  content: { highlights: [ /* … */ ] },
  label: 'Product highlights',   // accessible name for the list
  toast: false,                  // keep toast items in the list instead
  badges: false,
  rating: false,
});
```

Turning a surface off returns its items to the list rather than dropping them, so
the payload always renders in full.

---

## What this weighs

Measured, gzip level 9, on the actual build output:

| | raw | gzip | share of gzip |
|---|---|---|---|
| react + react-dom | 189.9 kB | **58.9 kB** | 53% |
| motion | +122.4 kB | **+38.8 kB** | 35% |
| the widget itself | +40.0 kB | **+14.1 kB** | 13% |
| **total** | **352.3 kB** | **111.8 kB** | |
| vanilla build, for comparison | 46.3 kB | **15.3 kB** | |

That is **7.3× the vanilla build**, and the honest reading of the table is that
none of the increase is the widget. My own code compresses to 14.1 kB here against
15.3 kB vanilla — very slightly *less*, for the same four surfaces plus gestures.
The entire 96 kB delta is framework.

Two things worth knowing about that number:

- **It is main-thread time, not download.** 112 kB gzipped is 40–90ms of transfer
  on typical 4G, which nobody notices. The cost that matters is ~350 kB of
  JavaScript to parse, compile and execute before first paint, on a page whose
  Core Web Vitals belong to the merchant and not to us. On a low-end Android that
  is plausibly 150–250ms of main thread.
- **Vite does not set `NODE_ENV` in library mode**, on the reasoning that a
  library may be consumed in either environment. An embed is not — it ships
  compiled, to strangers' pages. Without the substitution in
  [`vite.config.js`](vite.config.js) React's *development* build goes out with it,
  which measured **229 kB gzipped**, double the correct figure. It is a silent
  trap: the build succeeds and the widget works.

The single biggest lever, if this were to ship, is aliasing `react-dom` to
`preact/compat` — the table shows react-dom is 53% of the payload on its own, and
the alias is a config change, not a rewrite, because nothing here uses an API
`preact/compat` lacks. That is not done, and the number above is the honest one.

---

## What the framework actually bought

Concretely, not in principle:

- **~80 lines of measurement code, deleted.** The vanilla toast has to lock its
  rotator to a fixed box before the frames leave the flow — measuring the width
  each line *wants* with wrapping suppressed, computing available space from the
  card's own padding and border rather than reading it back, then measuring height
  once the final width is in effect, with pixel slack so the last glyph is not
  clipped. Here the outgoing line is taken out of flow by its exit style, the
  incoming line inherits the flow position, and Motion's `layout` springs the card
  to whatever the new line needs. The measurement problem does not exist.
- **Drag-to-dismiss.** `drag="y"` with asymmetric `dragElastic` — down gives, up
  barely does, so the hand learns the direction without instruction — plus a
  velocity threshold so a flick works without a full-distance drag. This is the
  one thing in the brief's "sensible gestures on touch" that is genuinely tedious
  by hand.
- **One clock instead of two.** The rotation and the dwell indicator are the same
  `useAnimationFrame` loop, so they cannot drift out of sync. It also pauses in a
  background tab for free, because rAF does not run there — which replaces the
  vanilla build's explicit `visibilitychange` handling.
- **A count-up score.** A motion value rendered directly as a child, so the
  numeral animates without re-rendering the panel each frame.
- **Teardown.** Three shadow roots are now one React tree portalling across
  boundaries, so unmounting is automatic rather than three imperative paths.
- **No `innerHTML` anywhere.** Icons are JSX, so the question of whether a given
  string is ours or a merchant's cannot arise.

## What it cost, beyond bytes

- **A build step**, where there was a file that ran as-is.
- **`:root` is a lie inside a shadow root.** This is why there is no Tailwind and
  no shadcn here: both emit their tokens onto `:root`, which inside a shadow root
  resolves to the host document and not to our tree, so every token would have to
  be rehomed onto `:host` by hand. Radix compounds it by portalling overlays into
  `document.body`, which escapes the shadow root into the merchant's DOM — exactly
  what the isolation exists to prevent. Plain CSS strings adopted per root, as in
  [`src/styles.js`](src/styles.js), avoid the whole category.
- **Two owners for one property.** Motion writes `transform` on the toast, so the
  centring `translateX(-50%)` had to move up to `:host`. Anything Motion animates
  is absent from the stylesheet; the two never write to the same property.

---

## Design changes from the vanilla build

The placements are identical. What changed inside them:

- **Row dividers and icon wells.** The rows previously floated with no structure
  between them and the thin-stroke glyphs were optically weightless against the
  page. A hairline between rows and a soft warm disc behind each mark gives the
  column a rhythm. The dividers are behind a **container query**, not a media
  query, so they respond to the width the widget was actually given — a merchant's
  column is not the window — and they disappear when the list goes multi-column,
  where a top border would draw across the second column's first row and not the
  first's.
- **The list is self-sizing.** `repeat(auto-fit, minmax(min(100%, 21rem), 1fr))`
  replaces the old JS-set `data-cols` attribute. A second column can only appear
  where there is room for two full measures, which a product details column never
  has and a full-bleed section does. No measuring, no attribute to keep in sync.
- **The toast is a card, not a capsule.** A full 999px radius around two lines of
  text leaves dead wedges at both ends. 14px, with two shadows — a tight contact
  shadow to seat it and a wide soft one to lift it.
- **A dwell indicator.** Inset from both ends, lifted clear of the bottom edge and
  given a track to run in. The rotation used to be a surprise every time; now it
  is something a shopper can see coming, and the pause on hover is legible rather
  than invisible. (Flush to the edge and untracked, a part-drawn 2px rule reads as
  a half-painted border — which is to say, as a bug. The inset is the fix.)
- **An explicit close control.** The vanilla card dismissed on click *anywhere*,
  which punishes a shopper for tapping the thing they were reading — on a phone,
  the most likely interaction with it. Now: a labelled 30px button, a downward
  drag, or Escape. Tapping to read does nothing.
- **A width floor on the rotator.** Left to its content the card swung between the
  width of a four-word title and a full sentence on every turn, dragging the close
  control ~300px across the screen while a shopper reached for it. A floor cuts
  that to ~60px without locking anything.
- **Warmer, quieter type.** 15.5px titles with a hair of negative tracking, 14px
  bodies, and the score's stars in the amber accent rather than ink.

## Accessibility

- The list is a real `<ul>` with an accessible name, so the set and its length are
  announced before it is read through.
- The score is a single `role="img"` with `aria-label="Rated 4.8 out of 5"`. The
  numeral and stars are decorative duplicates of it.
- **The rotator is hidden from assistive technology and every line is exposed
  once, statically, beside it.** Only one line is in the DOM at a time now, so the
  vanilla build's reasoning — all frames present, read in order — had to be
  rebuilt deliberately. Announcing each turn instead would interrupt a shopper
  mid-sentence every few seconds.
- Reduced motion removes all movement, the stagger, the sweep and the dwell
  indicator, and shows every item at once. It asks for less movement, not less
  content. The sweep in particular must never leave text transparent where it
  cannot run.
- `forced-colors` is handled per surface. `all: initial` on `:host` takes the UA
  focus ring with it, so it is put back explicitly.

## How it fails safe

- **Nothing downstream re-validates.** [`src/content.js`](src/content.js) is a pure
  function from untrusted input to a shape the components can render without
  defending themselves. Anything unexpected is dropped rather than repaired.
- **Everything falls back to the list.** A missing anchor, an anchor selector that
  matches nothing, an invalid selector, an unknown placement, a second item asking
  for the toast, a rating panel with no usable score — all demote rather than
  disappear.
- **Per-surface error boundaries.** A throw inside the toast costs the toast. The
  list stays up, the page stays up.
- **Nothing renderable means nothing rendered** — no empty box, no stray rule, no
  reserved space. The page is left exactly as it was found.
- The `mount()` promise never rejects; it warns and resolves `null`.

## Verified

Checks run in a headless browser against the built bundle on the real host page:
the surfaces rendering, zero nodes leaked into the host's light DOM, rotation,
hover-pause, all three dismissal paths, the score counting to 4.8 with stars
filled to 96% rather than rounded to 5, a `rating` placement with no usable score
demoting to a list row, eleven malformed payloads that must not throw, and reduced
motion leaving content present, opaque and still at its real value. Mobile at 320
and 390px: **zero horizontal overflow**, card within the viewport, no overlap with
the buy action, 30px touch target. The suite also runs the same payload through the
*vanilla* build, so a change to shared content cannot silently break the other
page.

`sample-content.json` is used exactly as provided — no items added, no copy
changed. One consequence worth stating plainly: **the rating panel does not appear
in the demo.** The payload carries its score as prose inside a toast message
(`"Rated 4.8 out of 5. 94% of reviewers say it kept its shape after washing."`)
and declares no item with `placement: "rating"` or a numeric `rating` field, so
the panel is a capability the sample never reaches. It is covered by tests against
an injected payload instead.

That gap is deliberate on the payload's side, not an oversight on the widget's:
the panel exists precisely so a score can be structured data rather than a
sentence to scrape, and the sample demonstrates the opposite convention. Giving
the item `"placement": "rating", "rating": 4.8, "scale": 5` is all it would take
to surface it — in this build and, unchanged, in the vanilla one.

## With more time

- Alias `react-dom` to `preact/compat` and re-measure. On the table above that is
  the difference between a defensible embed and one a merchant's engineer flags.
- Swipe *sideways* on the toast to step between messages by hand. The dwell
  indicator already implies a track; making it seekable is the natural next move
  and would put pacing fully in the shopper's hands.
- The rotator currently crossfades on reduced motion. Honouring
  `prefers-reduced-transparency` and `update: slow` would be the same instinct
  applied twice more.
- Merchant-supplied avatars, which slot into the existing clip path.
