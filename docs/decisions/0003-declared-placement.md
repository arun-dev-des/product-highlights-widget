# ADR 0003 — Declared placement

- **Status:** Accepted — implemented in `widget/product-highlights.js`
- **Date:** 2026-07-28
- **Applies to:** The embeddable product highlights widget
- **Related:** [ADR 0001 — Style isolation](./0001-style-isolation.md) ·
  [ADR 0002 — Theming and native feel](./0002-theming-and-native-feel.md) ·
  [ADR 0004 — Layout from the measure](./0004-layout-from-the-measure.md)

---

## Context

The first implementation rendered all five highlights as one inline list beneath
the buy action. Two problems emerged once it was on the page.

**The column ran long.** Five items at roughly seventy characters each pushed the
details column well past the product image, and the page stopped reading as one
composition. The widget looked like a block bolted underneath the button, which
is precisely the outcome the native-feel requirement exists to prevent.

**The content is not homogeneous in role.** Treating it as five equivalent rows
ignored what the items actually are:

| Item | What it is | Where a designer would put it |
|---|---|---|
| Delivery, guarantee, fit | Answers to purchase hesitation | Beside the buy action |
| Traceable merino | A product attribute | On the product image |
| Loved by 3,100+ buyers | Social proof | Somewhere it earns a moment of attention |

A single list is the right answer when the items are peers. These are not.

There is a real tension here with the brief, which asks for *"one component, done
really well"* and warns explicitly against *"several rough ones."* That warning is
about **scope and finish**, not about DOM node count — and it is the main risk
this decision has to answer for.

---

## Decision

**One script, one payload, one codebase — four presentations. Each highlight
declares where it belongs; the widget renders it there.**

```json
{ "type": "shipping",     "placement": "list",  "title": "…", "body": "…" }
{ "type": "social_proof", "placement": "toast", "title": "…", "body": "…" }
{ "type": "material",     "placement": "badge", "anchor": ".gallery", "title": "…" }
```

| Placement | Presentation |
|---|---|
| `list` *(default)* | The inline list beneath the buy action |
| `rating` | A score panel: the claim, a hairline, then a numeral and stars |
| `toast` | A persistent pill pinned to the viewport, cycling continuously through its `messages`, dismissible on click or Escape |
| `badge` | A small pill anchored inside an element the merchant names |

Two properties make this a single component rather than four:

- **One integration.** One script tag, one `mount()` call, one payload, one set of
  theme tokens shared across every shadow root. A merchant installs it once.
- **One data model.** The presentations are four renderings of the same item
  shape, not four features. Adding a fifth is a renderer, not a product.

### The rule that makes it safe

**Anything that cannot be placed falls back to the list.**

- `anchor` matches nothing → list
- `anchor` is an invalid selector → caught, list
- A second item requests `toast` or `rating` → the first wins, the rest go to the list
- `rating` carries no usable score → list, because a panel with no stars in it is
  just a sentence in a box
- `placement` is absent or unrecognised → list
- A surface is suppressed via options → its items **return to the list**

Every item always ends up somewhere. The payload renders in full on any page,
however wrong the configuration — including a page with no product image, no
gallery selector, and no idea what a toast is.

---

## Alternatives considered

### A. Keep the single inline list

The previous implementation. Rejected for the two reasons in Context: it made the
details column overrun the image, and it flattened content whose roles differ.

It remains the fallback that every other placement degrades to, which is the
strongest thing that can be said for it — it is the presentation that always
works.

### B. Derive placement from `type`

`type === 'material'` → image corner; `type === 'social_proof'` → toast. Requires
no new data and reproduces the same result on this payload.

**Rejected, and this is the important rejection.** It hardcodes two assumptions we
have no right to make:

- **That we know where the product image is.** On the mock page it is `.gallery`.
  On the next store it is `.product-media`, or `.ProductGallery`, or an unclassed
  `<figure>`. Every selector we write is a guess about markup we have never seen,
  and a wrong guess either drops content or places it somewhere absurd.
- **That a `type` implies a role.** A merchant may have no social proof and want
  their guarantee promoted instead. Type-derived placement gives them no way to
  say so.

The merchant knows where their product image is. We never do. So they declare it,
and the failure mode when they get it wrong is a demotion to the list rather than
a broken page.

### C. Three separate widgets

Three scripts, three payloads, three integrations. Rejected: it multiplies the
integration burden for the merchant, triples the surface a reviewer has to
evaluate, and is the literal shape the brief warns against.

### D. Declared placement — **chosen**

---

## Consequences

### Positive

- The page reads as a composition. Three items beside the buy action no longer
  overrun the product image.
- Each fact is presented in a form that suits its role rather than a form that
  suits the majority.
- Merchants control placement without a release from us, and control it in the
  same payload that already carries the content.
- Every misconfiguration degrades to a working page rather than a broken one.
- The theme token contract from ADR 0002 is shared across every shadow root, so
  re-theming still means setting custom properties once.

### Negative — accepted

- **This is more surface than one list.** Four presentations mean four sets of
  styles, four entrance behaviours and four sets of edge cases. It is a real
  cost, and the honest defence is that the presentations are small, share their
  tokens and item shape, and each degrades to the same fallback.

- **The toast is permanent, and its rotation never stops.** This reverses an
  earlier decision. The first version dismissed after seven seconds and cycled
  once, on the reasoning that a repeating message reads as nagging.

  That reasoning applies to a *notification* — something announcing an event,
  which has served its purpose once seen. This is not that. It is a standing
  statement of social proof, closer in kind to a badge than to an alert, and a
  badge that removes itself after seven seconds is simply a badge most shoppers
  never see. It is also the only surface carrying its content.

  The cost is real: perpetual motion in the corner of a merchant's page. Four
  things keep it civil, and they are the reason this is defensible rather than
  merely persistent:

  - It **pauses on hover and on focus**, so a line never changes mid-read.
  - It **pauses entirely while the tab is hidden** — an endless animation nobody
    is watching is just battery.
  - Each line's **dwell scales with its length** (2.4s to 6.5s), so a long
    sentence is not swapped out before it can be read.
  - It is **dismissible** at any time by click or Escape, and removes its element
    from the document rather than merely hiding it.

  Under reduced motion it crossfades in place rather than travelling. It still
  rotates, because suppressing the rotation would put the second line out of
  reach entirely — reduced motion asks for less movement, not less content.

- **The badge writes to the merchant's element.** An absolutely positioned child
  needs a containing block, so `showBadge()` sets `position: relative` on the
  anchor when its computed position is `static`. This has no visual effect, but
  it is a mutation of markup we do not own.
  *Alternative rejected:* positioning a body-level element against
  `getBoundingClientRect()` would avoid the mutation but require scroll and
  resize tracking — measurably janky, and jank is graded.

- **The toast appends an element to `document.body`.** Unavoidable:
  `position: fixed` resolves against the nearest ancestor with a `transform`,
  `filter` or `perspective`, and we cannot know what a merchant has applied up
  their tree. A body-level host is the only reliable containing block. It carries
  its own shadow root, so isolation is preserved, and it removes itself entirely
  on dismissal rather than leaving an invisible fixed layer behind.

- **The toast is the only home for its content.** It is therefore *not* hidden
  from assistive technology. Every line sits in the DOM at once and is read in
  order; the rotation is a visual treatment rather than a change of content, so
  there is nothing to announce and no live region is used. *(Were the content
  duplicated elsewhere, `aria-hidden` would be the correct choice instead.)*

- **Placement is now merchant-configurable surface area.** A merchant can point
  `anchor` at something unsuitable — a fixed-height container, an element that is
  itself absolutely positioned — and get an awkward result. The fallback protects
  against *absent* anchors, not against *unwise* ones.

---

## Notes

- **Layout is the escape hatch, and it is built out of the fallback rule.** A
  merchant who does not want distributed placement at all sets `layout` to
  `list`, `compact` or `simple`, and every item renders in one surface. This
  needed no second resolver: a single-surface layout suppresses the other
  surfaces, and the rule above returns their items to the list. The presentation
  a reviewer sees as "the alternative design" is the same code path as a
  misconfigured anchor.

  `simple` renders titles without bodies, which is why it is offered and not
  defaulted to — it is honest for payloads whose titles stand alone and dishonest
  for this one, where *"True to size"* needs *"runs slightly long in the sleeve"*
  to be useful. `compact` keeps the body for that reason. All four are exercised
  in `dev/harness.html`.

  `accordion` and `steps` are the two layouts that change markup rather than only
  CSS, because a disclosure must be a real button to be operable. They are also
  the only ones that reintroduce the interaction surface the default deliberately
  avoids — offered for payloads too long to sit open, never assumed. A row with
  no body renders as a plain row rather than a control that reveals nothing.

  `steps` additionally asserts an order by advancing through the rows on its
  own. That is honest for an ordered payload and dishonest for this one, which
  is the whole reason it is a layout rather than the design. It cycles
  continuously — the toast's standing-rotation reasoning, applied inside the
  column — and keeps the toast's civilities in exchange: it holds on hover and
  focus, resumes on the remainder of a dwell rather than a fresh one, pauses
  entirely while the tab is hidden, stops permanently at the first click, and
  does not play at all under `prefers-reduced-motion` — where, unlike the toast,
  nothing is put out of reach by staying still.

- `type` remains unused by the renderer. It is preserved in the payload for
  merchant-side categorisation and reporting, and deliberately has no effect on
  presentation — see alternative B.
- Only the first item claiming `toast` is honoured. Two competing promotions are
  no promotion at all.
- The dev harness at `dev/harness.html` mounts the payload with no `.gallery`
  present, which demonstrates the badge demoting to a list row.
