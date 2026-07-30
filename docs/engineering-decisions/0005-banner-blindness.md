# ADR 0005 — Banner blindness and the visual seam

- **Status:** Accepted — partially implemented. Revises the pricing of one claim in
  ADR 0002 and relocates one alternative it deferred.
- **Date:** 2026-07-30
- **Applies to:** The embeddable product highlights widget
- **Related:** [ADR 0001 — Style isolation](./0001-style-isolation.md) ·
  [ADR 0002 — Theming and native feel](./0002-theming-and-native-feel.md) ·
  [ADR 0003 — Declared placement](./0003-declared-placement.md) ·
  [ADR 0004 — Layout from the measure](./0004-layout-from-the-measure.md)

> **What this record changes.** ADR 0002 §3 states that *"being slightly off-brand
> is a cosmetic cost."* That is the claim this ADR revises. Off-brand is not
> cosmetic — it is the signal that classifies the widget as an advertisement before
> a shopper reads a word of it, and content classified that way is filtered
> automatically. Visual mismatch is therefore an **attention** failure, and the
> largest design risk in the product.
>
> Two consequences. ADR 0002's crafted defaults are not neutral — they are a copy
> of one storefront's tokens, which makes the seam the *default* outcome (§2).
> And its alternative A, runtime inference, is rejected again but **relocated**:
> the objections were about timing, not about the idea (§7).

---

## Context

The widget is injected into a page the shopper did not ask us to change, in a
medium where twenty years have trained them to discard injected content. Banner
blindness is not a failure of a design being ugly. It is a *learned, automatic*
filter applied ahead of and independently of reading.

The evidence is unusually durable for this field. NN/g documented it in 1997 and
replicated it by eyetracking in 2007 and again in 2018 — three decades, same
result. The number worth carrying:

> Of the **132 fixations** a participant spent inside one page's content area,
> exactly **one** landed in the right rail — 0.8% of their attention for 25% of
> the area.
> — Pernice, *Banner Blindness: Old and New Findings*, NN/g, 2018

The mechanism is **selective attention**: people direct focus to what serves the
task in front of them and discard the rest, on cues cheap enough to evaluate
before reading. The article names three such cues:

| Cue | NN/g's description | Our exposure |
|---|---|---|
| **Visual treatment** | animation, coloured backgrounds, fancy formatting, small rectangular shapes | **the primary risk — see below** |
| **Location** | top banner, right rail | low; we place inline and bottom-centre |
| **Proximity to ads** | items near real ads are ignored by association | **merchant-controlled, invisible to us** |

The finding that governs this record is the first one, and NN/g states it as a
general rule:

> **"Anything that stands out from immediate surrounding context is likely to be
> considered an ad."**

Note *immediate surrounding context*. Not "looks like an advert" in the abstract —
**differs from its neighbours.** The article's two worked examples are both
legitimate content that went unread for exactly that reason: a promotion inside an
article, skipped for its "fancy formatting and coloured (blue) background against
the white page"; and an installation-information section skipped because it
"looked very different from the white page background and images."

Neither was an advertisement. Both were filtered as one. That is the failure mode
available to this widget on every store it renders on, and the corresponding NN/g
recommendation is close to a specification for our token contract:

> **"Do not make content look like ads. Choose colors, type, background, and
> overall content style carefully."**

Colours, type, background, style — `--hl-ink`, `--hl-font`, `--hl-surface`,
`--hl-radius`. The theming surface from ADR 0002 *is* the banner-blindness
surface. They were never two problems.

### The seam is louder in some properties than others

Ranked by how strongly each declares *inserted*:

| Property | Why it leaks | Loudness |
|---|---|---|
| **Radius** | rounded cards are the native idiom of advertising; NN/g names "small rectangular shapes" outright | highest |
| **Elevation** | a shadow on a flat page is a floating object, and floating objects are ads | highest |
| **Background** | the Baryshnikov and generac cases were both *background* against the page | highest |
| **Type family** | the most visible mismatch — sans-serif on a serif page is unmistakably pasted | high |
| **Chroma** | a saturated accent on a muted palette is the loudest colour tell | high |
| **Density and rhythm** | matching colours cannot rescue wrong spacing; reads foreign without the shopper being able to name why | high, easily missed |
| **Type scale and weight** | our 16px against their 15px; unease rather than recognition | moderate |
| **Icon style** | filled against stroke, different optical grid | low, cumulative |

ADR 0002 §2 ordered this correctly — *structure before skin* — from a weaker
premise, that mismatched spacing merely "looks slightly off." The stronger reason:
**structural cues act pre-consciously**, so getting them wrong costs attention
silently, with nobody complaining to tell us it happened.

### Why the seam is our default state, not an edge case

ADR 0002 specifies a four-layer cascade. **Two of four ship:**

| Layer | Status | Needs from the merchant |
|---|---|---|
| 1 — payload `theme` block | not built | — |
| 2 — CSS custom properties | ships, with a configurator | someone to open it and decide |
| 3 — bounded inference | not built | — |
| 4 — crafted defaults | ships | nothing |

Layer 2 is real and good: [`design-starter/theme-panel.js`](../../design-starter/theme-panel.js)
generates the block live, grades every rendered pair against WCAG AA, and adds
zero bytes to the widget. [Stress page 03](../../stress/03-dark-theme.html) proves
the contract carries a total re-theme — dark palette, Helvetica, 10px radius.

So the mechanism to eliminate the seam exists. What does not exist is any way to
know *what to match* without a human deciding it. And layer 4, the layer that
renders when nobody decides anything, is this:

| Token | Default | Mock host page |
|---|---|---|
| `--hl-font` | `Georgia, 'Times New Roman', serif` | [host-page.html:18](../../design-starter/host-page.html#L18) — identical |
| `--hl-ink` | `#2b2b2b` | [:19](../../design-starter/host-page.html#L19) — identical |
| `--hl-border` | `#e4ddcf` | [:83](../../design-starter/host-page.html#L83) — identical |
| `--hl-radius` | `4px` | [:84](../../design-starter/host-page.html#L84) — identical |

Four of nine tokens are byte-identical to the sample page, and `--hl-shimmer`'s own
comment says it "echoes the page's own #b3a894 / #e4ddcf warmth."

**The crafted defaults are not a neutral theme. They are a copy of one storefront's
design language** — which is ADR 0002's explicitly *rejected* alternative B
("hard-code to the provided page") arriving through the back door, expressed as
tokens rather than literals. ADR 0002 rejected that as having "decorated a single
mock," and then built the layer it calls "the one that matters" out of it.

Two things are true at once, and both belong here:

- **For this deliverable it is right.** The widget is reviewed on that page, and
  matching it is the job. `--hl-surface: transparent` is genuinely excellent — it
  inherits whatever it sits on rather than asserting anything.
- **As a general default it manufactures the seam.** An unconfigured widget does
  not merely fail to match; it confidently asserts *someone else's* serif, warm
  hairline and radius. **Confidently wrong is worse than neutral**, because a
  neutral surface has nothing to clash with and a warm editorial serif clashes with
  most of the web.

ADR 0002 answered this in advance — *"the widget must look excellent with every
upper layer absent"* — but that tests the wrong property. *Excellent* and *belongs
here* are different, and per NN/g only the second survives the filter. A widget can
be genuinely excellent and unmistakably foreign, and foreign is what goes unread.

Hence the revision: adaptation was called *"an enhancement, never a dependency."*
For legibility, true. For attention, adaptation is much closer to a dependency.

### The one place we do exactly what NN/g warns against

```
--hl-surface-raised: #ffffff;   /* toast pill, badge, avatar ring */
```

On the mock page that is pure white on `#fdfcf9` cream. It is the article's trigger
precisely: a raised surface standing out from its immediate context.

It is also partly *justified* — a floating element needs separation from the content
it floats over, and the badge needs to hold against a photograph. The problem is not
that it separates; it is that the separation is **fixed at white instead of derived
from the merchant's own surface.** On a cream page it should be a lighter cream. On
a dark store it should be a lighter dark, and with no `prefers-color-scheme` in the
build it stays white — a white pill on a dark page, which is the maximum available
value of "stands out from immediate surrounding context."

### The risk we cannot see: spillover

The article's least obvious finding is the most uncomfortable one for an embedded
product. Blindness **transfers between sites** by availability bias — having met
ads in a rail on one site, people skip that rail on others, and the article records
a participant who missed the hiking content they were looking for because it shared
a rail with advertising. Proximity poisons neighbours.

Two consequences we do not control:

- **The filter arrives pre-installed.** It is trained by the rest of the web and
  imported onto the merchant's page. Nothing we ship builds it and nothing we ship
  can untrain it; we can only avoid matching its triggers.
- **The merchant chooses our neighbours.** ADR 0003 makes placement declarative,
  which is right for every other reason — and it means a merchant can mount us
  beside their own promo rail, where we inherit its blindness by association. NN/g's
  third recommendation is "do not mix content and ads in the same visual section,"
  and we are not the party who decides that.

### The far end, noted and not relied on

A separate literature holds that content perfectly indistinguishable from its
surroundings is skipped as *chrome* — boilerplate below the button that is always
there and never says anything. **This article does not support that**, and its
guidance runs one direction only: do not stand out. It is recorded here as a
boundary on §1–§3 rather than as a finding, and §6 is the only clause addressed to
it. Where the two conflict, the measured result wins.

### A cost that is not ours to pay

An ad-shaped element does not merely go unread; it makes the merchant's page look
cheaper. ADR 0001 worried about breaking their CSS. This is the same outbound risk
one layer up — **breaking their credibility** — and it is worse, because no stress
page will ever catch it.

---

## Decision

**The seam is the threat. Close it structurally, default to neutral rather than to
somebody else's brand, and buy the glance with relevance rather than contrast.**

### 1. Visual mismatch is an attention failure, and is priced as one

A theming gap is not cosmetic backlog. It is the mechanism by which the widget goes
unread, which makes it a failure of the whole component regardless of how well the
rest is built. This ranks theming work above further visual refinement *inside* the
widget: a plainer list in the right type family is worth more than a beautifully
set one in the wrong.

### 2. The unconfigured default must be neutral, not borrowed

Layer 4 gets rebuilt to assert as little as possible — `system-ui`, a grey hairline,
minimal radius, a raised surface derived from the ambient background rather than
fixed white. The current warm-serif theme ships on as an **opt-in preset**, which is
what it actually is.

This is the cheapest of the three fixes and the only one that reaches merchants who
never configure anything — which, per the cascade above, is most of them. It is also
the honest resolution of ADR 0002's alternative B: a sample-page theme is a fine
*preset* and an indefensible *default*.

### 3. Close the seam in order of loudness

Work down the table in Context, not across the token list. In practice: **radius,
elevation, background and type family before palette nuance.** Those carry most of
the "inserted" signal, and all four are already tokens.

`--hl-surface-raised` specifically stops being a fixed hex and becomes a value
derived from the surface the element floats over — the minimum separation that keeps
a floating pill readable, rather than a fixed white that guarantees a seam.

### 4. Buy the glance with relevance, not contrast

The mechanism is selective attention, so the counter to it is **task relevance**,
not visual prominence. ADR 0003 already pulled this lever for content reasons; it
does the attention work too.

| Fact | Hesitation it answers | Where it goes |
|---|---|---|
| Delivery, guarantee, fit | *should I buy this* | beside the buy action |
| Traceable merino | *what is this made of* | on the product image |
| Loved by 3,100+ buyers | *is this a good choice* | the one item that earns an interruption |

A delivery promise beside the buy action is not competing for attention — it answers
a question the shopper is already holding, so it reads as part of the decision
rather than as an interruption of it. This is why ADR 0003's refusal to derive
placement from `type` matters twice over: only the merchant knows where the question
is asked on their page.

### 5. One moment of motion, spent on arrival

NN/g names animation as a blindness cue, so the widget gets one and spends it once:

```css
/* Runs once, when the list first scrolls into view, to lead the eye down the
   column in reading order. */
.list[data-enter] .item {
  transition: opacity 460ms var(--_ease), transform 460ms var(--_ease);
  transition-delay: calc(var(--i, 0) * 60ms);
}
```

Gated behind an `IntersectionObserver` at `0.15`. Six pixels of travel, 60 ms per
row — enough to register as *arriving*, not enough to read as advertising.

**Once is the point.** Repetition is not a stronger version of this; it is the cue
itself. An element that moves every few seconds teaches the shopper to classify that
region as decoration permanently — on the merchant's page, about the merchant's
page. A single stagger in reading order is orientation; the same animation looped is
a training signal against us.

### 6. Three boundaries

**Nothing that declares the element third-party.** No branding, no attribution mark,
no "powered by", no external-link glyph. Verified absent. This is the loudest
possible seam: an explicit statement that the content is somebody else's. The brief
forbids naming the company anyway; it would be right with no brief at all.

**No urgency, ever.** Countdown timers, "12 people are viewing this", pulsing
animation, interstitials over the buy action, exit-intent capture. These defeat
banner blindness — that is not in dispute, it is why they are everywhere. They work
by borrowing against the merchant's credibility and never repaying it, and we do not
get to spend a stranger's trust to make our component look effective.

**Keep one structural signal, and only one.** The concession to the far end: the
default list keeps its hairlines and no box —

> A hairline says *"a new section starts here."* A border says *"this is a separate
> object placed on your page."* The first is a convention the merchant's own
> designer would use; the second is the shape NN/g measured.

Also why the default is **static**: no dots, no arrows, no auto-advance. Carousel
blindness is the same filter on a moving surface, and `steps` is opt-in for this
reason as much as for ADR 0003's honesty reason.

### 7. Inference belongs at authoring time, in the configurator

ADR 0002 rejected runtime inference on five grounds. Every one is an objection to
*when* it runs, not to *what* it computes:

| ADR 0002's objection | At runtime, per shopper | In the panel, once, at install |
|---|---|---|
| Element identification is guesswork | fatal | a human confirms or corrects it |
| It cannot be tested | fatal | tested by whoever watches the preview |
| Timing is unreliable (webfonts, stylesheets) | fatal | page fully loaded; take as long as needed |
| Costs performance (`getComputedStyle` reflow) | fatal | zero shopper cost — not in the bundle |
| It can actively harm (dark surface, dark ink) | fatal | the panel's contrast gate already catches it |

**Runtime inference stays rejected. Authoring-time inference is the plan**, and the
panel is already the right home for it — ADR 0002 records that the contrast gate had
to live there because a configurator "is the first point in the cascade where a value
exists before it is used." The same sentence is the argument for putting inference
there.

The pipeline proposes tokens from the merchant's own page, a human approves them, and
the output is the static CSS block the panel already emits:

```
read the page  →  propose nine tokens  →  human reviews in the panel  →  static CSS  →  layer 2
```

Two constraints. **Nothing ships to the shopper** — no model call on a storefront page
load, no bytes, no dependency; the widget is unchanged. And **inference selects or
inherits, never invents**: a font stack copied verbatim, a light-or-dark variant
chosen, never an interpolated palette. A wrong inference must degrade to the neutral
default of §2, never to a confidently wrong theme.

Reading rendered *appearance* rather than parsing CSS is the better route for the
loudest properties — radius, elevation and density are computed across many rules —
with the caveat that it means sending a merchant's page image somewhere, which is a
privacy decision before a technical one.

**The cheap half first.** `prefers-color-scheme` is one media query with none of the
original objections: no probing, no timing, no measurement, and the token contract
already accommodates it. ADR 0002 put dark mode out of scope. On a dark storefront a
light widget is not a seam, it is **a hole punched in the page**.

---

## Alternatives considered

### A. Stand out deliberately — a container, a tint, an accent

Make it visually distinct so it cannot be missed. This is not merely rejected, it is
**the thing the research measures**. NN/g's blue-box and generac cases are exactly
this strategy failing on legitimate content: the glance it wins is the glance that
classifies and discards it. ADR 0002 observed that a near-miss on brand colour reads
as broken; the measured version is that a deliberate mismatch reads as an
advertisement, and advertisements are not read. It also spends the merchant's page
quality to buy our attention, inverting the priority the product rests on.

### B. Deliberate neutrality — one restrained design, no adaptation

ADR 0002's alternative C, re-examined because it is the strongest argument against
§7: a confident neutral reads as intentional while a near-miss reads as broken.

**Absorbed into §2, insufficient alone.** It is a sound answer to the *palette*
problem and no answer to the seam, because neutrality is a claim about colour and
the loudest cues are structural. A chromatically neutral widget with the wrong
radius, type family and density is still unmistakably inserted. Neutral has to mean
*structurally quiet*, which is what §2 and §3 ask for and what the current defaults
achieve on exactly one page.

### C. Trust native feel as already specified in ADR 0002

Rejected on the distinction between specified and delivered. The cascade is right;
its coverage is two layers, and one of those two is a copy of the sample page.

### D. Runtime inference — ADR 0002's deferred alternative A

**Rejected again, on ADR 0002's own five objections**, which remain correct. Relocated
rather than revived — see §7 and alternative E.

### E. Authoring-time inference inside the configurator — **chosen, and queued**

Dissolves all five objections by moving the work off the shopper's device and putting
a human in the loop. Not built in this iteration; it is a roadmap item rather than a
24-hour one, and the brief warns explicitly against over-building. Recorded here with
the reasoning that justifies it.

### F. Measure it — dwell and interaction telemetry

The only alternative that could *settle* any of this. **Deferred, not rejected**, and
bigger than it looks: third-party telemetry on a stranger's storefront is a privacy,
consent and performance commitment before it is a product one, and the data would have
to be the merchant's, collected on their terms.

---

## Consequences

### Positive

- The threat has a name, a measurement and a citation, so it can be argued with
  rather than asserted. "Add a border so people notice it" now has to beat a
  three-decade eyetracking result.
- Theming is repriced from polish to correctness, which puts it above further visual
  refinement inside the widget in any future queue.
- §2 is small, mechanical and helps every merchant who never opens the panel — the
  majority. It needs no new architecture, only different values and a preset.
- ADR 0004's hairlines and ADR 0002's structure-before-skin rule become load-bearing
  in two records at once, and are less likely to be unwound by someone who read only
  one of them.
- §7 converts a deferred idea into a specified one without adding a byte to the
  shopper's page, and it lands in a tool that already exists.
- The dark-pattern boundary is written down *before* anyone is under pressure to make
  the widget look like it is working, which is the only time such a boundary is worth
  anything.

### Negative — accepted

- **The reasoning is ahead of the code.** §2, §3 and §7 all describe work not done.
  Until they are, the widget's behaviour on an unknown store is unchanged by this
  record. That is the honest status of the whole thing.

- **No measurement of our own.** Every claim here rests on published research about
  other people's pages plus reasoning about ours. No dwell data, no read-rate,
  nothing distinguishing "read and understood" from "scrolled past politely." The one
  alternative that could settle it is deferred.

- **`--hl-surface-raised: #ffffff` currently does the exact thing the article warns
  against**, and with no `prefers-color-scheme` a dark store gets a white pill. Known,
  specified in §3, not yet fixed.

- **The defaults remain a copy of the sample page** until §2 lands: Georgia,
  `#2b2b2b`, `#e4ddcf`, 4px. Excellent there; a confident seam anywhere else.

- **Spillover is unfixable from inside the widget.** The filter is trained by the rest
  of the web, and the merchant chooses which neighbours we sit beside. Placement
  guidance in the embed documentation is the only lever, and documentation is the
  weakest control available.

- **Inference can make the seam louder.** ADR 0002's objection is not dissolved by
  relocating it: a wrongly inferred value is a *confident* mismatch, worse than a
  neutral one. The §7 bounds exist to cap that and have been tested against no real
  storefronts, because we have none.

- **No frequency capping and no memory of dismissal.** The build touches no storage —
  zero references to `localStorage`, `sessionStorage` or `document.cookie`, and
  `toastShown` is module scope, resetting every page load. A shopper who dismisses the
  toast gets it back on the next product page. Repeated dismissal is a training signal
  and we supply it. One persisted flag fixes it.

- **Mobile is the harder case and is least addressed here.** NN/g finds inline mobile
  ads harder to avoid, and that people mistake large images and graphics for ads
  *before* examining them. The brief asks for mobile-first; the badge-on-image surface
  is precisely a graphic overlaid on a graphic, and nothing in this record improves it.

- **`simple` makes rows more chrome-shaped.** Withholding bodies (ADR 0004 §3) leaves
  short label rows, and short label rows under a buy action are what shoppers read as
  shipping boilerplate — a second, independent reason not to reach for a layout that
  was already opt-in.

- **This record pulls against ADR 0002 by design.** Read alone, 0002 optimises toward
  a borrowed theme and 0005 toward a quiet one. The coupling lives only in the Related
  lines at the top of each file, and documentation dependencies decay.

---

## Notes

- **Source.** Kara Pernice, *Banner Blindness: Old and New Findings*, Nielsen Norman
  Group, 22 April 2018. Documented 1997, eyetracked 2007 and 2018. The right-rail
  figure is one participant on one page — one fixation in 132, or 0.8% of their
  attention for 25% of the content area — not a study-wide aggregate. That figure
  and both faux-ad cases are from that article; the three cues in Context are its
  framing, mapped onto our surfaces.
- **What the research does *not* say.** It offers no support for the idea that
  blending in too well is a risk, and its recommendations run one direction only.
  Where the far-end argument in Context conflicts with the measured result, the
  measured result wins.
- **Division of labour.** ADR 0002 governs whether the widget *fits*; ADR 0004
  whether it *reads*; this one whether it is *seen*. All three can hold at once, and
  satisfying two while ignoring the third is a coherent-looking failure.
- **Not covered here:** whether the content deserves attention once it has it. Five
  true, specific, non-boastful facts is a decision the payload makes, and no amount of
  theming rescues marketing filler — the fastest route to blindness is still to
  deserve it.
- **Queue, in order.** (1) `prefers-color-scheme` — one media query, no new risk.
  (2) Neutral defaults plus the warm-serif preset (§2). (3) The persisted dismissal
  flag. (4) Derived `--hl-surface-raised` (§3). (5) Authoring-time inference in the
  panel (§7). The first four are small; only the fifth needs the argument in this
  record to justify it.
