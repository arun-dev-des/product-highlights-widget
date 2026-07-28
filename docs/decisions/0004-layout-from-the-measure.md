# ADR 0004 — Layout from the measure

- **Status:** Accepted — implemented in `widget/product-highlights.js`
- **Date:** 2026-07-28
- **Applies to:** The embeddable product highlights widget
- **Related:** [ADR 0002 — Theming and native feel](./0002-theming-and-native-feel.md) ·
  [ADR 0003 — Declared placement](./0003-declared-placement.md)

---

## Context

ADR 0003 decided *where* each highlight goes. It did not decide what any of those
surfaces should look like, and the two questions have different inputs. Placement
follows from the **role** of an item. Layout follows from its **shape** — how many
characters it carries, and how much horizontal room the surface has to set them in.

The starter payload is not abstract, so the shape can be measured rather than
assumed:

| | min | avg | max |
|---|---|---|---|
| Title | 12 | **20** | 24 |
| Body | 65 | **73** | 80 |

Five items. Bodies cluster tightly — a fourteen-character spread across the whole
payload — and every one of them is a complete sentence or two. No item declares
`messages`, so the toast has one line and its body to work with and nothing else.

Two consequences fall straight out of those numbers.

**A ~73-character body has one comfortable width and several bad ones.** At 14.5px
Georgia it sets in about two lines across a product details column, and in about
five across a 15rem track. Five lines of muted body text in a narrow column is
where a list stops being scannable and starts being a paragraph nobody reads.

**Titles and bodies do not scale together.** A 20-character title survives almost
any column. A 73-character body does not. So any layout that narrows the cell has
to decide what happens to the body specifically, and "let it wrap" is a decision,
not a default.

The trap this ADR exists to avoid: **choosing a grid first and pouring the copy in
afterwards.** That produces a layout that looks right against the sample and breaks
against the next merchant's, because nothing in it was ever keyed to the text.

---

## Decision

**Layout is chosen by how much horizontal room a cell has for the body, and every
rule is declarative CSS keyed on one stamped attribute.** No JavaScript measures
anything, and no rule reads the viewport.

### 1. Hierarchy comes from size and colour, never weight

16px ink titles over 14.5px muted bodies, at 1.35 and 1.55 line-height. Georgia
has no light-touch bold at this size — its bold is heavy enough to date the type
and to read considerably louder than the page around it. A serif separates well on
tone, so tone is what does the separating.

This is also what lets the default list carry no container at all: hairlines above
and below rather than a box, so the text aligns with the host page's own left edge
and the widget reads as a section of the page rather than a card dropped onto it.

### 2. Column count follows item count, then available width

The default list stamps `data-cols`:

```js
'data-cols': stamped ? null : String(items.length <= 3 ? items.length : 1)
```

Two or three items may sit side by side; **four or more always stack.** With this
copy length a fourth column is not a denser layout, it is an unreadable one. The
attribute only enables the rule — `auto-fit` still decides whether the room is
actually there:

```css
.list[data-cols="2"],
.list[data-cols="3"] { grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
```

### 3. Track minimums are chosen so the target column yields the intended count

A product details column on the mock page is **492px** — a 1080px container, 48px
short of half after padding and gap. The minimums are set so that width produces
the count each layout is for, and a narrower one drops a column rather than
crushing the measure:

| Layout | Track min | In a 492px column | Body |
|---|---|---|---|
| default, 2–3 items | `15rem` (240px) | 2 | full |
| `compact` | `min(100%, 13rem)` (208px) | 2 | full, at 13.5px |
| `simple` | `min(100%, 9rem)` (144px) | 3 | **withheld** |

The `min(100%, …)` wrapper matters: without it a single item in a container
narrower than the track overflows it. `100%` wins whenever the container is the
smaller of the two, so the cell can always fit.

**`simple` withholds bodies because 9rem cannot carry 73 characters.** That is the
whole reason the layout exists as a separate option rather than as `compact` at a
smaller size. It is honest for payloads whose titles stand alone and dishonest for
payloads where the body carries the substance — which is why it is offered and
never defaulted to.

### 4. Wrapping is set per surface, because each has a different failure

| Surface | Rule | The failure it prevents |
|---|---|---|
| List body | `text-wrap: pretty` | A one-word last line under two full ones |
| Grid title | `text-wrap: balance` | A two-word and a five-word title sharing a row with wildly different rags |
| Compact body | `text-wrap: balance` | Same, one size down |
| Badge label | `nowrap` + `ellipsis` | A two-line pill on a product image |
| Toast rotator | measured, then locked | The card resizing under the reader on every turn |

The badge is the sharpest case. It sits **on** the product image, where a second
line changes the shape of something the shopper is looking at. It gets one line and
truncates — the only place in the widget where content is allowed to be cut, and it
is allowed because the same item's full text is in the list on any page where the
badge cannot place.

The toast is the most expensive. Its frames are absolutely positioned so they can
cross-fade, and absolutely positioned children contribute nothing to an intrinsic
width, so the card would collapse around its icon. The rotator is therefore measured
once with wrapping suppressed — capturing the width each line *wants* rather than
one it has already wrapped into — and locked to that box before the frames leave the
flow. Available space is computed from the pill's own padding, border, gap and mark
rather than read back, because a percentage max-width resolves against a parent whose
width was settled before we touched it.

### 5. The icon is sized to what it is doing

24px in the list, where it is a gutter mark beside text. **30px in the grids**,
where the cell has no text beside it and the glyph is carrying the cell alone — at
gutter size it reads as an afterthought. Top-aligned in the list with a 1px optical
nudge, because the 24px glyph box is taller than the title's line box and flush-top
sits a hair low against the cap height.

---

## Alternatives considered

### A. A fixed column count

`Math.min(items.length, 3)` — cap the columns at three and let the grid sort it out.

Rejected, and not hypothetically: **this shipped and was wrong.** It laid five items
out in three columns, which puts two items on a second row under three on the first
and leaves the last cell empty. It was caught by looking at the rendered page rather
than at the code, which is the honest version of how it was found. The replacement
is not a better cap, it is a different question: *does this copy read in a narrow
column at all?* For four or more items the answer is no, so they stack.

### B. Measure in JavaScript

A `ResizeObserver` on the mount, setting a column count from the observed width.

Rejected. It is a measurement to take, cache and invalidate on every reflow, it runs
after first paint so the shopper can watch the columns change under them, and it is
precisely the layout jank the brief grades. `auto-fit` with a sane minimum asks the
browser the same question and gets it answered during layout, for free.

### C. Media queries on the viewport

Rejected on a single fact: **the merchant's column is not the window.** A 1440px
desktop can hand this widget 300px, and a phone can hand it the full width. Any rule
keyed to viewport width is answering a question nobody asked.

Container queries are the correct form of this idea and the React build uses them —
for row dividers, which genuinely need to know the container's width. The vanilla
build does not need them here, because `auto-fit` already responds to available
width without being told what to look at.

### D. Truncate everywhere

Clamp bodies to two lines with `line-clamp` and be done.

Rejected. The content *is* the widget — five facts a shopper wants before buying —
and truncating them to protect a layout inverts the priority. The badge is the one
exception and it earns it by being the only surface where a second line deforms
something else on the page.

### E. One layout, sized fluidly

Ship the inline list alone and let it flex. Genuinely tempting, and it is what the
default does. Rejected as the *whole* answer because a merchant with a full-bleed
section and three short items is badly served by a single stacked column, and one
with twelve items is badly served by anything else. The layouts are not styles; each
is an answer to a different content shape.

---

## Consequences

### Positive

- Every layout rule is CSS keyed to one attribute. There is no measurement to
  invalidate, nothing to recompute on resize, and no frame in which the widget is
  laid out wrongly.
- The rules degrade in the right direction. A narrower container drops a column
  rather than crushing the measure; `min(100%, …)` keeps a single item from
  overflowing; four or more items stack whatever the width.
- ADR 0001's `all: initial` is what makes any of this hold. `hyphens`,
  `text-wrap`, `line-height` and `letter-spacing` are all inherited, so a merchant's
  reset cannot reach them. The typographic decisions are decisions, not defaults
  that happen to survive.
- The rendered result is checkable rather than asserted: harness case 09 runs
  deliberately ragged copy through it, and stress page 05 runs the whole thing at
  320px under `dir="rtl"`.

### Negative — accepted

- **The track minimums are tuned to a content profile, and the profile is an
  assumption.** 15rem, 13rem and 9rem are right for 20-character titles and
  73-character bodies. A merchant shipping 200-character bodies gets a compact grid
  that reads as two columns of paragraph. `auto-fit` responds to available width,
  not to the copy in the cell, and nothing here notices the difference.

- **They are also tuned to Georgia at 16/15/14.5px.** `--hl-font` is a public token,
  and a wider face moves where the columns break without moving the numbers that
  decide it. The token contract and the track minimums are coupled, and only this
  record says so.

- **`text-wrap: balance` is capped by the browser.** Chromium ignores it past
  roughly ten lines. Harmless for titles, which is all it is used on, but it is not
  a general-purpose tool and should not be reached for as one.

- **The four-or-more rule is a judgement, not a measurement.** Three items of
  *short* copy would sit happily in four columns; the rule stacks them anyway
  because it keys on item count rather than on the text. Keying on the text would
  mean measuring it, which is alternative B.

- **The badge truncates.** On a page where the badge places and the list is
  suppressed by `layout`, its full text is not on screen anywhere. The fallback rule
  in ADR 0003 covers the case where the badge *cannot* place; it does not cover a
  badge that places and clips.

---

## Notes

- Pacing — the toast's per-line dwell, the entrance stagger, the `steps` cadence —
  is interaction rather than layout and belongs to
  [ADR 0003](./0003-declared-placement.md).
- `simple` renders titles without bodies, so it is the one layout that changes what
  the payload *says* rather than only how it looks. That is a content decision
  wearing a layout's clothes, and it is the reason it is opt-in.
