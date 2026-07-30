# Design Decisions

A UX and UI record: the reasoning behind the experience, from the shopper's state
of mind down to the pixel values. Written from the design side — the engineering
counterparts are the [five ADRs](decisions/), and where a decision has both faces I
point at the record rather than repeat it.

The order here is the order the decisions actually happened in. Each one narrows the
next.

---

## 1. The shopper I designed for

**A shopper on a product page is not just reading. They are deciding whether to buy.**
The widget provides data-driven information that helps them decide, and improves
conversion for the merchant's store.

## 2. The biggest risk is not that it looks bad. It is that it is never seen.

The first threat I take seriously in this product is **banner blindness**.

**What it is.** A long-known web user behaviour: people's tendency to ignore page
elements they perceive — correctly or incorrectly — to be ads. Users have learned to
ignore content that resembles ads, sits close to ads, or appears in locations
traditionally dedicated to ads.

**It is measured, not a metaphor.** NN/g documented it in 1997 and replicated it by
eyetracking in 2007 and again in 2018 — three decades, same result.

**And it catches legitimate content.** Elements that merely carry ad-like
characteristics are filtered along with the real ads — which is the entire reason any
of this applies to a widget that is not an ad.

NN/g names three traits that signal *ad* to a reader:

1. **Ad-specific placement** — the top of the page, or the right rail
2. **Ad-like visual treatment** — animation, coloured backgrounds, fancy formatting,
   small rectangular shapes
3. **Proximity to actual ads**

### 1. Ad-specific placement

A sponsored result at the top of a Google results page, or a banner pinned to the
bottom of an Android app, are both good examples of ad-specific placement.

*Each red dot is one **fixation** — a moment where the eye stopped and rested, the
unit for* actually looked at. *The lines between them are saccades, during which a
person sees nothing. The sponsored result here collects none of them, and note where
it sits: **top of the page, above the fold, first in reading order.** The best
position available. It was not out-competed for attention; it was skipped, and what
identified it was how it looked.*

![An NN/g eyetracking gaze plot over a Google results page: dense numbered fixation circles across the featured snippet, "People also ask" and the organic results, and none at all on the sponsored result at the top](./images/google-sponsored-ad.png)


The scale of it, on a third page in the same study — a travel site, not the two shown
here: of the **132 fixations** a participant spent inside the content area, exactly
**one** landed in the right rail. That is 0.8% of their attention for 25% of the
area. Not "noticed less." A quarter of a page, functionally invisible.

*The same effect across 26 people on one page. Red marks the areas that got the most
fixations, yellow a moderate number, blue the fewest — and **areas with no overlay
colouring received no fixations at all.** The text was read heavily. The top banner
and the whole right rail have no overlay whatsoever.*

![An NN/g heatmap over an Apartment Therapy article: heat covering the body text and how-to photographs, with the top banner ad and the entire right rail left completely uncoloured](./images/blog-eye-tracking.png)


### 2. Ad-like visual treatment — the trait my widget actually faces

Placement is the merchant's decision. Proximity is the merchant's decision. **How the
widget looks is mine alone**, which makes this the one trait I can fail at entirely on
my own — and the one worth designing against.

Look again at the Google gaze plot above. That ad had the *best* position on the
page — top, above the fold, first in reading order — and still collected nothing. Its
placement was ideal. What gave it away was how it looked.

**And "ad-like" is relative, not absolute.** This is the part that catches embedded
software specifically: **a widget does not have to look like an advertisement to be
filtered as one. It only has to look like it did not come with the page.** NN/g's
wording, quoted below, is *immediate surrounding context* — the comparison is always
against the neighbours, never against some universal template of what an ad looks
like.

So the signals fall into two kinds, and the second kind is the dangerous one.

**Ad-shaped almost anywhere:**

| Signal | Why it reads as an ad |
|---|---|
| A block at standard ad dimensions — 300×250, 728×90 | recognised before the content inside it is read |
| A bordered box with its own background, sitting inside the content column | the shape of nearly every promo unit on the web |
| A rounded card with a drop shadow, floating over flat content | the native idiom of advertising |
| Anything that moves on a page where nothing else moves | animation is the original banner signal |

A 300×250 block is read as an ad *whatever is inside it*. Shape alone is sufficient.

**Ad-shaped only here** — identical design, opposite outcome depending on the store:

| Signal | Native when | A seam when |
|---|---|---|
| Serif type | the store sets serif | the store sets sans-serif |
| A 12px corner radius | the store rounds to 12px | the store rounds to 4px |
| A white surface | the page is white | the page is cream — or dark |
| A warm amber accent | the palette is warm | the palette is cool or neutral |

Nothing in that second table is a mistake in isolation. Each one is wrong only
*relative to a page I have never seen* — and that is the whole problem: **there is no
single appearance that is native everywhere.** A widget shipping one fixed design is
guaranteed to be a seam on most stores it lands on, however carefully that design was
made. Being tasteful is not a defence; being tasteful in someone else's house is still
being a guest who dressed for a different party.

Which is why theming is not decoration in this product — it is the mechanism by which
the widget stays readable at all. It is also why "make the unconfigured defaults
neutral" is near the top of section 12 rather than filed under polish: the widget
currently ships the sample storefront's serif, hairline and radius as its defaults, so
on every store that is not that one it asserts somebody else's design language.

Sections 6 through 9 are largely these two tables answered in reverse.

### 3. Proximity to actual ads

The trait I cannot control at all. Blindness spreads by association: a participant who
met sponsored stories in one site's right rail assumed the whole rail was advertising
and never looked at it again — losing the genuine content sitting beside them.

Since the merchant chooses where to mount the widget, they also choose its neighbours.
Land beside their promo strip and the widget inherits its blindness, having done
nothing wrong. Embed documentation is the only lever here, and documentation is the
weakest control there is.

**What triggers it** is stated in NN/g's findings about as plainly as anyone could
want:

> "Anything that stands out from immediate surrounding context is likely to be
> considered an ad."

So my design position is: **the widget's first job is to not look inserted.** Not to
be prominent, not to be beautiful in isolation, but to be unclassifiable as
third-party content — because this single thing decides whether the widget delivers
any of the business value in section 1. A highlight that is never read cannot help
anyone decide, and cannot convert.

This is argued in full, with what it costs and what the code still gets wrong, in
[ADR 0005 — Banner blindness and the visual seam](decisions/0005-banner-blindness.md).


## 3. The central call: distribute the content, do not sequence it

The brief offered a reel, a stories-style sequence, an expandable set of cards, or
something else. I chose something else, and this is the decision the whole design
rests on.

**The five facts are not five of the same thing.** Read them as a designer rather
than as a payload:

| Item | What it actually is | Where a designer would put it |
|---|---|---|
| Delivery, guarantee, fit | answers to purchase hesitation | beside the buy action |
| Traceable merino | a claim about the object | on the product image |
| Loved by 3,100+ buyers | social proof | somewhere it earns a moment |

![Ditributed Placements](./images/distributed_layout.png)

Any single sequenced container — reel, stories, carousel — asserts that these are
peers and that there is an order to move through them in. Both assertions are false,
and both cost the shopper something. So each item declares where it belongs and the
widget renders it there. ([ADR 0003](decisions/0003-declared-placement.md) covers the
mechanism and the fallback rule.)

### Why I rejected each named form

**A swipeable reel.** It puts the content behind a gesture. Four of five items are
then invisible until the shopper decides to work for them, at the exact moment they
have the least appetite for work. Carousel blindness is the same filter as section 2
applied to a moving surface, and the measured outcome for carousels is that content
past the first frame is close to unread. I am not going to hide four true things
behind a swipe to gain a layout that is more fun to build.

**A stories-style sequence.** Auto-advancing, timed, full-attention. It is a
borrowed pattern — the borrowing is from a context where the user opened the thing
deliberately and wants to be entertained. A shopper comparing sleeve lengths did not
open anything. Stories also take the clock out of the shopper's hands, which is the
one thing the brief explicitly asks not to do.

**An expandable set of cards.** The most defensible of the three, and the closest
call. Rejected as the *default* for two reasons: five collapsed rows are five
decisions to make before any information arrives, and a card is a box — the shape
section 2 warns about. It survives as the opt-in `accordion` layout for payloads too
long to sit open, which is the case where its cost is worth paying.

**What I built instead:** everything visible at once, nothing to operate, arranged
so that each fact sits where its question is asked. The most radical thing about the
default is that there is no interaction in it at all.

![The layouts](images/layouts.png)

## 4. What each surface is for

Four presentations, each earning its form:

**The inline list** — beside the buy action, no container, hairline above and below.
This is the workhorse and the fallback: anything that cannot place anywhere else
lands here, so it has to be the presentation that always works.

**The rating panel** — the claim, a hairline, then a numeral and stars. Social proof
is the one item that benefits from being *counted* rather than described, so it gets
the one numeric treatment in the widget.

**The toast** — a pill pinned bottom-centre of the viewport, rotating through its
lines. Bottom-centre rather than bottom-right is deliberate: bottom-right is the
learned chat-launcher and cookie-notice corner, while bottom-centre reads as a system
snackbar. It is the only surface allowed continuous motion, and only because it is
the only one whose content cannot be read in one pass.

**The badge** — a small pill anchored inside the product image. One line, truncating.
It is the only place in the widget where content is allowed to be cut, and it earns
that because a second line changes the shape of something the shopper is actively
looking at. The same item's full text appears in the list on any page where the badge
cannot place.

## 5. Pacing belongs to the shopper, always

The brief grades this and I treated it as a hard rule rather than a preference.

- **The default list is static.** Nothing advances, nothing waits, nothing needs
  operating. Everything is readable in one pass. This is the strongest possible
  answer to "let the shopper move at their own speed": there is no speed to control.
- **The toast never dismisses on a timer** — a badge that removes itself after seven
  seconds is a badge most shoppers never see. It holds the current line while a
  pointer is over it or focus is inside it, and resumes on the *remainder* of the
  dwell rather than a fresh one, so a glance does not cost a full cycle.
- **Dwell is set by the content, not by a constant.** `clamp(2400, chars × 62, 6500)`
  in milliseconds. A one-line claim and a long sentence should not get the same
  window; the reading time is a property of the text.
- **The one self-advancing layout surrenders permanently.** `steps` stops at the
  first click or key press — not pauses, stops. A shopper who reaches for control
  should not have to fight the animation for it afterwards.
- **Nothing pauses in a hidden tab.** An endless animation nobody is watching is
  just battery.

## 6. Hierarchy from size and tone, never from weight

The mock storefront is set in Georgia, and **Georgia has no light-touch bold at body
sizes** — its bold is heavy enough to date the type and to read considerably louder
than the page around it. So the hierarchy is built where a serif actually separates
well: on size and on tone.

| Role | Size | Treatment |
|---|---|---|
| Rating numeral | 22px | ink |
| List title | 16px | ink, 1.35 line-height |
| Compact title / toast title | 15px | ink |
| List body / rating claim | 14.5px | muted, 1.55 line-height |
| Compact body / toast body | 13.5px | muted |
| Smallest supporting text | 13px | muted |

Six sizes, no gaps large enough to read as a jump. Titles carry ink, bodies carry
muted — the separation is tonal, which is quieter than weight and does not fight the
page's own voice.

**Icons are sized to their job rather than to a constant.** 24px in the list, where
the glyph is a gutter mark beside text. **30px in the grids**, where the cell has no
text beside it and the glyph is carrying the cell alone — at gutter size it reads as
an afterthought. Top-aligned in the list with a **1px optical nudge**, because the
24px glyph box is taller than the title's line box and flush-top sits a hair low
against the cap height. That pixel is the kind of thing nobody notices and everybody
feels.

## 7. Motion is orientation, not decoration

I gave the widget exactly one unearned attention-grab and spend it once: when the
list first scrolls into view, the rows rise **6px over 460ms, staggered 60ms apart**,
in reading order. It leads the eye down the column and then it is over.

Six pixels and 60ms is a deliberately small amount of movement. Enough to register as
*arriving*; not enough to read as advertising — NN/g names animation as a blindness
cue, so a widget that keeps moving is teaching the shopper to filter that region
permanently, on the merchant's page. **Once is orientation. Looped is training
against yourself.**

**Reduced motion removes the movement, not the content.** Every row still appears —
it arrives rather than rises. The toast crossfades in place instead of travelling but
still rotates, because suppressing the rotation would put its second line out of
reach entirely; reduced motion asks for less movement, not less information. `steps`
does not play at all, because there nothing is lost by staying still.

## 8. Space, and letting the copy decide the layout

I measured the payload before choosing a grid, and the measurement decided it:

| | min | avg | max |
|---|---|---|---|
| Title | 12 | **20** | 24 |
| Body | 65 | **73** | 80 |

**A ~73-character body has one comfortable width and several bad ones.** At 14.5px
Georgia it sets in about two lines across a product column and about five in a 15rem
track, and five lines of muted body text in a narrow column is where a list stops
being scannable and becomes a paragraph nobody reads.

So the track minimums are chosen so the target column yields the intended count, and
a narrower container drops a column rather than crushing the measure. **Four or more
items always stack** — with this copy length a fourth column is not a denser layout,
it is an unreadable one.

The trap I was avoiding: picking a grid first and pouring the copy in afterwards.
That produces something that looks right against the sample and breaks against the
next merchant's. Full numbers in
[ADR 0004](decisions/0004-layout-from-the-measure.md).

## 9. Colour: restraint is the strategy, not a fallback

- **The list surface is `transparent`.** It inherits whatever it sits on rather than
  asserting a background — the single most useful line of CSS in the widget for
  looking native, and the one default I would not change.
- **Hairlines, not boxes.** A hairline says *a new section starts here*; a border
  says *this is a separate object placed on your page*. The first is a convention the
  merchant's own designer would use. The second is the shape the research measured.
- **No brand colour anywhere.** The one accent is the toast's emphasis sweep at
  `#8a5a1f` — a warm amber echoing the page's own warmth, sitting at its contrast
  ceiling: saturating further lightens it below 4.5:1. An accent that has to clear AA
  is an accent that cannot shout.
- **Legibility outranks brand fit, without exception.** Any externally supplied
  colour pair is validated against WCAG AA — 4.5:1 body, 3:1 large — and rejected if
  it fails. Being slightly off-brand is recoverable. Being illegible is a failure I
  introduced through a feature meant to help.

## 10. Accessibility was an input, not a pass at the end

Designing this after the fact would have produced different markup, so it was decided
with the layouts:

- The list is a real `<ul>` with an accessible name, so its **length is announced
  before it is read through** — a shopper on a screen reader knows there are five
  items before committing to them.
- Accordion rows are real `<button>`s with `aria-expanded` and `aria-controls`,
  because a disclosure that is not a button is not operable. This is why `accordion`
  and `steps` change markup rather than only CSS.
- The rating is **one** `role="img"` labelled *Rated 4.8 out of 5*, with the numeral
  and stars marked decorative — otherwise the same score is read three times.
- The toast keeps every line in the DOM at once, read in order, with no live region:
  the rotation is a visual treatment, not a change of content, so there is nothing to
  announce.
- `all: initial` takes the UA focus ring with it, so it goes back explicitly. A
  focus style is a design decision, not a browser default to inherit by accident.
- `forced-colors` is handled per surface — borders to `CanvasText`, the star track to
  `GrayText`.

## 11. Touch and mobile — including what I did not build

The honest version, because this is where the design is thinnest.

**What works:** the default has no gestures because it has nothing to gesture at —
static content in a fluid column, everything readable by scrolling the page the
shopper is already scrolling. Layout responds to the *container*, never the viewport,
because a 1440px desktop can hand this widget 300px and a phone can hand it the full
width. The toast dismisses on tap. The whole thing is exercised at 320px under
`dir="rtl"`.

**What does not:** the vanilla build has **no touch gesture handling at all** — no
swipe, no drag-to-dismiss. Its pause-on-hover uses `pointerenter`/`pointerleave`,
which are desktop affordances, so **on a phone the toast rotates with no way to hold
a line.** The length-scaled dwell is the only thing protecting a slow reader there,
and dismissal is the only control. Drag-to-dismiss exists in the React build and is
one of the few things that build genuinely bought.

**What I have not verified:** there are no explicit tap-target minimums. The
accordion buttons take their height from padding and line-height rather than a
declared floor, so I cannot claim they clear the 44/48px guidance — only that nobody
has measured them. That is an unverified claim, not a passing one.

## 12. What I would change

In the order I would do it, cheapest first:

1. **`prefers-color-scheme`.** One media query. On a dark storefront a light widget
   is not a seam, it is a hole punched in the page.
2. **Make the unconfigured defaults neutral** — `system-ui`, a grey hairline, minimal
   radius — and ship the warm Georgia theme as the opt-in preset it actually is.
   Right now an unconfigured widget asserts the sample store's design language on
   every store that is not that one.
3. **A declared tap-target floor**, and then actually measure it.
4. **Touch parity for the toast** — a tap-to-hold, or drag-to-dismiss as in the React
   build. The current state is a desktop affordance with no mobile equivalent.
5. **Remember a dismissal.** The build touches no storage, so a dismissed toast
   returns on the next product page. Repeated dismissal is precisely how a shopper
   learns to filter something.
6. **AI-assisted theming inside the configurator** — read the merchant's page once at
   install, propose the nine tokens, let a human approve them. Reading the page at
   *runtime* is rejected for good reasons; reading it once at *authoring time*, with
   a person in the loop, has none of those problems. Argued in
   [ADR 0005 §7](decisions/0005-banner-blindness.md).

---

## The records

The engineering face of each of these, with the alternatives rejected and the
consequences accepted:

| | |
|---|---|
| [ADR 0001](decisions/0001-style-isolation.md) | Style isolation — why every surface gets its own shadow root |
| [ADR 0002](decisions/0002-theming-and-native-feel.md) | Theming and native feel — the nine-token contract |
| [ADR 0003](decisions/0003-declared-placement.md) | Declared placement — four surfaces, and the fallback rule |
| [ADR 0004](decisions/0004-layout-from-the-measure.md) | Layout from the measure — why the columns break where they do |
| [ADR 0005](decisions/0005-banner-blindness.md) | Banner blindness — why theming is an attention problem |
