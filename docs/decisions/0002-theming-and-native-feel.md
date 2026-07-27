# ADR 0002 — Theming and native feel

- **Status:** Accepted — partially implemented, see below
- **Date:** 2026-07-28
- **Applies to:** The embeddable product highlights widget
- **Related:** [ADR 0001 — Style isolation via Shadow DOM](./0001-style-isolation.md)

> **Implementation status.** Of the four cascade layers, the widget ships layer 2
> (CSS custom properties) and layer 4 (crafted defaults). Layer 1 (a `theme`
> block in the content payload) and layer 3 (bounded inference) are not built.
> The contrast gate below is consequently unimplemented: theming currently flows
> through custom properties, which the browser applies directly, leaving nothing
> to intercept. It becomes necessary the moment layer 1 is accepted.

---

## Context

ADR 0001 established a hard boundary: the host page's styles cannot reach into the
widget. That solves collision, and it creates a new problem in its place.

A perfectly isolated component is a component that looks like it was pasted in from
somewhere else. The requirement is that the widget feel **native** — as though the
merchant's own designer built it. Isolation and native feel pull in opposite
directions, and this ADR is about how that tension is resolved.

The difficulty is that "native" is defined by a page we have not seen. The widget is
authored once and rendered on many storefronts, each with its own typography,
palette, density and radius. We cannot enumerate them, cannot test against them, and
in the general case cannot ask them anything at render time.

So the real question is narrower than "how do we match the host page." It is:

> **What do we actually know about the host page, how confident are we in each thing
> we think we know, and what do we render when we know nothing at all?**

---

## Decision

Three commitments, in priority order.

### 1. Adapt through a confidence cascade

Theme values resolve through four layers, each falling back to the next:

```
merchant config  →  CSS custom properties  →  bounded inference  →  crafted defaults
   (declared)         (declared by a dev)       (best-effort)         (always present)
```

- **Merchant config** — an optional `theme` object on the content payload. Highest
  confidence, because it is declared by the party who owns the brand.
- **CSS custom properties** — a merchant's developer overrides tokens from their own
  stylesheet, with no dashboard and no deploy on our side. This is the sanctioned
  inbound channel identified in ADR 0001.
- **Bounded inference** — deferred for now; see alternatives. If added, strictly
  limited to signals that are safe to read.
- **Crafted defaults** — a complete, considered theme that never depends on any layer
  above it existing.

**The bottom layer is the one that matters.** The widget must look excellent with
every upper layer absent, because for most merchants they will be. Adaptation is an
enhancement, never a dependency.

### 2. Match structure before skin

The strongest lever on native feel is **not colour**. It is proportion, density,
rhythm and restraint — spacing scale, type scale, line-height, corner radius, and how
much air the component occupies.

A widget carrying the exact brand hex with the wrong density still reads as foreign.
A widget in neutral greys that matches the page's spacing rhythm reads as native.

Structural properties are also the safer thing to adapt. Mismatched spacing looks
slightly off; mismatched colour looks broken. So the default theme is tuned first to
the host page's *structure*, and only then to its palette.

The target page's design language, read directly from its stylesheet:

| Token | Value |
|---|---|
| Type family | `Georgia, 'Times New Roman', serif` |
| Surface | `#fdfcf9` |
| Muted surface | `#ece7dd` |
| Ink | `#2b2b2b` |
| Muted ink | `#4a4a4a` |
| Hairline | `#e4ddcf` |
| Radius | `4px` — tight, not rounded |
| Body rhythm | `line-height: 1.7` |
| Accents | Uppercase, `1–2px` letter-spacing |

The character is quiet, warm and restrained. A rounded, high-chroma, sans-serif card
would be perfectly isolated and would still fail this requirement.

### 3. Legibility overrides adaptation, without exception

Any externally supplied colour is validated before it is used. If a supplied
`surface`/`ink` pair falls below the WCAG 2.2 AA threshold — 4.5:1 for body text,
3:1 for large text and non-text indicators — the pair is rejected and the default is
used instead.

```js
// WCAG 2.2 relative luminance, sRGB
const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
```

Being slightly off-brand is a cosmetic cost. Being illegible is an accessibility
failure, and one we would have introduced ourselves through a feature intended to
help. The default pair — `#2b2b2b` on `#fdfcf9` — clears AA at roughly 13.8:1.

### The token contract

The theming surface is a small, closed set. Nine tokens, all optional:

```css
--hl-surface        /* primary background      */
--hl-surface-muted  /* secondary fill          */
--hl-ink            /* primary text            */
--hl-ink-muted      /* secondary text          */
--hl-border         /* hairlines               */
--hl-accent         /* interactive / active    */
--hl-radius         /* corner radius           */
--hl-font           /* type family             */
--hl-space          /* base spacing unit       */
```

Deliberately small. A narrow token set is a contract that can be supported and
reasoned about; an open one becomes an unbounded support burden and quietly turns
every internal styling decision into public API.

---

## Alternatives considered

### A. Runtime inference — read the host's computed styles

Probe the page and derive its design language:

```js
const body = getComputedStyle(document.body);
body.fontFamily;       // "Georgia, 'Times New Roman', serif"
body.backgroundColor;  // "rgb(253, 252, 249)"
```

Appealing, because it needs nothing from the merchant. **Deferred**, because
confidence collapses the moment it leaves the page we can see:

- **Element identification is guesswork.** This page's primary action is `.btn`. The
  next store's is `.button--primary`, or `.AddToCart`, or a bare `<button>`. Every
  probe is an assumption about markup we have never seen.
- **It cannot be tested.** Each merchant produces a different result and we can
  predict none of them. Our tests cover one page; production covers thousands.
- **Timing is unreliable.** Computed values depend on webfonts and stylesheets having
  loaded. Read too early and we capture fallbacks; read too late and the shopper
  watches the widget restyle itself.
- **It costs measurable performance.** `getComputedStyle` forces style recalculation.
  Probing several elements is precisely the layout jank we are asked to avoid.
- **It can actively harm.** Inheriting a dark surface alongside our default dark ink
  produces unreadable text — an accessibility regression caused by a feature meant to
  improve fit.

If it is added later, it should be bounded to two signals with genuinely high
confidence — `font-family` from `body`, and background luminance to select a light or
dark variant — and every inferred value must still pass the contrast gate above.

### B. Hard-code to the provided page

Cheapest, and correct exactly once. Rejected because the brief describes content
"supplied per merchant"; a widget that only looks right on one storefront has not
solved the stated problem, it has decorated a single mock.

### C. Deliberate neutrality — do not adapt at all

Ship one restrained, high-craft design that coexists with anything, and never attempt
to match. This is a legitimate strategy with a sharp argument behind it: **a near-miss
reads as broken, while a confident neutral reads as intentional.** Getting a brand
colour 15% wrong does more damage than never attempting it.

Not chosen outright, but absorbed: it is exactly what the bottom layer of the cascade
is. The defaults are built to stand alone as a deliberate, finished design rather than
as a placeholder awaiting configuration.

---

## Consequences

### Positive

- The widget looks considered on the target page **and** degrades to a coherent
  design anywhere else. There is no configuration cliff.
- Merchants get two levels of control — a data payload for non-technical users, CSS
  custom properties for developers — without either requiring a release from us.
- Legibility is guaranteed by construction, not by merchants configuring carefully.
- The theming surface is nine tokens, so the internal implementation stays free to
  change without breaking anyone.

### Negative — accepted

- **Most merchants will never configure anything**, so in practice the defaults carry
  almost all of the load. Mitigated by treating them as the primary design work
  rather than as fallbacks.
- **The widget will not perfectly match every store.** Accepted deliberately: a
  restrained near-match that respects the page's density is a better outcome than a
  fragile impersonation that fails unpredictably.
- **Rejecting a merchant's failing colour will occasionally surprise someone** who set
  a value and does not see it applied. Mitigated by warning once to the console in
  development builds, explaining which pair failed and at what ratio.
- **A token contract is public API.** Renaming `--hl-ink` later is a breaking change.
  Accepted as the cost of offering a stable theming surface at all, and the reason the
  set is small.

---

## Notes

- Dark mode is out of scope for now. The default theme is tuned light to match the
  target page. `prefers-color-scheme` would be the natural extension, and the token
  contract already accommodates it without structural change.
- This ADR governs *visual* fit only. Behavioural fit — pacing, gesture, focus
  handling — is the subject of the interaction-pattern decision.
