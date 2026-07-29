/**
 * Product Highlights
 * ------------------
 * An embeddable, self-contained set of product highlights for ecommerce pages.
 *
 * One script, one payload, four presentations. Each highlight declares where
 * it belongs and the widget renders it there:
 *
 *   "list"    the inline list beneath the buy action  (default)
 *   "rating"  a score panel: a claim, a hairline, a numeral and stars
 *   "toast"   a transient pill pinned to the viewport, cycling its messages
 *   "badge"   a small pill anchored inside an element the merchant names
 *
 * Placement is declared in the data, never derived from `type`. The merchant
 * knows where their product image is; we never do. And anything that cannot be
 * placed falls back to the list — no anchor match, unknown placement, a second
 * item asking for the toast. Every item always ends up somewhere.
 *
 * A merchant who wants everything in one place says so with `layout`:
 * 'distributed' is the default above, 'list' puts every item in the inline list
 * with its body, 'compact' lays them out two across with the mark above the
 * text, 'simple' lays them out three across with titles alone, and 'accordion'
 * keeps the bodies behind a disclosure that opens one at a time. All four
 * single-surface layouts are built out of the fallback rule rather than out of
 * a second renderer.
 *
 * Design notes live in docs/decisions/. In short:
 *   - ADR 0001: everything renders inside a shadow root, so neither the host
 *     page nor this widget can restyle the other by accident.
 *   - ADR 0002: the default theme is a deliberate design, not a fallback.
 *   - ADR 0003: placement is declared, and always degrades to the list.
 *
 * Usage — auto-mount from a script tag:
 *   <script type="module" src="product-highlights.js"
 *           data-mount="#slot" data-content="highlights.json"></script>
 *
 * Usage — programmatic:
 *   import { mount } from './product-highlights.js';
 *   mount('#slot', { content: { highlights: [...] } });
 *
 * No dependencies. No globals.
 */

/* -------------------------------------------------------------------------
 * Icons
 *
 * Inline SVG rather than an icon font or sprite sheet: no extra request, no
 * FOUT, and they inherit colour and stroke weight from the surrounding text.
 * All drawn on the same 24px grid at a single light stroke weight so they
 * carry equal optical weight down the column.
 * ---------------------------------------------------------------------- */
const ICONS = {
  truck:
    '<path d="M2.5 6.5h11.5v9.5H2.5z"/><path d="M14 10h4.2l3.3 3.4V16H14z"/>' +
    '<circle cx="6.75" cy="18" r="2"/><circle cx="17.25" cy="18" r="2"/>',
  shield:
    '<path d="M12 3l7.5 2.8v5.6c0 4.4-3 8.2-7.5 9.6-4.5-1.4-7.5-5.2-7.5-9.6V5.8z"/>' +
    '<path d="M9 12l2.2 2.2L15.2 10"/>',
  star:
    '<path d="M12 3.5l2.6 5.7 6.2.7-4.6 4.2 1.3 6.1L12 17.1l-5.5 3.1 1.3-6.1L3.2 9.9l6.2-.7z"/>',
  leaf:
    '<path d="M4.5 19.5c0-8 5.5-15 16-15.5.5 10-5.5 16-16 15.5z"/>' +
    '<path d="M4.5 19.5C7 15 10.5 11.8 15 9.5"/>',
  ruler:
    '<rect x="2.5" y="8" width="19" height="8" rx="1"/>' +
    '<path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  // Three overlapping avatars. The two behind are drawn as major arcs that
  // stop at their neighbour's edge rather than as full circles knocked out
  // with a fill, so the overlap reads correctly on any background.
  avatars:
    '<path d="M9.25 8.44A4.5 4.5 0 1 0 9.25 15.56"/>' +
    '<path d="M14.75 8.44A4.5 4.5 0 1 0 14.75 15.56"/>' +
    '<circle cx="17.5" cy="12" r="4.5"/>',
  // Shown when a merchant sends an icon name we do not recognise. Never a
  // broken image, never an empty gap.
  _fallback: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.5v4.5M12 8h.01"/>',
};

/* -------------------------------------------------------------------------
 * Shared theme tokens
 *
 * The four presentations render across three shadow roots — the list and the
 * rating panel share the mount's — so the token block is declared once here and
 * injected into each.
 * ---------------------------------------------------------------------- */
const TOKENS = `
  --hl-surface: transparent;
  --hl-surface-raised: #ffffff;
  --hl-ink: #2b2b2b;
  --hl-ink-muted: #6f675b;
  --hl-border: #e4ddcf;
  /* Peak colour of the emphasis sweep. A warm amber rather than a brand
     colour: it echoes the page's own #b3a894 / #e4ddcf warmth and clears
     WCAG AA against white at roughly 5.9:1. Saturating further lightens it
     below the 4.5:1 threshold, so this is the ceiling. */
  --hl-shimmer: #8a5a1f;
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

/* -------------------------------------------------------------------------
 * List
 * ---------------------------------------------------------------------- */
const LIST_STYLES = `
:host {
  ${RESET}
  display: block;
  --_ease: cubic-bezier(0.2, 0, 0, 1);
  --_icon: 24px;
}

/* Hairlines above and below rather than a box. The list reads as a section of
   the page rather than a component dropped onto it, and its text aligns with
   the host page's own left edge. */
.root {
  border-top: 1px solid var(--hl-border);
  border-bottom: 1px solid var(--hl-border);
  background: var(--hl-surface);
  padding: calc(var(--hl-space) * 4) 0;
}

.list {
  display: grid;
  grid-template-columns: 1fr;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Two or three items may sit side by side where there is room; four or more
   always stack, since this copy length reads badly in a narrow column. One
   declarative rule, no JS layout branching. */
.list[data-cols="2"],
.list[data-cols="3"] {
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  column-gap: calc(var(--hl-space) * 8);
}

.item {
  display: flex;
  /* Top-aligned, not centred: the icon sits against the first line of the
     title and stays there when a long title wraps. */
  align-items: flex-start;
  gap: calc(var(--hl-space) * 4.5);
  padding: calc(var(--hl-space) * 3.5) 0;
}

.icon {
  flex: 0 0 auto;
  width: var(--_icon);
  height: var(--_icon);
  /* Optical nudge: the 24px glyph box is taller than the title's line box, so
     flush-top sits a hair low against the cap height. */
  margin-top: 1px;
  color: var(--hl-ink);
}
.icon svg { display: block; width: 100%; height: 100%; }

.text { min-width: 0; }

/* Hierarchy comes from size and colour rather than weight. Georgia's bold is
   heavy and dates the type; a serif separates better on tone. */
.title {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
  color: var(--hl-ink);
  letter-spacing: 0.005em;
}

.body {
  margin: calc(var(--hl-space) * 1) 0 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--hl-ink-muted);
  text-wrap: pretty;
}

/* --- Grid layouts -------------------------------------------------------- */

/* Two centred variants sharing one treatment: the mark leads, the claim sits
   under it, and in "compact" a supporting line sits under that.
   "simple" is the same cell with the supporting line withheld.

   Hierarchy is still carried by size and colour rather than weight, as in the
   inline list — Georgia has no light-touch bold at this size, and a grid of
   bold serif headings reads considerably louder than the page around it. */
.list[data-layout="compact"],
.list[data-layout="simple"] {
  column-gap: calc(var(--hl-space) * 5);
  row-gap: calc(var(--hl-space) * 2);
}

/* Track minimums chosen so a product details column yields the intended count —
   two for compact, three for simple — and a narrower one drops a column rather
   than crushing the measure. The min() wrapper keeps a single item from
   overflowing a container narrower than the track itself. */
.list[data-layout="compact"] {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
}
.list[data-layout="simple"] {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
}

.list[data-layout="compact"] .item,
.list[data-layout="simple"] .item {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: calc(var(--hl-space) * 2.5);
  padding: calc(var(--hl-space) * 4) calc(var(--hl-space) * 1.5);
}

/* Larger than the list's 24px gutter mark. With no text beside it the icon is
   carrying the cell on its own, and at gutter size it reads as an afterthought. */
.list[data-layout="compact"] .icon,
.list[data-layout="simple"] .icon {
  width: 30px;
  height: 30px;
  margin-top: 0;
}

.list[data-layout="compact"] .text,
.list[data-layout="simple"] .text { width: 100%; }

.list[data-layout="compact"] .title,
.list[data-layout="simple"] .title {
  font-size: 15px;
  line-height: 1.3;
  /* Two-word and five-word titles share a row, so an even rag reads better
     than a ragged one. */
  text-wrap: balance;
}

.list[data-layout="compact"] .body {
  margin-top: calc(var(--hl-space) * 0.75);
  font-size: 13.5px;
  line-height: 1.45;
  text-wrap: balance;
}

/* --- Accordion ----------------------------------------------------------- */

/* The one layout that trades a click for a shorter resting state. The default
   list exists because five items at this length simply fit; this is for the
   payload where they do not. */
.list[data-layout="accordion"] .item {
  display: block;
  padding: 0;
}

/* A rule between rows rather than a box around each — the same hairline
   language as the edges of the section. */
.list[data-layout="accordion"] .item + .item {
  border-top: 1px solid var(--hl-border);
}

/* A real <button>, so Enter, Space, focus and the expanded/collapsed
   announcement all come from the platform rather than from us. */
.head {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: calc(var(--hl-space) * 4.5);
  width: 100%;
  padding: calc(var(--hl-space) * 3.5) 0;
  font-family: inherit;
  color: var(--hl-ink);
  text-align: start;
}

button.head { cursor: pointer; }

/* all: unset takes the UA focus ring with it, so it goes back explicitly. */
button.head:focus-visible {
  outline: 2px solid var(--hl-ink);
  outline-offset: 2px;
}

.head .title { flex: 1 1 auto; min-width: 0; }

.chev {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 3px;
  color: var(--hl-ink-muted);
  transition: transform 260ms var(--_ease);
}
.chev svg { display: block; width: 100%; height: 100%; }
.item[data-open] .chev { transform: rotate(180deg); }

/* Rows animate open on grid-template-rows rather than on a measured pixel
   height: the browser resolves the content height itself, so there is no
   measurement to take, cache or invalidate when the text reflows. */
.panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 320ms var(--_ease);
}
.item[data-open] .panel { grid-template-rows: 1fr; }

.panel .wrap {
  overflow: hidden;
  /* Out of the accessibility tree while closed, so a screen reader is not read
     the body of a row that presents itself as collapsed. Delayed on the way
     shut so it outlasts the collapse, immediate on the way open. */
  visibility: hidden;
  transition: visibility 0s linear 320ms;
}
.item[data-open] .panel .wrap { visibility: visible; transition-delay: 0s; }

/* Indented past the icon so the body hangs under the title, not under the mark.
   Logical padding, so a right-to-left column indents from the correct edge. */
.panel .body {
  margin: 0;
  padding-block: 0 calc(var(--hl-space) * 3.5);
  padding-inline-start: calc(var(--_icon) + var(--hl-space) * 4.5);
}

@media (prefers-reduced-motion: reduce) {
  .panel, .panel .wrap, .chev { transition: none; }
}

@media (forced-colors: active) {
  .list[data-layout="accordion"] .item + .item { border-color: CanvasText; }
  button.head:focus-visible { outline-color: Highlight; }
}

/* --- Animated steps ------------------------------------------------------ */

/* The accordion, cycling through its rows on its own. Each row is led by its
   mark, as everywhere else in the widget; what distinguishes the active row is
   colour and the fill on its bottom edge, not a different anatomy. */
.list[data-layout="steps"] .item {
  display: block;
  padding: 0;
  position: relative;
}

.list[data-layout="steps"] .item + .item {
  border-top: 1px solid var(--hl-border);
}

/* The active row takes the emphasis colour the toast sweep uses. It is the one
   token in the contract already chosen against a contrast threshold, so it is
   the right one to reach for when a row has to stand out from its neighbours. */
.list[data-layout="steps"] .item[data-open] .icon,
.list[data-layout="steps"] .item[data-open] .title { color: var(--hl-shimmer); }

.dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 8px;
  background: var(--hl-shimmer);
  opacity: 0;
  transition: opacity 240ms var(--_ease);
}
.list[data-layout="steps"] .item[data-open] .dot { opacity: 1; }

/* On the row's own bottom edge, so the fill reads as this row's time running
   out rather than as a progress bar for the whole list. */
.track {
  position: absolute;
  inset-inline: 0;
  bottom: -1px;
  height: 2px;
  overflow: hidden;
}

/* Grown with width from the inline start rather than scaled with a transform,
   because the inline start follows the writing direction and a transform origin
   does not — in a right-to-left column the fill has to run the other way. */
.bar {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 0;
  background: var(--hl-shimmer);
}
.list[data-layout="steps"] .item[data-open] .bar {
  animation: hl-fill 3s linear forwards;
}

@keyframes hl-fill { from { width: 0; } to { width: 100%; } }

/* The hold on hover and focus is driven from script rather than from a
   :hover rule here. A CSS pause stops the fill but not the timer that advances
   the row, and the two then disagree — the indicator freezes while the sequence
   carries on without it. One authority, in bindSteps. */

/* Once the sequence has finished, or a shopper has taken it over, the indicator
   has nothing left to report. */
.list[data-layout="steps"]:not([data-playing]) .track { display: none; }

@media (prefers-reduced-motion: reduce) {
  .list[data-layout="steps"] .track { display: none; }
  .dot { transition: none; }
}

@media (forced-colors: active) {
  .list[data-layout="steps"] .item + .item { border-color: CanvasText; }
  .list[data-layout="steps"] .item[data-open] .icon,
  .list[data-layout="steps"] .item[data-open] .title { color: Highlight; }
  .bar { background: Highlight; }
  .dot { background: Highlight; }
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
  margin-bottom: calc(var(--hl-space) * 3);
  border: 1px solid var(--hl-border);
  border-radius: var(--hl-radius);
}

.rating-claim {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--hl-ink);
  text-wrap: pretty;
}

.rating-score {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding-left: calc(var(--hl-space) * 4);
  border-left: 1px solid var(--hl-border);
}

.rating-value {
  font-size: 22px;
  line-height: 1;
  color: var(--hl-ink);
  font-variant-numeric: tabular-nums;
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
  color: var(--hl-ink);
}
.stars-fill .stars-row { width: max-content; }

/* Below roughly 22rem the two halves stop fitting side by side. */
@media (max-width: 22rem) {
  .rating { flex-direction: column; align-items: flex-start; gap: calc(var(--hl-space) * 2.5); }
  .rating-score {
    flex-direction: row;
    align-items: center;
    gap: calc(var(--hl-space) * 2);
    padding-left: 0;
    border-left: 0;
  }
}

@media (forced-colors: active) {
  .rating, .rating-score { border-color: CanvasText; }
  .stars-track { color: GrayText; }
  .stars-fill { color: CanvasText; }
}

/* Runs once, when the list first scrolls into view, to lead the eye down the
   column in reading order. */
.list[data-enter] .item {
  transition: opacity 460ms var(--_ease), transform 460ms var(--_ease);
  transition-delay: calc(var(--i, 0) * 60ms);
}
.list[data-enter="pending"] .item { opacity: 0; transform: translateY(6px); }

@media (prefers-reduced-motion: reduce) {
  .list[data-enter] .item { transition: none; transition-delay: 0s; }
  .list[data-enter="pending"] .item { opacity: 1; transform: none; }
}

@media (forced-colors: active) {
  .root { border-color: CanvasText; }
}
`;

/* -------------------------------------------------------------------------
 * Toast
 *
 * Rendered in its own shadow root on an element appended to document.body.
 * That placement is deliberate: `position: fixed` resolves against the nearest
 * ancestor with a transform, filter or perspective rather than the viewport,
 * and we cannot know what a merchant has applied further up their tree. A
 * body-level element has no such ancestor.
 * ---------------------------------------------------------------------- */
const TOAST_STYLES = `
:host {
  ${RESET}
  --_ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: fixed;
  left: 50%;
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  /* High enough to clear ordinary page content, low enough to sit under a
     merchant's own modals rather than fighting them. */
  z-index: 9999;
  /* Only the pill itself is interactive; the space around it must not swallow
     clicks meant for the merchant's page. */
  pointer-events: none;
}

.pill {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: calc(var(--hl-space) * 3);
  box-sizing: border-box;
  /* Sizes to its content, bounded only by the viewport. A declared message
     therefore sits on one line wherever there is room and wraps where there is
     not — the rotator locks to whatever height that produces, so the pill is
     stable either way. The rem cap is a sanity bound, not a layout decision. */
  width: max-content;
  max-width: min(56rem, calc(100vw - 24px));
  padding: calc(var(--hl-space) * 3) calc(var(--hl-space) * 4);
  background: var(--hl-surface-raised);
  border: 1px solid var(--hl-border);
  /* Lifted from the page's own 4px, because this element is deliberately not
     part of the page surface — it floats above it. */
  border-radius: calc(var(--hl-radius) * 2.5);
  box-shadow: 0 8px 28px rgba(43, 43, 43, 0.13), 0 2px 6px rgba(43, 43, 43, 0.07);
  cursor: pointer;

  opacity: 0;
  transform: translateY(10px) scale(0.97);
  transition: opacity 320ms var(--_ease), transform 320ms var(--_ease);
}

:host([data-state="in"]) .pill { opacity: 1; transform: none; }
:host([data-state="out"]) .pill {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
  transition-duration: 220ms;
}

.icon { flex: 0 0 auto; width: 22px; height: 22px; margin-top: 1px; color: var(--hl-ink); }
.icon svg { display: block; width: 100%; height: 100%; }
.text { min-width: 0; }

/* --- Avatar stack -------------------------------------------------------- */

/* Deliberately taller than the icon slot — at 28px against a 19.5px line box
   it reads as a group of people rather than as another glyph. */
.avatars { flex: 0 0 auto; width: 43px; height: 28px; }
.avatars svg { display: block; width: 100%; height: 100%; }
.av-disc { fill: var(--hl-border); }
.av-figure { fill: var(--hl-ink); opacity: 0.62; }
/* The ring is the surface colour, so each disc reads as sitting in front of
   the one behind it without needing a knockout mask. */
.av-ring { fill: none; stroke: var(--hl-surface-raised); stroke-width: 1.8; }

@media (forced-colors: active) {
  .av-disc { fill: Canvas; }
  .av-figure { fill: CanvasText; opacity: 1; }
  .av-ring { stroke: CanvasText; }
}

.title {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
  color: var(--hl-ink);
}

.body {
  margin: 3px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--hl-ink-muted);
  text-wrap: pretty;
}

/* --- Message rotator ----------------------------------------------------- */

/* Frames travel upward: the outgoing line leaves through the top while the
   incoming one arrives from below, so the movement always reads in one
   direction rather than reversing. The container is sized to the tallest frame
   before the frames are taken out of flow, so the pill never resizes mid-turn. */
.rotator { display: block; position: relative; max-width: 100%; }
.rotator[data-ready] { overflow: hidden; }
.rotator[data-ready] .frame {
  position: absolute;
  inset: 0;
  /* The rotator is locked to the tallest line, so a shorter one would
     otherwise sit top-aligned in a box built for two lines. */
  display: flex;
  align-items: center;
  transition: transform 520ms cubic-bezier(0.4, 0, 0.15, 1),
              opacity 380ms ease;
}

.frame {
  display: block;
  /* Shrink-wrapped so the sweep gradient is measured against the words rather
     than the pill, otherwise it spends most of its travel over empty space. */
  width: fit-content;
  max-width: 100%;
}
.rotator[data-ready] .frame { width: 100%; }

.frame[data-pos="current"] { transform: none; opacity: 1; }
.frame[data-pos="above"]   { transform: translateY(-115%); opacity: 0; }
.frame[data-pos="below"]   { transform: translateY(115%);  opacity: 0; }

/* The gradient is three times the title's width with the bright band at its
   centre. At background-position 100% the image is pulled left, parking the
   band off the left edge; at 0% it sits off the right. Animating 100% -> 0%
   therefore sweeps the highlight left to right.

   The class is added by script only when the sweep can actually run, and is
   removed again on animationend — a transparent colour must never outlive the
   animation that justifies it. */
.frame.shimmer {
  background-image: linear-gradient(100deg,
    var(--hl-ink) 43%, var(--hl-shimmer) 50%, var(--hl-ink) 57%);
  background-size: 300% 100%;
  background-position: 100% 50%;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  /* Linear, deliberately. An eased curve makes the highlight race across the
     words and then crawl, so most of the duration renders no visible change.
     A travelling light moves at a constant speed. */
  animation: hl-sweep 850ms linear 260ms 1 both;
}

@keyframes hl-sweep { to { background-position: 0 50%; } }

/* The sweep and the lift are decorative. Where they cannot run safely, the
   toast is simply present — never transparent, never invisible, never moving. */
@media (prefers-reduced-motion: reduce) {
  .pill { transition: none; }
  :host([data-state="in"]) .pill,
  :host([data-state="out"]) .pill { transform: none; }
  .frame.shimmer {
    background-image: none;
    color: var(--hl-ink);
    -webkit-text-fill-color: var(--hl-ink);
    animation: none;
  }
  /* The toast is the only place these lines appear, so suppressing the
     rotation outright would put content out of reach. It crossfades in place
     instead: the message still changes, nothing travels. */
  .rotator[data-ready] .frame { transition: opacity 300ms ease; }
  .frame[data-pos="above"],
  .frame[data-pos="below"] { transform: none; }
}

@media (forced-colors: active) {
  .pill { border-color: CanvasText; }
  .frame.shimmer {
    background-image: none;
    color: CanvasText;
    -webkit-text-fill-color: CanvasText;
    animation: none;
  }
}
`;

/* -------------------------------------------------------------------------
 * Badge
 *
 * Absolutely positioned inside an element the merchant names. Unlike the
 * toast this must track its anchor, so it is appended into the anchor rather
 * than to the body — no scroll listeners, no measurement, no jank.
 * ---------------------------------------------------------------------- */
const BADGE_STYLES = `
:host {
  ${RESET}
  --_ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: absolute;
  top: calc(var(--hl-space) * 3);
  left: calc(var(--hl-space) * 3);
  right: calc(var(--hl-space) * 3);
  z-index: 2;
  pointer-events: none;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--hl-space) * 2);
  max-width: 100%;
  box-sizing: border-box;
  padding: calc(var(--hl-space) * 1.75) calc(var(--hl-space) * 3);
  /* Tokenised, not literal. These were once the default hex values written out
     with alpha, which meant the label followed --hl-ink while the pill stayed
     white — on any dark theme the badge disappeared into its own background.
     The solid colour is declared first so an engine without color-mix gets an
     opaque pill rather than none; the translucency is what the backdrop-filter
     below has to work with. */
  background: var(--hl-surface-raised);
  background: color-mix(in srgb, var(--hl-surface-raised) 92%, transparent);
  border: 1px solid var(--hl-border);
  border-color: color-mix(in srgb, var(--hl-border) 90%, transparent);
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(43, 43, 43, 0.08);
  /* Progressive: where it is unsupported the pill is simply more opaque. */
  -webkit-backdrop-filter: saturate(1.4) blur(6px);
          backdrop-filter: saturate(1.4) blur(6px);

  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transition: opacity 380ms var(--_ease), transform 380ms var(--_ease);
  transition-delay: 220ms;
}

:host([data-state="in"]) .pill { opacity: 1; transform: none; }

.icon { flex: 0 0 auto; width: 16px; height: 16px; color: var(--hl-ink); }
.icon svg { display: block; width: 100%; height: 100%; }

.label {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
  color: var(--hl-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .pill { transition: none; transform: none; }
}

@media (forced-colors: active) {
  .pill { background: Canvas; border-color: CanvasText; }
}
`;

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

/** Create an element. Text is always assigned via textContent, never parsed
 *  as markup — merchant content is untrusted input. */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v; // only ever our own icon strings
    else if (k === 'class') el.className = v;
    // Written through the CSSOM rather than as a style attribute. A storefront
    // running `style-src 'self'` blocks the attribute — silently, and only in
    // production — which would cost the list its stagger and the rating panel
    // its star fill. CSP does not police the CSSOM, so this survives both.
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.appendChild(c);
  return el;
}

function icon(paths) {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">' +
      paths + '</svg>',
  });
}

/**
 * Three overlapping avatar discs, each holding an anonymous figure.
 *
 * Figures rather than photographs: real portraits would mean loading images
 * from somewhere, which on a third-party widget means an extra request and a
 * privacy question on someone else's page. The silhouette carries the same
 * meaning — "these are people" — at zero cost. Merchant-supplied portraits
 * would be a reasonable extension, and would slot into the same clip path.
 */
function avatarStack() {
  const one = (cx, i) =>
    `<g transform="translate(${cx} 14)">` +
      `<circle class="av-disc" r="8.6"/>` +
      `<g clip-path="url(#hl-av-${i})">` +
        `<circle class="av-figure" cy="-2.3" r="3.2"/>` +
        `<path class="av-figure" d="M-5.9 10c0-3.8 2.6-5.9 5.9-5.9s5.9 2.1 5.9 5.9z"/>` +
      `</g>` +
      `<circle class="av-ring" r="8.6"/>` +
    `</g>`;

  return h('span', {
    class: 'avatars',
    'aria-hidden': 'true',
    html:
      '<svg viewBox="0 0 43 28" fill="none"><defs>' +
      [0, 1, 2].map((i) => `<clipPath id="hl-av-${i}"><circle r="8.6"/></clipPath>`).join('') +
      '</defs>' +
      [10, 21.5, 33].map((cx, i) => one(cx, i)).join('') +
      '</svg>',
  });
}

/** Attach a shadow root and give it a stylesheet, preferring the constructable
 *  form so the CSS is parsed once and shared across instances. */
function shadowWith(host, css) {
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  if ('adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
  } else {
    shadow.appendChild(h('style', { text: css }));
  }
  return shadow;
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const PLACEMENTS = new Set(['list', 'toast', 'badge', 'rating']);

/**
 * How the payload is presented.
 *
 *   distributed  four placements, each item where it declared it belongs (default)
 *   list         every item in one list, title and body
 *   compact      every item in a two-column grid — mark, title, body
 *   simple       every item in a three-column grid — mark and title only
 *   accordion    every item in one list, bodies behind a disclosure, one at a time
 *   steps        the accordion, cycling through its rows continuously
 *
 * The five single-surface layouts are not a second rendering path. They turn
 * the other surfaces off, and ADR 0003's fallback rule does the rest — a
 * suppressed surface returns its items to the list rather than dropping them,
 * which is the same road an explicit `toast: false` already travels.
 *
 * 'accordion' and 'steps' are the two layouts that change the markup rather than
 * only the CSS, because a disclosure needs a real button to be operable. Both
 * are offered and neither is the default: hiding a body costs a click to reach
 * the most useful sentence in the payload, which is the trade the inline list
 * declines to make, and 'steps' additionally asserts an order the demo payload
 * does not have.
 */
const LAYOUTS = new Set(['distributed', 'list', 'compact', 'simple', 'accordion', 'steps']);

/** Finite, positive, and within bounds — or null. Merchant numbers are input. */
function finiteInRange(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/**
 * Reduce arbitrary input to a list of items we know how to render.
 *
 * Everything unexpected is dropped rather than repaired or thrown on: a
 * malformed payload must degrade to less content, never to a broken page.
 */
function normalise(content) {
  const list = content && Array.isArray(content.highlights) ? content.highlights : [];

  return list.reduce((items, raw) => {
    if (!raw || typeof raw !== 'object') return items;
    if (!isNonEmptyString(raw.title)) return items; // nothing to label a row with

    const scale = finiteInRange(raw.scale, 1, 100) ?? 5;

    items.push({
      title: raw.title.trim(),
      // An absent body is legitimate — the row is simply title-only.
      body: isNonEmptyString(raw.body) ? raw.body.trim() : null,
      icon: Object.prototype.hasOwnProperty.call(ICONS, raw.icon) && raw.icon[0] !== '_'
        ? raw.icon
        : '_fallback',
      // Optional toast-only override, because one item can present differently
      // per surface: the demo's social proof is an avatar stack in the toast
      // and a star in the list layouts. Null means "same as icon".
      toastIcon: Object.prototype.hasOwnProperty.call(ICONS, raw.toastIcon) && raw.toastIcon[0] !== '_'
        ? raw.toastIcon
        : null,
      // Unknown or absent placement means the list, which every item can use.
      placement: PLACEMENTS.has(raw.placement) ? raw.placement : 'list',
      anchor: isNonEmptyString(raw.anchor) ? raw.anchor.trim() : null,
      // Structured, so stars can be drawn from a number rather than scraped
      // out of the sentence next to them.
      rating: finiteInRange(raw.rating, 0, scale),
      scale,
      // Extra lines the toast cycles through after its title. Absent or empty
      // means no rotation, which is a perfectly good toast.
      messages: Array.isArray(raw.messages)
        ? raw.messages.filter(isNonEmptyString).map((m) => m.trim())
        : [],
    });
    return items;
  }, []);
}

/**
 * Decide where each item actually renders.
 *
 * The rule that makes distributed placement safe: anything that cannot be
 * placed falls back to the list. A missing anchor, an anchor selector that
 * matches nothing, a second item competing for the toast — all demote rather
 * than disappear. Every item always ends up somewhere.
 */
function resolvePlacements(items) {
  const list = [];
  const badges = [];
  let toast = null;
  let rating = null;

  for (const item of items) {
    if (item.placement === 'toast' && !toast) { toast = item; continue; }

    // A rating panel without a usable score is just a sentence, so it becomes
    // a list row rather than an empty box with no stars in it.
    if (item.placement === 'rating' && !rating && item.rating !== null) {
      rating = item;
      continue;
    }

    if (item.placement === 'badge' && item.anchor) {
      let anchor = null;
      try {
        anchor = document.querySelector(item.anchor);
      } catch {
        anchor = null; // an invalid selector is a merchant typo, not a crash
      }
      if (anchor) { badges.push({ item, anchor }); continue; }
    }

    list.push(item);
  }

  return { list, toast, badges, rating };
}

/* -------------------------------------------------------------------------
 * Renderers
 * ---------------------------------------------------------------------- */

const STAR =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M12 3.5l2.6 5.7 6.2.7-4.6 4.2 1.3 6.1L12 17.1l-5.5 3.1 1.3-6.1L3.2 9.9l6.2-.7z"/></svg>';

function starRow(cls) {
  return h('span', { class: `stars-row ${cls}`, html: STAR.repeat(5) });
}

/** The accordion's open/closed affordance. Decorative — the button's
 *  aria-expanded is what carries the state to assistive technology. */
const chevron = () =>
  h('span', {
    class: 'chev',
    'aria-hidden': 'true',
    html:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg>',
  });

/**
 * Wire up a single-open accordion.
 *
 * Delegated from the list rather than bound per row, so there is one listener
 * however long the payload is, and nothing to detach when the list is replaced.
 */
function bindAccordion(list) {
  list.addEventListener('click', (e) => {
    const head = e.target.closest && e.target.closest('button.head');
    if (!head || !list.contains(head)) return;

    const row = head.parentElement;
    const opening = !row.hasAttribute('data-open');

    // One at a time: whatever else is open closes first.
    for (const other of list.querySelectorAll('.item[data-open]')) {
      if (other === row) continue;
      other.removeAttribute('data-open');
      const otherHead = other.querySelector('button.head');
      if (otherHead) otherHead.setAttribute('aria-expanded', 'false');
    }

    row.toggleAttribute('data-open', opening);
    head.setAttribute('aria-expanded', String(opening));
  });
}

/**
 * Play an accordion through its rows, continuously.
 *
 * Perpetual motion inside the column is a bolder claim than the toast's corner
 * pill makes, so this keeps every civility the toast has, and they are the
 * whole design of this function:
 *
 *   - It **pauses** while the pointer is over it or focus is inside it, and
 *     resumes on what is left of the dwell rather than a fresh one, so a row
 *     never advances out from under someone reading it.
 *   - It **pauses entirely while the tab is hidden** — an endless animation
 *     nobody is watching is just battery.
 *   - The **first click ends it for good**, leaving an ordinary accordion. A
 *     shopper who takes control keeps it.
 *   - Under **reduced motion** it never plays at all. Every row is reachable by
 *     click, so unlike the toast nothing is put out of reach by staying still.
 *
 * The fill animation is the clock rather than a second timer running alongside
 * it, so the indicator and the advance cannot drift apart. The timer that
 * remains is only a backstop for the case where `animationend` never arrives.
 */
function bindSteps(list) {
  const rows = [...list.querySelectorAll('.item')];
  if (rows.length === 0) return;

  const show = (i) => {
    rows.forEach((row, n) => {
      const on = n === i;
      row.toggleAttribute('data-open', on);
      const head = row.querySelector('button.head');
      if (head) head.setAttribute('aria-expanded', String(on));
    });
  };

  // Reduced motion gets the content, not the performance. Every row is
  // reachable by click here — unlike the toast, where the rotation is the only
  // route to the second line — so there is nothing to put out of reach by
  // simply not playing.
  if (prefersReducedMotion()) {
    show(0);
    return;
  }

  let current = 0;
  let backstop = 0;
  let token = 0;
  let stopped = false;
  let paused = false;

  /** The fill's animation, which is also the clock for the current row. */
  const fill = () => {
    const bar = rows[current] && rows[current].querySelector('.bar');
    return bar && bar.getAnimations ? bar.getAnimations()[0] || null : null;
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    token++;
    clearTimeout(backstop);
    list.removeAttribute('data-playing');
    document.removeEventListener('visibilitychange', onVisibility);
  };

  const hold = () => {
    if (stopped || paused) return;
    paused = true;
    clearTimeout(backstop);
    const a = fill();
    if (a && a.playState === 'running') a.pause();
  };

  const release = () => {
    if (stopped || !paused) return;
    paused = false;
    const a = fill();
    // Resume on what is left rather than on a fresh dwell, so a glance does not
    // reset a row the shopper has already half read.
    let remaining = 800;
    if (a) {
      a.play();
      const total = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : null;
      if (typeof total === 'number') remaining = Math.max(0, total - (a.currentTime || 0)) + 800;
    }
    const mine = token;
    backstop = setTimeout(() => { if (mine === token) advance(); }, remaining);
  };

  const step = (i) => {
    if (stopped) return;
    current = i;
    show(i);

    const row = rows[i];
    const source = row.querySelector('.body') || row.querySelector('.title');
    const ms = dwellFor(source ? source.textContent : '');

    const bar = row.querySelector('.bar');
    if (bar) {
      // Restart the fill from zero: the same element is reused each turn, so
      // the animation has to be taken off and reflowed before it will replay.
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
      bar.style.animationDuration = `${ms}ms`;
    }

    const mine = ++token;
    clearTimeout(backstop);
    backstop = setTimeout(() => { if (mine === token) advance(); }, ms + 800);
  };

  function advance() {
    if (stopped) return;
    // Wraps rather than ending: the sequence is a standing rotation, and it
    // stops only when a shopper takes it over.
    step((current + 1) % rows.length);
  }

  list.addEventListener('animationend', (e) => {
    if (stopped || paused || e.animationName !== 'hl-fill') return;
    advance();
  });

  list.addEventListener('pointerenter', hold);
  list.addEventListener('pointerleave', release);
  list.addEventListener('focusin', hold);
  list.addEventListener('focusout', (e) => {
    // Tabbing between two headers inside the list is not leaving it.
    if (e.relatedTarget && list.contains(e.relatedTarget)) return;
    release();
  });

  // A document-level listener on a widget that can be remounted must clean up
  // after itself; the list going out of the document is the teardown signal.
  const onVisibility = () => {
    if (!list.isConnected) {
      document.removeEventListener('visibilitychange', onVisibility);
      return;
    }
    if (document.hidden) hold();
    else release();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Any interaction hands the list over permanently; bindAccordion is already
  // listening on the same element and does the opening and closing from here.
  list.addEventListener('click', () => stop());
  list.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') stop();
  });

  list.setAttribute('data-playing', '');
  step(0);
}

function buildRating(item) {
  const pct = Math.max(0, Math.min(100, (item.rating / item.scale) * 100));
  // One decimal place unless the score is whole, so 5 reads as "5" not "5.0".
  const shown = Number.isInteger(item.rating) ? String(item.rating) : item.rating.toFixed(1);

  return h('div', { class: 'rating' },
    h('p', { class: 'rating-claim', text: item.body || item.title }),
    h('div', {
      class: 'rating-score',
      role: 'img',
      'aria-label': `Rated ${shown} out of ${item.scale}`,
    },
      h('span', { class: 'rating-value', 'aria-hidden': 'true', text: shown }),
      h('span', { class: 'stars', 'aria-hidden': 'true' },
        starRow('stars-track'),
        h('span', { class: 'stars-fill', style: `width:${pct}%` }, starRow(''))
      )
    )
  );
}

function buildList(items, label, layout) {
  const grid = layout === 'compact' || layout === 'simple';
  const stepper = layout === 'steps';
  const accordion = layout === 'accordion' || stepper;
  const stamped = grid || accordion;

  // A real list in every layout, so assistive technology announces the set and
  // its length before reading through it. Four of the five layouts also share
  // one row shape and differ only in CSS; the accordion is the exception,
  // because a disclosure has to be a button to be operable.
  const list = h('ul', {
    class: 'list',
    'aria-label': label,
    'data-layout': stamped ? layout : null,
    // The two- and three-across rule belongs to the default row; a grid sets its
    // own tracks and the two would fight.
    'data-cols': stamped ? null : String(items.length <= 3 ? items.length : 1),
  });

  items.forEach((item, i) => {
    const row = h('li', { class: 'item', style: `--i:${i}` });

    if (accordion) {
      // A row with nothing to reveal is not a control. Giving it a button, a
      // chevron and an aria-expanded that never changes would be an interaction
      // that exists so that there is an interaction.
      const hasBody = Boolean(item.body);
      const headId = `hl-acc-h-${i}`;
      const panelId = `hl-acc-p-${i}`;

      row.appendChild(
        h(hasBody ? 'button' : 'div', {
          class: 'head',
          type: hasBody ? 'button' : null,
          id: hasBody ? headId : null,
          'aria-expanded': hasBody ? 'false' : null,
          'aria-controls': hasBody ? panelId : null,
        },
          icon(ICONS[item.icon]),
          h('span', { class: 'title', text: item.title }),
          // The dot replaces the chevron in the stepper: a chevron promises
          // that a click is required, and here the row advances on its own.
          stepper
            ? h('span', { class: 'dot', 'aria-hidden': 'true' })
            : (hasBody ? chevron() : null)
        )
      );

      if (hasBody) {
        row.appendChild(
          h('div', { class: 'panel', id: panelId, role: 'region', 'aria-labelledby': headId },
            h('div', { class: 'wrap' }, h('p', { class: 'body', text: item.body }))
          )
        );
      }

      if (stepper) {
        row.appendChild(h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'bar' })));
      }
    } else {
      // 'simple' is the mark and the claim, nothing else.
      const body = layout === 'simple' ? null : item.body;
      row.append(
        icon(ICONS[item.icon]),
        h('div', { class: 'text' },
          h('p', { class: 'title', text: item.title }),
          body ? h('p', { class: 'body', text: body }) : null
        )
      );
    }

    list.appendChild(row);
  });

  // The stepper is an accordion that starts itself: the same click-to-toggle
  // behaviour underneath, with the sequence layered on top.
  if (accordion) bindAccordion(list);
  if (stepper) bindSteps(list);

  return { root: h('div', { class: 'root' }, list), list };
}

function buildRoot(items, label, rating, layout) {
  const { root, list } = buildList(items, label, layout);
  if (rating) root.insertBefore(buildRating(rating), list);
  return { root, list };
}

/** How long a line holds before the next scrolls up. Scaled to its length, so a
 *  long sentence is not swapped out before it can be read. */
const dwellFor = (text) => Math.min(6500, Math.max(2400, text.length * 62));

let toastShown = false;    // once per page load, however many widgets are mounted

function showToast(item) {
  if (toastShown || !item) return;
  toastShown = true;

  // Not aria-hidden. The toast is the only place its content appears, so
  // hiding it would put that content out of reach entirely. Every line is in
  // the DOM at once and read in order — the rotation is a visual treatment,
  // not a change of content, so there is nothing to announce.
  const host = h('div', { 'data-product-highlights': 'toast' });
  document.body.appendChild(host);

  const shadow = shadowWith(host, TOAST_STYLES);

  // The title is frame zero; declared messages follow it. A payload with a
  // body but no messages rotates the body instead: the toast is a one-line
  // pill, and a second line it can show one at a time should not force a
  // second row. A payload with neither is a single frame, and a single frame
  // never rotates.
  const promoted = item.messages.length === 0 && item.body;
  const lines = promoted ? [item.title, item.body] : [item.title, ...item.messages];
  const frames = lines.map((text, i) =>
    h('span', { class: 'frame', 'data-pos': i === 0 ? 'current' : 'below', text })
  );
  const rotator = h('p', { class: 'title rotator' }, ...frames);

  // The toast has room for the richer treatment; the list's icon column is a
  // fixed 24px gutter, so it keeps the plain glyph. `toastIcon` is honoured
  // only here — it exists so one item can lead with an avatar stack in the
  // toast and a star everywhere else.
  const glyph = item.toastIcon || item.icon;
  const mark = glyph === 'avatars' ? avatarStack() : icon(ICONS[glyph]);

  const pill = h('div', { class: 'pill' },
    mark,
    h('div', { class: 'text' },
      rotator,
      !promoted && item.body ? h('p', { class: 'body', text: item.body }) : null
    )
  );
  shadow.appendChild(pill);

  let closed = false;
  let rotate = 0;
  let paused = false;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onVisibility = () => { paused = document.hidden; };
  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(rotate);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onVisibility);
    host.setAttribute('data-state', 'out');
    // Remove the element entirely rather than leaving an invisible fixed layer
    // sitting over the merchant's page.
    setTimeout(() => host.remove(), 320);
  }

  host.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);

  // Deferred by one frame so the entrance transition has an initial state to
  // move from — but never *dependent* on that frame arriving. requestAnimationFrame
  // is throttled in background tabs, and a toast that only initialises when the
  // compositor obliges is a toast that silently dies. The timer is a backstop;
  // whichever fires first wins, and `started` makes the second a no-op.
  let started = false;
  const start = () => {
    if (started || closed) return;
    started = true;

    host.setAttribute('data-state', 'in');

    // Lock the rotator to a fixed box before the frames leave the flow.
    //
    // Width is measured with wrapping suppressed, so what we capture is the
    // width each line *wants*. Measuring as-rendered would capture a width the
    // text had already wrapped into and then freeze that wrap in place, so a
    // line that would comfortably fit on one row never gets the chance.
    //
    // The CSS max-width still caps the result, so on a narrow viewport the
    // text wraps as it should — which is why height is measured second, once
    // the final width is in effect.
    // Lock the rotator to a fixed box before the frames leave the flow.
    // Absolutely positioned children contribute nothing to an intrinsic width,
    // so without an explicit size the pill would collapse around its icon.
    //
    // Available space is computed rather than measured. A percentage max-width
    // resolves against a parent whose own width was settled before we touched
    // anything, so measuring it reports the width the layout already had — not
    // the width it could grow to — and locking that in freezes whatever wrap
    // the text had already fallen into. The pill's max-width minus its own
    // fixed furniture is an absolute bound, and nothing about it is circular.
    // Measured on the frames themselves, with every constraint lifted, and via
    // offsetWidth rather than getBoundingClientRect. The pill is mid-entrance
    // here and still carries `transform: scale(0.97)`, which getBoundingClientRect
    // faithfully applies — every measurement would come back three percent short
    // and clip the last word. offsetWidth reports layout size and ignores
    // transforms entirely.
    frames.forEach((f) => {
      f.style.whiteSpace = 'nowrap';
      f.style.maxWidth = 'none';
      f.style.width = 'max-content';
    });
    rotator.style.maxWidth = 'none';
    rotator.style.width = 'max-content';

    const cs = getComputedStyle(pill);
    const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
    const furniture =
      num(cs.paddingLeft) + num(cs.paddingRight) +
      num(cs.borderLeftWidth) + num(cs.borderRightWidth) +
      num(cs.columnGap || cs.gap) +
      mark.offsetWidth;

    const pillMax = parseFloat(cs.maxWidth);
    const avail = Number.isFinite(pillMax) ? pillMax - furniture : Infinity;
    const want = Math.max(...frames.map((f) => f.offsetWidth), 0);

    // Restore the frames; only the wrapping decision below is kept.
    frames.forEach((f) => { f.style.maxWidth = ''; f.style.width = ''; });

    // offsetWidth rounds to an integer, so a couple of pixels of slack covers
    // the fraction it drops. Invisible on a pill; a clipped word is not.
    const SLACK = 2;
    const oneLine = want + SLACK <= avail;
    if (!oneLine) {
      frames.forEach((f) => { f.style.whiteSpace = ''; });
      rotator.style.maxWidth = '';
      rotator.style.width = `${Math.floor(avail)}px`;
    } else {
      rotator.style.width = `${Math.ceil(want) + SLACK}px`;
    }

    const tallest = Math.max(...frames.map((f) => f.offsetHeight), 0);
    if (tallest > 0) rotator.style.height = `${tallest}px`;
    rotator.setAttribute('data-ready', '');

    // `background-clip: text` needs a transparent colour to show anything.
    // Where unsupported that would render the line invisible, so the sweep is
    // applied only once support is confirmed, and dropped on completion.
    const canClip =
      typeof CSS === 'object' && typeof CSS.supports === 'function' &&
      (CSS.supports('background-clip', 'text') ||
       CSS.supports('-webkit-background-clip', 'text'));
    const reduced = prefersReducedMotion();

    if (canClip && !reduced) {
      const unshimmer = () => frames[0].classList.remove('shimmer');
      frames[0].addEventListener('animationend', unshimmer, { once: true });
      // The class makes the text transparent, and only `animationend` takes it
      // off again. If that event never arrives — animations disabled at the OS
      // level, a throttled tab, an element that was hidden — the line would be
      // invisible for good. The timer guarantees it comes back.
      setTimeout(unshimmer, 2000);
      frames[0].classList.add('shimmer');
    }

    // The toast is permanent, so the rotation is too. Nothing here dismisses
    // it on a timer; it stays until the shopper closes it.
    if (frames.length < 2) return;

    let current = 0;

    const advance = () => {
      const next = (current + 1) % frames.length;
      frames[current].setAttribute('data-pos', 'above');
      frames[next].setAttribute('data-pos', 'current');
      // Park the outgoing frame below again once it has left, without
      // animating it back through the middle.
      const leaving = frames[current];
      setTimeout(() => {
        if (leaving.getAttribute('data-pos') === 'above') {
          leaving.style.transition = 'none';
          leaving.setAttribute('data-pos', 'below');
          void leaving.offsetHeight; // flush, so the next turn animates again
          leaving.style.transition = '';
        }
      }, 560);
      current = next;
    };

    // A single scheduler that checks before every turn rather than a fixed
    // interval, so pausing never leaves a queued turn to fire late.
    const tick = () => {
      if (closed) return;
      if (!paused) advance();
      rotate = setTimeout(tick, dwellFor(lines[current]));
    };
    rotate = setTimeout(tick, dwellFor(lines[0]));
  };

  // Hold the current line while it is being read, and stop entirely while the
  // tab is in the background — an endless animation nobody is looking at is
  // just battery.
  host.addEventListener('pointerenter', () => { paused = true; });
  host.addEventListener('pointerleave', () => { paused = false; });
  host.addEventListener('focusin', () => { paused = true; });
  host.addEventListener('focusout', () => { paused = false; });
  document.addEventListener('visibilitychange', onVisibility);

  requestAnimationFrame(() => requestAnimationFrame(start));
  setTimeout(start, 150);
}

function showBadge({ item, anchor }) {
  // The badge is positioned against its anchor, so the anchor must establish a
  // containing block. Setting this only when the computed position is static
  // keeps the change to the merchant's element as small as it can be, and it
  // has no visual effect of its own.
  if (getComputedStyle(anchor).position === 'static') {
    anchor.style.position = 'relative';
  }

  // The title also appears in no other surface, so it is not hidden from
  // assistive technology the way the duplicated toast is.
  const host = h('div', { 'data-product-highlights': 'badge' });
  anchor.appendChild(host);

  const shadow = shadowWith(host, BADGE_STYLES);
  shadow.appendChild(
    h('div', { class: 'pill' },
      icon(ICONS[item.icon]),
      h('p', { class: 'label', text: item.title })
    )
  );

  requestAnimationFrame(() => requestAnimationFrame(() => {
    host.setAttribute('data-state', 'in');
  }));
}

/* -------------------------------------------------------------------------
 * Reveal
 * ---------------------------------------------------------------------- */

function playEntrance(root, list, onReveal) {
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    list.dataset.enter = 'done';
    // Reduced motion asks for less movement, not less content, so everything
    // still appears — it simply arrives rather than rises.
    onReveal();
  };

  if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') {
    reveal();
    return;
  }

  list.dataset.enter = 'pending';

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      clearTimeout(fallback);
      reveal();
    },
    { threshold: 0.15 }
  );
  io.observe(root);

  // Hard backstop. If the observer never reports — throttled, detached,
  // mounted inside a collapsed container, an engine quirk — the content is
  // revealed anyway. Text hidden pending an animation must never depend on
  // that animation actually arriving.
  const fallback = setTimeout(() => { io.disconnect(); reveal(); }, 1600);
}

/* -------------------------------------------------------------------------
 * Mount
 * ---------------------------------------------------------------------- */

/* A host can legitimately be mounted more than once — a replay from the dev
   harness, the theme panel switching layouts, a second copy of the script tag.
   The payload fetch makes mount() async, so two calls can interleave, and
   without a guard the slower *fetch* would decide the final render rather than
   the later *call*. A sequence number on the host makes ownership explicit:
   each call takes the next number on entry, and a call that comes back from an
   await to find a newer number stops and renders nothing. A Symbol key so the
   marker cannot collide with anything the merchant's page puts on the element. */
const MOUNT_SEQ = Symbol('product-highlights-mount');

/**
 * Render the widget into `target`.
 *
 * @param {string|Element} target       Element or selector for the list.
 * @param {object}  [options]
 * @param {object}  [options.content]   Content payload. Takes precedence over url.
 * @param {string}  [options.url]       URL to fetch the payload from.
 * @param {string}  [options.label]     Accessible name for the list.
 * @param {string}  [options.layout]    'distributed' (default), 'list', 'compact',
 *                                      'simple' or 'accordion'. The last four
 *                                      render every item in one place; 'simple'
 *                                      shows titles only, 'accordion' puts
 *                                      bodies behind a disclosure.
 * @param {boolean} [options.toast]     Set false to keep toast items in the list.
 * @param {boolean} [options.badges]    Set false to keep badge items in the list.
 * @param {boolean} [options.rating]    Set false to keep the rating item in the list.
 * @returns {Promise<Element|null>}     The host element, or null if nothing rendered.
 */
export async function mount(target, options = {}) {
  try {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;

    const seq = (host[MOUNT_SEQ] = (host[MOUNT_SEQ] || 0) + 1);

    let content = options.content;
    if (!content && options.url) {
      const res = await fetch(options.url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await res.json();
    }

    // Checkpoint after the async gap: if a newer mount claimed this host while
    // the payload was in flight, this call is stale. Rendering anyway would
    // paint an old configuration over the one the newer call asked for.
    if (host[MOUNT_SEQ] !== seq) return null;

    const items = normalise(content);
    // Nothing renderable: leave the page exactly as we found it. No empty
    // box, no stray rule, no reserved space.
    if (items.length === 0) return null;

    const layout = LAYOUTS.has(options.layout) ? options.layout : 'distributed';
    const resolved = resolvePlacements(items);

    // A single-surface layout is expressed as suppression, not as a second
    // rendering path: it turns the other surfaces off and lets them fall back.
    const single = layout !== 'distributed';
    const wantToast = options.toast !== false && !single;
    const wantBadges = options.badges !== false && !single;
    const wantRating = options.rating !== false && !single;

    // Suppressing a surface returns its items to the list rather than dropping
    // them, so the payload always renders in full.
    const listItems = [...resolved.list];
    if (!wantToast && resolved.toast) listItems.push(resolved.toast);
    if (!wantBadges) listItems.push(...resolved.badges.map((b) => b.item));
    if (!wantRating && resolved.rating) listItems.push(resolved.rating);
    listItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));

    const shadow = shadowWith(host, LIST_STYLES);
    const { root, list } = buildRoot(
      listItems,
      options.label || 'Product highlights',
      wantRating ? resolved.rating : null,
      layout
    );
    shadow.appendChild(root);

    playEntrance(root, list, () => {
      // The reveal arrives on its own schedule — an observer callback or the
      // backstop timer — so it too can outlive its mount. A superseded mount
      // must not float a toast or badge belonging to a render that is gone.
      if (host[MOUNT_SEQ] !== seq) return;
      if (wantToast) showToast(resolved.toast);
      if (wantBadges) resolved.badges.forEach(showBadge);
    });

    return host;
  } catch (err) {
    // A third-party widget has no business taking a merchant's page down with
    // it. Report, render nothing, let the page carry on.
    console.warn('[product-highlights] did not render:', err);
    return null;
  }
}

/**
 * The layouts this build renders.
 *
 * Exposed so a configurator can offer exactly what is supported rather than
 * guessing from the build it happens to be talking to — the React build in
 * `react/` implements the placements but not the layouts, and a switcher that
 * silently does nothing is worse than one that says it cannot.
 */
export const layouts = [...LAYOUTS];

/** Exposed for the dev harness so the surfaces can be replayed. */
export function _reset() {
  toastShown = false;
  document.querySelectorAll('[data-product-highlights]').forEach((n) => n.remove());
}

/* -------------------------------------------------------------------------
 * Auto-mount
 *
 * document.currentScript is null inside a module, so the tag is located by
 * its data-mount attribute.
 * ---------------------------------------------------------------------- */
const tag = document.querySelector('script[data-mount][data-content]');
if (tag) {
  mount(tag.dataset.mount, {
    url: tag.dataset.content,
    label: tag.dataset.label || undefined,
    layout: tag.dataset.layout || undefined,
  });
}
