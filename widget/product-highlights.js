/**
 * Product Highlights
 * ------------------
 * An embeddable, self-contained set of product highlights for ecommerce pages.
 *
 * One script, one payload, three presentations. Each highlight declares where
 * it belongs and the widget renders it there:
 *
 *   "list"   the inline list beneath the buy action  (default)
 *   "toast"  a transient pill pinned to the viewport
 *   "badge"  a small pill anchored inside an element the merchant names
 *
 * Placement is declared in the data, never derived from `type`. The merchant
 * knows where their product image is; we never do. And anything that cannot be
 * placed falls back to the list — no anchor match, unknown placement, a second
 * item asking for the toast. Every item always ends up somewhere.
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
  // Shown when a merchant sends an icon name we do not recognise. Never a
  // broken image, never an empty gap.
  _fallback: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.5v4.5M12 8h.01"/>',
};

/* -------------------------------------------------------------------------
 * Shared theme tokens
 *
 * The three presentations render in three separate shadow roots, so the token
 * block is declared once here and injected into each.
 * ---------------------------------------------------------------------- */
const TOKENS = `
  --hl-surface: transparent;
  --hl-surface-raised: #ffffff;
  --hl-ink: #2b2b2b;
  --hl-ink-muted: #6f675b;
  --hl-border: #e4ddcf;
  --hl-accent: #2b2b2b;
  /* Peak colour of the emphasis sweep. A warm amber rather than a brand
     colour: it echoes the page's own #b3a894 / #e4ddcf warmth and clears
     WCAG AA against white at roughly 5.7:1. Saturating further lightens it
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
  align-items: flex-start;
  gap: calc(var(--hl-space) * 3);
  box-sizing: border-box;
  width: max-content;
  max-width: min(30rem, calc(100vw - 32px));
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

.title {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
  color: var(--hl-ink);
  /* Shrink-wrapped so the sweep gradient is measured against the words rather
     than the pill, otherwise it spends most of its travel over empty space. */
  width: fit-content;
  max-width: 100%;
}

.body {
  margin: 3px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--hl-ink-muted);
  text-wrap: pretty;
}

/* The gradient is three times the title's width with the bright band at its
   centre. At background-position 100% the image is pulled left, parking the
   band off the left edge; at 0% it sits off the right. Animating 100% -> 0%
   therefore sweeps the highlight left to right.

   The class is added by script only when the sweep can actually run, and is
   removed again on animationend — a transparent colour must never outlive the
   animation that justifies it. */
.title.shimmer {
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
  .title.shimmer {
    background-image: none;
    color: var(--hl-ink);
    -webkit-text-fill-color: var(--hl-ink);
    animation: none;
  }
}

@media (forced-colors: active) {
  .pill { border-color: CanvasText; }
  .title.shimmer {
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
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(228, 221, 207, 0.9);
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

const PLACEMENTS = new Set(['list', 'toast', 'badge']);

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

    items.push({
      title: raw.title.trim(),
      // An absent body is legitimate — the row is simply title-only.
      body: isNonEmptyString(raw.body) ? raw.body.trim() : null,
      icon: Object.prototype.hasOwnProperty.call(ICONS, raw.icon) && raw.icon[0] !== '_'
        ? raw.icon
        : '_fallback',
      // Unknown or absent placement means the list, which every item can use.
      placement: PLACEMENTS.has(raw.placement) ? raw.placement : 'list',
      anchor: isNonEmptyString(raw.anchor) ? raw.anchor.trim() : null,
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

  for (const item of items) {
    if (item.placement === 'toast' && !toast) { toast = item; continue; }

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

  return { list, toast, badges };
}

/* -------------------------------------------------------------------------
 * Renderers
 * ---------------------------------------------------------------------- */

function buildList(items, label) {
  // A real list, so assistive technology announces the set and its length
  // before reading through it.
  const list = h('ul', {
    class: 'list',
    'aria-label': label,
    'data-cols': String(items.length <= 3 ? items.length : 1),
  });

  items.forEach((item, i) => {
    list.appendChild(
      h('li', { class: 'item', style: `--i:${i}` },
        icon(ICONS[item.icon]),
        h('div', { class: 'text' },
          h('p', { class: 'title', text: item.title }),
          item.body ? h('p', { class: 'body', text: item.body }) : null
        )
      )
    );
  });

  return { root: h('div', { class: 'root' }, list), list };
}

const TOAST_DWELL = 7000;
let toastShown = false; // once per page load, however many widgets are mounted

function showToast(item) {
  if (toastShown || !item) return;
  toastShown = true;

  const host = h('div', { 'data-product-highlights': 'toast', 'aria-hidden': 'true' });
  document.body.appendChild(host);

  const shadow = shadowWith(host, TOAST_STYLES);
  const title = h('p', { class: 'title', text: item.title });

  shadow.appendChild(
    h('div', { class: 'pill' },
      icon(ICONS[item.icon]),
      h('div', { class: 'text' },
        title,
        item.body ? h('p', { class: 'body', text: item.body }) : null
      )
    )
  );

  let closed = false;
  let timer = 0;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey, true);
    host.setAttribute('data-state', 'out');
    // Remove the element entirely rather than leaving an invisible fixed layer
    // sitting over the merchant's page.
    setTimeout(() => host.remove(), 320);
  }

  host.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);

  // Next frame, so the entrance transition has an initial state to move from.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    host.setAttribute('data-state', 'in');

    // `background-clip: text` needs a transparent colour to show anything.
    // Where unsupported that would render the title invisible, so the sweep is
    // applied only once support is confirmed, and dropped on completion.
    const canClip =
      typeof CSS === 'object' && typeof CSS.supports === 'function' &&
      (CSS.supports('background-clip', 'text') ||
       CSS.supports('-webkit-background-clip', 'text'));

    if (canClip && !prefersReducedMotion()) {
      title.addEventListener('animationend', () => title.classList.remove('shimmer'), { once: true });
      title.classList.add('shimmer');
    }

    timer = setTimeout(close, TOAST_DWELL);
  }));
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

/**
 * Render the widget into `target`.
 *
 * @param {string|Element} target       Element or selector for the list.
 * @param {object}  [options]
 * @param {object}  [options.content]   Content payload. Takes precedence over url.
 * @param {string}  [options.url]       URL to fetch the payload from.
 * @param {string}  [options.label]     Accessible name for the list.
 * @param {boolean} [options.toast]     Set false to keep toast items in the list.
 * @param {boolean} [options.badges]    Set false to keep badge items in the list.
 * @returns {Promise<Element|null>}     The host element, or null if nothing rendered.
 */
export async function mount(target, options = {}) {
  try {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;

    let content = options.content;
    if (!content && options.url) {
      const res = await fetch(options.url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await res.json();
    }

    const items = normalise(content);
    // Nothing renderable: leave the page exactly as we found it. No empty
    // box, no stray rule, no reserved space.
    if (items.length === 0) return null;

    const resolved = resolvePlacements(items);
    // Suppressing a surface returns its items to the list rather than dropping
    // them, so the payload always renders in full.
    const listItems = [...resolved.list];
    if (options.toast === false && resolved.toast) listItems.push(resolved.toast);
    if (options.badges === false) listItems.push(...resolved.badges.map((b) => b.item));
    listItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));

    const shadow = shadowWith(host, LIST_STYLES);
    const { root, list } = buildList(listItems, options.label || 'Product highlights');
    shadow.appendChild(root);

    playEntrance(root, list, () => {
      if (options.toast !== false) showToast(resolved.toast);
      if (options.badges !== false) resolved.badges.forEach(showBadge);
    });

    return host;
  } catch (err) {
    // A third-party widget has no business taking a merchant's page down with
    // it. Report, render nothing, let the page carry on.
    console.warn('[product-highlights] did not render:', err);
    return null;
  }
}

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
  });
}
