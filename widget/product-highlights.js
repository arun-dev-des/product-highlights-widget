/**
 * Product Highlights
 * ------------------
 * An embeddable, self-contained highlights list for ecommerce product pages.
 *
 * Design notes live in docs/decisions/. In short:
 *   - ADR 0001: everything renders inside a shadow root, so neither the host
 *     page nor this widget can restyle the other by accident.
 *   - ADR 0002: the default theme is a deliberate design, not a fallback.
 *     Merchants adjust it through nine CSS custom properties.
 *
 * The content is short enough to show in full, so it is shown in full. There
 * is nothing to expand, nothing to swipe, nothing to dismiss. The only motion
 * is a single staggered entrance that establishes reading order down the list.
 *
 * Usage — auto-mount from a script tag:
 *   <script type="module" src="product-highlights.js"
 *           data-mount="#slot" data-content="highlights.json"></script>
 *
 * Usage — programmatic:
 *   import { mount } from './product-highlights.js';
 *   mount('#slot', { content: { highlights: [...] } });
 *
 * No dependencies. No globals. Nothing is written to the host document.
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
 * Styles
 *
 * `all: initial` on :host severs every inherited property at the boundary —
 * shadow DOM blocks selector matching, not inheritance, so without this the
 * host page's font and colour would flow straight in. Everything below is
 * then chosen deliberately rather than acquired by accident.
 * ---------------------------------------------------------------------- */
const STYLES = `
:host {
  all: initial;
  display: block;

  /* Public theming contract — nine tokens, all optional. See ADR 0002. */
  --hl-surface: transparent;
  --hl-surface-muted: #faf8f4;
  --hl-ink: #2b2b2b;
  --hl-ink-muted: #6f675b;
  --hl-border: #e4ddcf;
  --hl-accent: #2b2b2b;
  --hl-radius: 4px;
  --hl-font: Georgia, 'Times New Roman', serif;
  --hl-space: 4px;

  /* Internal. Not public API. */
  --_ease: cubic-bezier(0.2, 0, 0, 1);
  --_icon: 24px;
  --_gap: calc(var(--hl-space) * 4.5);

  font-family: var(--hl-font);
  color: var(--hl-ink);
  -webkit-font-smoothing: antialiased;
  text-size-adjust: 100%;
}

/* Hairlines above and below rather than a box. The widget reads as a section
   of the page rather than a component dropped onto it, and its text aligns
   with the host page's own left edge. */
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

/* --- Row ---------------------------------------------------------------- */

.item {
  display: flex;
  /* Top-aligned, not centred: the icon sits against the first line of the
     title and stays there when a long title wraps. */
  align-items: flex-start;
  gap: var(--_gap);
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

/* --- Entrance ----------------------------------------------------------- */

/* The only motion in the widget. It runs once, when the list first scrolls
   into view, and its job is to lead the eye down the column in reading order.
   Items are visible by default and only hidden once we know we can reveal
   them — a failed observer leaves the content on screen, never hidden. */
.list[data-enter] .item {
  transition: opacity 460ms var(--_ease), transform 460ms var(--_ease);
  transition-delay: calc(var(--i, 0) * 60ms);
}
.list[data-enter="pending"] .item {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .list[data-enter] .item { transition: none; transition-delay: 0s; }
  .list[data-enter="pending"] .item { opacity: 1; transform: none; }
}

/* --- Forced colours ----------------------------------------------------- */

@media (forced-colors: active) {
  .root { border-color: CanvasText; }
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

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

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
    });
    return items;
  }, []);
}

/* -------------------------------------------------------------------------
 * Render
 * ---------------------------------------------------------------------- */

function build(items, label) {
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

/**
 * Reveal the list on first scroll into view.
 *
 * Content starts visible. It is only hidden once we have confirmed both that
 * motion is welcome and that we have an observer able to bring it back.
 */
function playEntrance(root, list) {
  const reduced =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || typeof IntersectionObserver !== 'function') return;

  list.dataset.enter = 'pending';
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      list.dataset.enter = 'done';
      io.disconnect();
    },
    { threshold: 0.15 }
  );
  io.observe(root);
}

/* -------------------------------------------------------------------------
 * Mount
 * ---------------------------------------------------------------------- */

/**
 * Render the widget into `target`.
 *
 * @param {string|Element} target       Element or selector to mount into.
 * @param {object}  [options]
 * @param {object}  [options.content]   Content payload. Takes precedence over url.
 * @param {string}  [options.url]       URL to fetch the payload from.
 * @param {string}  [options.label]     Accessible name for the list.
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

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.replaceChildren();

    // Constructable stylesheets are parsed once and shared across instances;
    // the <style> path is a fallback for older engines.
    if ('adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      shadow.adoptedStyleSheets = [sheet];
    } else {
      shadow.appendChild(h('style', { text: STYLES }));
    }

    const { root, list } = build(items, options.label || 'Product highlights');
    shadow.appendChild(root);
    playEntrance(root, list);

    return host;
  } catch (err) {
    // A third-party widget has no business taking a merchant's page down with
    // it. Report, render nothing, let the page carry on.
    console.warn('[product-highlights] did not render:', err);
    return null;
  }
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
