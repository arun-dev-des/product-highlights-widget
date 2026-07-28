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

### Reveal does not hold — React build (02, 04, 07)

**The list items are in the DOM, laid out, `visibility: visible`, and stuck at
`opacity: 0` with `getAnimations().length === 0`.** The enter animation was never
started, so nothing will ever bring them back.

Reproduced with a single `ProductHighlights.mount()` call on an otherwise empty
page — no hostile CSS required. The vanilla build renders correctly on the same
markup, because it reveals content on a **1600ms timer backstop** that does not
depend on an IntersectionObserver ever reporting.

This is the same failure the vanilla build was hardened against earlier and the
port did not carry across: *content hidden pending an animation must never
depend on that animation arriving.* Real-world equivalents are background tabs,
`content-visibility: auto` subtrees, and mounts inside a container that is
collapsed at mount time and expands later.
