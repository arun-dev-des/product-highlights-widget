# Stress suite

The brief asks that the widget *"demonstrably work when dropped into a page like
the one provided."* These are pages **unlike** the one provided — each isolating
a way real storefronts break embedded code. Open `index.html`; every page states
its own pass condition inline.

Run from the repository root:

```bash
python3 -m http.server 8080
open http://localhost:8080/stress/
```

| # | Page | What it attacks |
|---|---|---|
| 01 | Hostile CSS | `!important` on every generic class the widget uses, plus element selectors on `div/p/span/svg/ul` |
| 02 | Transformed ancestor | `transform` → `filter` → `perspective` → `contain:paint` nested above the mount |
| 03 | Dark storefront | Light-tuned defaults on a dark page, beside a themed twin |
| 04 | No anchor, bad selectors, duplicate claims | Missing anchor, invalid selector, two toasts, two ratings, unknown placement |
| 05 | 320px column, RTL | Narrowest realistic column with `dir="rtl"` |
| 06 | Strict CSP | `style-src 'self'` — blocks inline `<style>` and `style=""` alike |
| 07 | Broken payloads | 404, invalid JSON, wrong shape, array of rubbish, missing mount |

---

## Results

### Isolation holds (01)

The widget is untouched by a host page that sets `!important` on `.card`,
`.title`, `.btn`, `.item`, `.text`, `.body`, `.icon`, `.list`, `.pill` and
`.frame`, and element selectors on `div`, `p`, `span`, `svg` and `ul`. No pink
text, no Comic Sans, no 90px icons, no lime borders. The shadow boundary does
exactly what ADR 0001 claims.

**But:** `--hl-surface` defaults to `transparent`, so on a page with a busy
background the list text sits directly on it and becomes hard to read. That is
the deliberate trade for native feel — and the reason `--hl-surface` is in the
token contract. Worth stating rather than discovering.

### Resilience holds (07)

404, invalid JSON, a payload of the wrong shape, an array of strings/nulls/
numbers/empties, and a mount selector matching nothing: every one renders
nothing at all and leaves the page intact. No exception escapes.

### Reveal is flaky under headless — unresolved (02)

On some runs the React list renders with its items stuck at `opacity: 0`. The
elements are in the DOM, laid out and `visibility: visible`; the reveal state
itself is correct — instrumenting `useRevealed` showed the 1600ms backstop
firing and React re-rendering with `revealed === true` — but motion's variant
animation never runs, so the rows never fade in.

**This has not been reproduced reliably and should not be treated as a
confirmed defect.** Attempts to isolate a trigger all failed:

| Hypothesis | Result |
|---|---|
| The transformed/contained ancestor chain | Ruled out — fails on a plain page too |
| Explicit `mount()` vs script-tag auto-mount | Ruled out — both render on some pages |
| Inline `content` vs fetched `url` | Ruled out — both directions render and fail |
| Payload size or the presence of toast/badge items | Ruled out — no consistent split |
| Multiple `mount()` calls on one page | Ruled out — a single call also fails |

The real host pages — `design-starter/host-page-react.html` and stress page 01 —
render completely and correctly, badge, list and toast alike. The most likely
explanation is frame-timing sensitivity in headless Chrome rather than a defect
in the widget: motion drives its animations from its own rAF loop, and a
JS-driven loop is more exposed to a virtualised clock than a CSS transition is.

What is worth noting, without overstating it: **under identical headless
conditions the vanilla build rendered every time and the React build did not.**
Vanilla reveals through a CSS class toggle backed by a timer, so once the class
flips the browser paints the final state whether or not any frame callback ran.
Motion cannot fall back that way. That is a real difference in robustness, not a
bug report.

**Verify in a real browser before drawing any conclusion.** Open
`stress/02-transformed-ancestor.html` and watch whether the rows appear. That is
the one check this suite cannot make for itself.
