/**
 * Styles.
 *
 * Plain CSS strings, adopted into each shadow root as a constructable
 * stylesheet. Deliberately not Tailwind and not CSS-in-JS: a utility framework
 * emits its custom properties onto `:root`, which inside a shadow root resolves
 * to the host document and not to our tree, so every token would have to be
 * rehomed onto `:host` by hand. Writing `:host` in the first place is less work
 * and less to explain.
 *
 * Motion owns transforms, opacity and filters — anything it animates is absent
 * here, so the two never write to the same property.
 */

const TOKENS = `
  --hl-surface: transparent;
  --hl-surface-raised: #ffffff;
  --hl-ink: #2b2b2b;
  --hl-ink-muted: #6f675b;
  --hl-ink-faint: #97907f;
  --hl-border: #e4ddcf;
  /* Lighter than the outer hairline so dividers inside the set read as internal
     structure rather than as more edges of the same weight. */
  --hl-border-soft: #efeade;
  /* The well behind each icon. Tinted from the page's own #b3a894 rather than
     grey, so it sits in the same warm family as the merchant's surfaces. */
  --hl-well: rgba(152, 134, 102, 0.14);
  --hl-well-lift: rgba(152, 134, 102, 0.22);
  /* Peak colour of the emphasis sweep, and the accent for the score. A warm
     amber rather than a brand colour: it echoes the page's own warmth and
     clears WCAG AA against white at roughly 5.7:1. Saturating further lightens
     it below the 4.5:1 threshold, so this is the ceiling. */
  --hl-accent: #8a5a1f;
  --hl-radius: 4px;
  --hl-font: Georgia, 'Times New Roman', serif;
  --hl-space: 4px;
`;

/* Applied at the top of every shadow root. `all: initial` severs inherited
   properties at the boundary — shadow DOM blocks selector matching, not
   inheritance, so without it the host page's font and colour flow straight in. */
const RESET = `
  all: initial;
  ${TOKENS}
  font-family: var(--hl-font);
  color: var(--hl-ink);
  -webkit-font-smoothing: antialiased;
  text-size-adjust: 100%;
`;

/* Shared by every surface: the icon glyph box, and the utility that keeps
   content reachable by assistive technology while it is visually replaced by an
   animated presentation. */
const COMMON = `
.icon { flex: 0 0 auto; display: block; }
.icon svg { display: block; width: 100%; height: 100%; }

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  margin: -1px; padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
`;

/* -------------------------------------------------------------------------
 * List and rating panel — one shadow root on the merchant's mount element
 * ---------------------------------------------------------------------- */
export const LIST_STYLES = `
:host {
  ${RESET}
  display: block;
}
${COMMON}

/* Hairlines above and below rather than a box. The set reads as a section of
   the page rather than a component dropped onto it, and its text aligns with
   the host page's own left edge. */
.root {
  border-top: 1px solid var(--hl-border);
  border-bottom: 1px solid var(--hl-border);
  background: var(--hl-surface);
  padding: calc(var(--hl-space) * 3.5) 0;
  /* Queried below, so the row dividers respond to the width the widget was
     actually given rather than to the width of the viewport. A merchant's
     column is not the window. */
  container-type: inline-size;
}

.list {
  display: grid;
  /* Self-adjusting, with no JS measuring and no data attribute to keep in sync.
     A second column can only appear once there is room for two full 21rem
     measures, which a product details column never has and a full-bleed
     section does. */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 21rem), 1fr));
  column-gap: calc(var(--hl-space) * 9);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  /* Top-aligned, not centred: the icon sits against the first line of the title
     and stays there when a long title wraps. */
  align-items: flex-start;
  gap: calc(var(--hl-space) * 3.5);
  padding: calc(var(--hl-space) * 3.25) 0;
}

/* Dividers only while the list is a single column. In two columns a top border
   would draw across the second column's first row and not the first's, which
   reads as a mistake. Column gap carries the separation there instead. */
@container (max-width: 41rem) {
  .item + .item { border-top: 1px solid var(--hl-border-soft); }
}

/* A well behind each glyph. The thin-stroke icons were optically weightless
   against the page at 24px on nothing; a soft warm disc gives the column a
   rhythm and makes each mark read as placed rather than pasted. */
.well {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--hl-well);
  color: var(--hl-ink);
  /* Optical nudge: the disc is taller than the title's line box, so flush-top
     sits a hair low against the cap height. */
  margin-top: -2px;
}
/* Seated at 18.5 rather than 17: below about 18 the glyph floats in the middle
   of the disc and the well reads as empty rather than as a mount for it. */
.well .icon { width: 18.5px; height: 18.5px; }

.text { min-width: 0; padding-top: 1px; }

/* Hierarchy comes from size and colour rather than weight. Georgia's bold is
   heavy and dates the type; a serif separates better on tone. */
.title {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.35;
  letter-spacing: -0.004em;
  color: var(--hl-ink);
}

.body {
  margin: 3px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--hl-ink-muted);
  text-wrap: pretty;
}

/* --- Rating panel -------------------------------------------------------- */

/* A claim on the left, the score on the right, a hairline between. The score is
   structured data, never parsed out of the sentence — "Rated 4.8 out of 5" is
   prose, and scraping numbers from prose is the same mistake as deriving
   placement from type. */
.rating {
  display: flex;
  align-items: center;
  gap: calc(var(--hl-space) * 4);
  padding: calc(var(--hl-space) * 3.5) calc(var(--hl-space) * 4);
  margin-bottom: calc(var(--hl-space) * 2);
  border: 1px solid var(--hl-border-soft);
  border-radius: var(--hl-radius);
  /* A barely-there warm wash, so the panel separates from the rows beneath it
     without another full-weight border competing with the section hairlines. */
  background: linear-gradient(180deg, rgba(160, 146, 120, 0.05), transparent);
}

.rating-claim {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--hl-ink);
  text-wrap: pretty;
}

.rating-score {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-left: calc(var(--hl-space) * 4);
  border-left: 1px solid var(--hl-border-soft);
}

.rating-value {
  font-size: 27px;
  line-height: 1;
  color: var(--hl-ink);
  /* So the numeral does not change width as it counts up. Without this the
     stars beneath it visibly jitter left and right through the whole count. */
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

/* Two stacked rows of the same five glyphs; the filled row is clipped to the
   score, so 4.8 of 5 renders as four and four-fifths stars rather than being
   rounded away. */
.stars { position: relative; display: block; height: 11px; }
.stars-row { display: flex; gap: 1.5px; height: 11px; }
.stars-row svg { display: block; width: 11px; height: 11px; }
.stars-track { color: var(--hl-border); }
.stars-fill {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: var(--hl-accent);
}
.stars-fill .stars-row { width: max-content; }

/* Below roughly 22rem the two halves stop fitting side by side. */
@container (max-width: 22rem) {
  .rating { flex-direction: column; align-items: flex-start; gap: calc(var(--hl-space) * 2.5); }
  .rating-score {
    flex-direction: row;
    align-items: baseline;
    gap: calc(var(--hl-space) * 2.5);
    padding-left: 0;
    border-left: 0;
  }
}

@media (forced-colors: active) {
  .root { border-color: CanvasText; }
  .rating, .rating-score { border-color: CanvasText; }
  .well { background: Canvas; border: 1px solid CanvasText; }
  .stars-track { color: GrayText; }
  .stars-fill { color: CanvasText; }
}
`;

/* -------------------------------------------------------------------------
 * Toast — its own shadow root, on an element appended to document.body
 *
 * That placement is deliberate: `position: fixed` resolves against the nearest
 * ancestor with a transform, filter or perspective rather than the viewport,
 * and we cannot know what a merchant has applied further up their tree. A
 * body-level element has no such ancestor.
 * ---------------------------------------------------------------------- */
export const TOAST_STYLES = `
:host {
  ${RESET}
  position: fixed;
  left: 50%;
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  /* Motion owns the pill's transform, so the centring translate lives on the
     host instead. Two owners for one property is how transform bugs start. */
  transform: translateX(-50%);
  /* High enough to clear ordinary page content, low enough to sit under a
     merchant's own modals rather than fighting them. */
  z-index: 9999;
  /* Only the pill itself is interactive; the space around it must not swallow
     clicks meant for the merchant's page. */
  pointer-events: none;
}
${COMMON}

.pill {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--hl-space) * 3);
  box-sizing: border-box;
  /* Sizes to its content, bounded only by the viewport. The rem cap is a sanity
     bound, not a layout decision. */
  width: max-content;
  max-width: min(46rem, calc(100vw - 24px));
  padding: calc(var(--hl-space) * 2.75) calc(var(--hl-space) * 3) calc(var(--hl-space) * 2.75) calc(var(--hl-space) * 4);
  background: var(--hl-surface-raised);
  border: 1px solid var(--hl-border);
  /* Lifted well clear of the page's own 4px, because this element is
     deliberately not part of the page surface — it floats above it. Not a full
     999px pill: it carries two lines of text, and a capsule around a paragraph
     leaves ugly wedges of dead space at both ends. */
  border-radius: 14px;
  /* Two shadows, not one: a tight contact shadow to seat the card and a wide
     soft one to lift it. A single blur reads as a drop shadow from 2010. */
  box-shadow:
    0 1px 2px rgba(43, 43, 43, 0.05),
    0 10px 34px -6px rgba(43, 43, 43, 0.17);
  /* Clips the dwell indicator to the rounded corners. Motion never writes to
     box-shadow, so transitioning it here cannot collide with anything. */
  transition: box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.pill:hover {
  box-shadow:
    0 1px 2px rgba(43, 43, 43, 0.06),
    0 16px 44px -8px rgba(43, 43, 43, 0.22);
}

/* The pill is draggable, which on a touch device means the browser must be told
   not to claim the gesture first. Motion sets this itself; declaring it here as
   well means the pill never spends its first frame scroll-locked. */
.pill { touch-action: pan-x; }

.text { min-width: 0; flex: 1 1 auto; }

/* --- Avatar stack -------------------------------------------------------- */

/* Deliberately taller than the icon slot — at 28px against a 19.5px line box it
   reads as a group of people rather than as another glyph. */
.avatars { flex: 0 0 auto; width: 43px; height: 28px; }
.avatars svg { display: block; width: 100%; height: 100%; }
.av-disc { fill: var(--hl-border); }
.av-figure { fill: var(--hl-ink); opacity: 0.62; }
/* The ring is the surface colour, so each disc reads as sitting in front of the
   one behind it without needing a knockout mask. */
.av-ring { fill: none; stroke: var(--hl-surface-raised); stroke-width: 1.8; }

.toast-icon { width: 22px; height: 22px; color: var(--hl-ink); }

.title {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.35;
  color: var(--hl-ink);
}

.body {
  margin: 3px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--hl-ink-muted);
  text-wrap: pretty;
}

/* --- Message rotator ----------------------------------------------------- */

/* Only ever one line in the flow. The outgoing line is taken out of flow by its
   exit style, so the incoming one inherits the flow position immediately and
   the card's layout animation resizes around it — which is why there is no
   measuring code here at all.

   The min-width is the one thing that is not free about that approach. Left to
   its content the card would swing between the width of a four-word title and
   the width of a full sentence on every turn, which drags the close control
   across the screen while a shopper is reaching for it. A floor under the short
   lines cuts that travel to a fraction without locking anything, and the card
   still grows for a line that genuinely needs the room. */
.rotator {
  display: block;
  position: relative;
  margin: 0;
  min-width: min(25rem, 56vw);
}
.frame { display: block; }

/* The gradient is three times the line's width with the bright band at its
   centre. At background-position 100% the image is pulled left, parking the
   band off the left edge; at 0% it sits off the right. Animating 100% -> 0%
   therefore sweeps the highlight left to right.

   Applied by script only when the sweep can actually run, and removed again on
   animationend — a transparent colour must never outlive the animation that
   justifies it. */
.frame.shimmer {
  background-image: linear-gradient(100deg,
    var(--hl-ink) 43%, var(--hl-accent) 50%, var(--hl-ink) 57%);
  background-size: 300% 100%;
  background-position: 100% 50%;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  /* Linear, deliberately. An eased curve makes the highlight race across the
     words and then crawl, so most of the duration renders no visible change. A
     travelling light moves at a constant speed. */
  animation: hl-sweep 850ms linear 260ms 1 both;
}

@keyframes hl-sweep { to { background-position: 0 50%; } }

/* --- Dwell indicator ----------------------------------------------------- */

/* How long the current line holds. Without it the rotation is a surprise every
   time; with it the movement is something the shopper can see coming, and the
   pause on hover becomes legible rather than invisible.

   Full width, flush to the bottom edge, running in a faint track.

   The track is the part that matters. Untracked, a part-drawn rule reads as a
   half-painted bottom border — which is to say, as a bug — and the first attempt
   at fixing that also inset the bar from the edge, which only traded one problem
   for another: lifted into the padding it had visible slack beneath it and read
   as misaligned. With the unfilled remainder always visible, flush is correct,
   because flush is where a progress indicator belongs.

   3px rather than 2: at 2px, sitting directly above the card's own 1px border,
   the two read as one doubled edge. At 3px it reads as a channel with something
   moving through it. The card's own overflow clip trims the ends to the corner
   radius, insetting them by about 5px — enough to follow the curve, which is the
   only inset the bar actually wants. */
.dwell {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 3px;
  background: var(--hl-well);
  overflow: hidden;
}

.dwell-fill {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--hl-accent);
  opacity: 0.5;
  transform-origin: 0 50%;
}

/* --- Close --------------------------------------------------------------- */

/* An explicit control. The whole pill used to dismiss on click, which punishes
   the shopper for tapping the thing they were reading — on a phone that is the
   most likely interaction with it. */
.close {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--hl-ink-faint);
  font: inherit;
  cursor: pointer;
  -webkit-appearance: none;
          appearance: none;
}
.close:hover { background: var(--hl-well); color: var(--hl-ink); }
.close .icon { width: 13px; height: 13px; }
/* The host's 'all: initial' takes the UA focus ring with it, so it is put back
   explicitly rather than left to chance. */
.close:focus-visible {
  outline: 2px solid var(--hl-accent);
  outline-offset: 2px;
}

@media (hover: none) {
  /* No hover to pause with, so the target is worth more than the tidiness. */
  .close { width: 30px; height: 30px; }
}

@media (forced-colors: active) {
  .pill { border-color: CanvasText; }
  .dwell { background: CanvasText; opacity: 1; }
  .frame.shimmer {
    background-image: none;
    color: CanvasText;
    -webkit-text-fill-color: CanvasText;
    animation: none;
  }
  .av-disc { fill: Canvas; }
  .av-figure { fill: CanvasText; opacity: 1; }
  .av-ring { stroke: CanvasText; }
}

/* The sweep is decorative. Where it cannot run safely the line is simply
   present — never transparent, never invisible. */
@media (prefers-reduced-motion: reduce) {
  .frame.shimmer {
    background-image: none;
    color: var(--hl-ink);
    -webkit-text-fill-color: var(--hl-ink);
    animation: none;
  }
}
`;

/* -------------------------------------------------------------------------
 * Badge — its own shadow root, inside an element the merchant names
 *
 * Unlike the toast this must track its anchor, so it is appended into the
 * anchor rather than to the body: no scroll listeners, no measurement, no jank.
 * ---------------------------------------------------------------------- */
export const BADGE_STYLES = `
:host {
  ${RESET}
  position: absolute;
  top: calc(var(--hl-space) * 3);
  left: calc(var(--hl-space) * 3);
  right: calc(var(--hl-space) * 3);
  z-index: 2;
  pointer-events: none;
}
${COMMON}

.pill {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--hl-space) * 2);
  max-width: 100%;
  box-sizing: border-box;
  padding: calc(var(--hl-space) * 1.75) calc(var(--hl-space) * 3);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(228, 221, 207, 0.9);
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(43, 43, 43, 0.07);
  /* Progressive: where it is unsupported the pill is simply more opaque. */
  -webkit-backdrop-filter: saturate(1.4) blur(6px);
          backdrop-filter: saturate(1.4) blur(6px);
}

.pill .icon { width: 15px; height: 15px; color: var(--hl-ink); }

.label {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.3;
  letter-spacing: 0.002em;
  color: var(--hl-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (forced-colors: active) {
  .pill { background: Canvas; border-color: CanvasText; }
}
`;
