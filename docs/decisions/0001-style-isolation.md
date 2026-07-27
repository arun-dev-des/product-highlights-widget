# ADR 0001 — Style isolation via Shadow DOM

- **Status:** Proposed
- **Date:** 2026-07-28
- **Applies to:** The embeddable product highlights widget

---

## Context

This widget is third-party code. It is authored once and injected into storefronts
built by other people, whose markup and CSS we do not control and cannot review.
That single constraint drives everything below.

The mock host page demonstrates the hazard precisely. Its stylesheet claims some of
the most collision-prone class names on the web:

```css
.container { max-width: 1080px; padding: 32px 24px; }
.card      { border: 1px solid #e4ddcf; border-radius: 4px; padding: 16px; margin: 16px 0; }
.title     { font-size: 34px; font-weight: 400; }
.btn       { background: #2b2b2b; color: #fff; text-transform: uppercase; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color: #2b2b2b; }
```

The risk runs in both directions, and both directions are unacceptable:

- **Inbound.** If our widget uses a class named `card` or `title`, the merchant's
  rules deform it — unexpected borders, wrong padding, wrong type scale. The widget
  looks broken through no fault of its own.
- **Outbound.** If our stylesheet *defines* `.card`, we silently restyle the
  merchant's add-to-cart container. We would be shipping a visual regression into a
  live storefront's checkout path. This is the worse failure by a wide margin: it is
  our bug, on their revenue.

A second constraint pulls against the first. The widget must feel **native** — as
though the merchant's own designer built it. So the goal is not maximum isolation.
It is *selective* isolation: an impermeable barrier against accidental collision,
with deliberate, narrow channels for intentional theming.

---

## Decision

**Attach an open-mode shadow root to the mount element and render the entire widget
inside it.**

```js
const shadow = mountEl.attachShadow({ mode: 'open' });
```

All markup and all styles live inside that boundary. The widget ships no global CSS
and registers no globals on `window`.

---

## Alternatives considered

### A. Prefixed or hashed class names (BEM, CSS Modules, `.hl-*`)

Zero runtime cost, works everywhere, no new concepts. Rejected because **class
prefixing only defends against class-name collisions**, and that is a fraction of
the attack surface. It offers no protection against:

- element selectors — `div { margin: 20px }`, `p { line-height: 2 }`
- the universal selector — `* { box-sizing: border-box }`, present in the mock page
- attribute and descendant selectors — `.details > * { margin-block: 1em }`
- `!important` from an aggressive theme or a third-party app the merchant installed
- CSS resets and normalisers loaded after us

It also relies on discipline rather than a mechanism. Every future contributor must
remember the convention; the boundary holds only as long as no one forgets. A
mechanism that cannot be forgotten is worth more than a convention that can.

### B. iframe

The only option offering true isolation, including JavaScript. Rejected on fit, not
on strength — the isolation is *too* total for an inline component:

- The content is a separate document, so it cannot overflow its own box. Any
  focus ring, tooltip, expanding panel or shadow that extends past the frame is
  clipped.
- Height must be synchronised manually via `postMessage` + `ResizeObserver`. This is
  a persistent source of layout shift and flicker on font load and on resize —
  directly at odds with the performance requirement.
- Typography cannot inherit from the host page, so "feels native" becomes harder,
  not easier.
- Assistive-technology traversal across a document boundary is workable but
  measurably clumsier than a same-document subtree.
- It carries the cost of a second document context for what is, in the end, five
  short pieces of text.

This is the right call for a chat launcher or a payment field, where the isolation
requirement genuinely outranks visual continuity. It is the wrong call here.

### C. CSS-in-JS with generated scoped names

Same protective ceiling as option A — it solves naming, not inheritance or element
selectors — while adding a runtime dependency and injecting styles into the host
document's `<head>`, which is the very thing we are trying to avoid touching.

### D. Shadow DOM — **chosen**

A native browser primitive that enforces the boundary at the selector-matching
level, in both directions, at effectively zero byte cost and with no dependency.

---

## How the boundary actually behaves

The isolation is precise rather than absolute, and the precision matters. Shadow DOM
blocks **selector matching** across the boundary. It does not block everything.

Three things cross by design:

| Channel | Direction | Why it exists |
|---|---|---|
| **Inherited properties** — `font-family`, `color`, `line-height`, `letter-spacing`, `visibility`, `cursor` | Inward | So embedded content can pick up the page's typographic context |
| **CSS custom properties** — `--hl-surface` | Inward | The sanctioned theming channel |
| **`::part()` / `::slotted()`** | Outward | Explicitly opted-in styling hooks |

We use all three deliberately rather than fighting them.

**Inheritance is reset at the root, then rebuilt.** `:host` is given an explicit
baseline so the widget's rendering does not depend on the host page's `body`
declarations:

```css
:host {
  all: initial;      /* sever every inherited value */
  display: block;    /* `all: initial` resets display to inline — restore it */
}
```

Nothing renders differently because a merchant chose Georgia over Helvetica. Every
typographic value inside the widget is one we chose.

**Theming is exposed as custom properties.** A merchant can retheme the widget from
their own stylesheet without any knowledge of its internals, and without us
exporting a single class name:

```css
/* inside the shadow root */
.surface { background: var(--hl-surface, #fff); color: var(--hl-ink, #2b2b2b); }
```
```css
/* the merchant's stylesheet */
#widget-slot { --hl-surface: #fdfcf9; --hl-ink: #2b2b2b; }
```

This resolves the isolation-versus-native-feel tension cleanly. Accidental influence
is blocked; intentional influence has a documented front door.

---

## Consequences

### Positive

- Neither page can break the other by accident. The failure mode that would damage
  a merchant's checkout is structurally impossible, not merely unlikely.
- Class names inside the widget can be short and semantic — `.card`, `.title` — with
  no prefix ceremony, because they cannot escape.
- No CSS is injected into the host document. Our footprint on their page is one
  element.
- Zero bytes and zero dependencies: a native platform feature, universally supported
  in current browsers.
- Constructable stylesheets (`adoptedStyleSheets`) let one parsed stylesheet be
  shared across multiple instances rather than re-parsed per instance.

### Negative — accepted, with mitigations

- **It is not a security boundary.** With `mode: 'open'`, any script on the page can
  reach `el.shadowRoot` and read or mutate the tree. `mode: 'closed'` does not fix
  this — it is trivially defeated by patching `Element.prototype.attachShadow` before
  our script runs — while costing real debuggability and testability. We chose `open`
  and accept that a hostile host page can interfere. Only an iframe would prevent
  that, and per option B its costs outweigh a threat that is not in our model: the
  merchant installed us on purpose.

- **The host element itself sits in the light DOM.** The shadow root protects its
  contents, not the mount point. A merchant rule such as `.details div { margin: 20px }`
  matches our host element, and for normal declarations the outer tree wins over
  `:host`. *Mitigation:* the host element carries no layout responsibility. All
  layout, spacing and sizing is applied to a wrapper **inside** the shadow root,
  which is fully protected. The host element is a positioning anchor and nothing
  more, so whatever the merchant does to it is absorbed harmlessly.

- **Inheritance requires an explicit reset**, which is easy to forget and produces
  confusing bugs when omitted. *Mitigation:* the `:host` reset above is the first
  rule in the stylesheet, with a comment stating why.

- **Debugging is slightly less direct** — `document.querySelector` cannot see inside,
  and DevTools requires expanding the shadow root. Acceptable, and the same property
  that makes the boundary trustworthy.

- **Contributors need to understand shadow boundaries** to work on the widget
  confidently. This ADR is part of that mitigation.

---

## Notes

- Shadow DOM v1 is supported across all current browsers; no polyfill is required.
  The legacy `webcomponents/polyfills` shims exist for Internet Explorer 11, which
  reached end of support in June 2022 and is out of scope.
- Shadow DOM is unrelated to the Virtual DOM despite the shared word. One is a
  browser encapsulation primitive; the other is a userland rendering optimisation.
- Shadow DOM is used here **without** Custom Elements. The two specs are independent:
  a shadow root can be attached to any ordinary element, which suits a mount point
  the host page has already provided.
