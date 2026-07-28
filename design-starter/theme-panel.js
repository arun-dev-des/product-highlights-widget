/**
 * Theme panel
 * -----------
 * A merchant-facing configurator for the product highlights widget.
 *
 * This is NOT part of the widget. It ships with the host page, adds nothing to
 * `widget/product-highlights.js`, and can be removed by deleting its one script
 * tag. The widget has no knowledge that it exists — the panel only sets the
 * public custom properties from ADR 0002's token contract, which is the same
 * channel a merchant's own stylesheet would use.
 *
 * Two things about it are worth stating up front, because both were discovered
 * by building it rather than by reading the code:
 *
 * 1. Tokens have to be set on each shadow host, not on a shared ancestor.
 *
 *    The widget's three surfaces attach in three different places — the list to
 *    the mount element, the toast to `document.body`, the badge inside the
 *    merchant's anchor — so tokens set on the mount reach the list and rating
 *    panel only. The obvious repair is to set them higher up, on `:root`. That
 *    does not work either: the widget *declares* its defaults inside `:host`,
 *    and a declared value always beats an inherited one, so `:root` tokens are
 *    shadowed by the widget's own.
 *
 *    What works is a selector that matches the host elements themselves, where
 *    an outer-tree declaration outranks the shadow tree's `:host` rule. Hence
 *    `#widget-slot, [data-product-highlights]` in the generated CSS, and
 *    per-element `setProperty` for the live preview.
 *
 * 2. The contrast gate specified in ADR 0002 §3 lives here. It could not be
 *    implemented inside the widget, because custom properties are applied by the
 *    browser directly and there is nothing to intercept. A configurator is the
 *    interception point — the first place in the cascade where a value can be
 *    judged before it is used.
 */

/* -------------------------------------------------------------------------
 * Wiring
 *
 * The panel has to share the page's widget instance rather than load a second
 * one. A module's identity is its resolved URL, so importing a path that
 * differs from the page's script tag by so much as a cache-busting query gives
 * two modules, two auto-mounts and two toasts — and the panel's `_reset()`
 * cannot see the instance the page actually mounted.
 *
 * So the URL is taken from the widget's own tag rather than written here and
 * kept in sync by hand. The literal below is only the fallback for a page that
 * mounts programmatically and has no tag to read.
 * ---------------------------------------------------------------------- */
const widgetTag = document.querySelector('script[data-mount][data-content]');

/**
 * Get at the widget's API without running it twice.
 *
 * A `type="module"` tag and this module share a resolution map, so importing
 * the same URL hands back the instance the page already has. A classic tag does
 * not: it has executed in its own world and published its API on a global, and
 * importing that same file would be a second execution and a second mount. So
 * the global wins whenever the tag is not a module — which is how the React
 * build in `react/` ships.
 */
async function widgetApi() {
  if (widgetTag && widgetTag.type !== 'module' && window.ProductHighlights) {
    return window.ProductHighlights;
  }
  const url = widgetTag
    ? widgetTag.src
    : new URL('../widget/product-highlights.js', import.meta.url).href;
  const ns = await import(url);
  // An IIFE bundle imported as a module runs but exports nothing, so fall back
  // to whatever it published on the way past.
  return typeof ns.mount === 'function' ? ns : window.ProductHighlights;
}

const api = await widgetApi();
const mount = api && api.mount;
const _reset = (api && api._reset) || (() => {});

/* Which layouts this build actually renders. The vanilla widget says so; a build
   that does not answer gets the one layout every build has. */
const SUPPORTED = Array.isArray(api && api.layouts) ? api.layouts : ['distributed'];

/* Where to point.
 *
 * `document.currentScript` is null inside a module, so the panel finds its own
 * tag by attributes of its own — deliberately not the widget's `data-mount` and
 * `data-content`, which the widget's auto-mount queries for and would then pick
 * up the wrong tag. Both are optional: absent, they follow the widget's tag, so
 * dropping the panel onto a page that already embeds the widget needs no
 * configuration at all. */
const tag = document.querySelector('script[data-panel-mount], script[data-panel-content]');
const MOUNT = (tag && tag.dataset.panelMount)
  || (widgetTag && widgetTag.dataset.mount)
  || '#widget-slot';
const CONTENT = (tag && tag.dataset.panelContent)
  || (widgetTag && widgetTag.dataset.content)
  || './sample-content.json';

/* -------------------------------------------------------------------------
 * The token contract
 *
 * Exactly the tokens the widget actually reads. `--hl-accent` is declared in
 * the widget's TOKENS block but never referenced by any rule, so it is
 * deliberately absent: a control that visibly does nothing is worse than no
 * control at all.
 * ---------------------------------------------------------------------- */
/**
 * `in` lists the layouts where a token has something to paint.
 *
 * A single-surface layout renders no toast, no badge and no rating panel, so
 * the tokens that only colour those surfaces have nothing to act on; the compact
 * grid drops body copy too. Leaving those controls live would mean shipping
 * sliders that silently do nothing, which is the reason `--hl-accent` is absent
 * from this list altogether.
 */
const ALL = ['distributed', 'list', 'compact', 'simple', 'accordion', 'steps'];
/* The accordion and the stepper still render bodies — behind a click, but in
   the same ink. */
const HAS_BODY = ['distributed', 'list', 'compact', 'accordion', 'steps'];
const NO_FLOAT = 'Nothing floats in this layout';

const FIELDS = [
  { key: '--hl-ink',           label: 'Primary text',    hint: 'Titles, numerals, icons', kind: 'color', def: '#2b2b2b', in: ALL },
  { key: '--hl-ink-muted',     label: 'Supporting text', hint: 'Body copy',               kind: 'color', def: '#6f675b',
    in: HAS_BODY, why: 'Super simple shows titles only' },
  { key: '--hl-border',        label: 'Hairlines',       hint: 'Rules, borders, star track', kind: 'color', def: '#e4ddcf', in: ALL },
  { key: '--hl-surface',       label: 'List background', hint: 'Transparent by default, for native feel', kind: 'color', def: '#fdfcf9', transparent: true, in: ALL },
  { key: '--hl-surface-raised',label: 'Toast & badge',   hint: 'Surfaces that float above the page', kind: 'color', def: '#ffffff',
    in: ['distributed'], why: NO_FLOAT },
  /* Also the stepper's active row and dwell bar — the one token in the contract
     already chosen against a contrast threshold, so it is what a highlighted
     row reaches for. */
  { key: '--hl-shimmer',       label: 'Emphasis',        hint: 'Toast sweep, and the active step', kind: 'color', def: '#8a5a1f',
    in: ['distributed', 'steps'], why: NO_FLOAT },
  { key: '--hl-radius',        label: 'Corner radius',   hint: 'Rating panel, toast and badge', kind: 'range', def: 4, min: 0, max: 20, unit: 'px',
    in: ['distributed'], why: 'Nothing in this layout has a corner' },
  { key: '--hl-space',         label: 'Spacing unit',    hint: 'Every gap is a multiple of this', kind: 'range', def: 4, min: 2, max: 8, unit: 'px', in: ALL },
  { key: '--hl-font',          label: 'Type family',     kind: 'font', def: "Georgia, 'Times New Roman', serif", in: ALL },
];

const FONTS = [
  ['Georgia (page default)', "Georgia, 'Times New Roman', serif"],
  ['System sans',            "-apple-system, BlinkMacSystemFont, 'Segoe UI', ui-sans-serif, sans-serif"],
  ['Helvetica / Arial',      "'Helvetica Neue', Arial, sans-serif"],
  ['Times New Roman',        "'Times New Roman', Times, serif"],
  ['Monospace',              "ui-monospace, 'SF Mono', Menlo, monospace"],
];

/* Presets exist to make the trade legible in one click rather than to be
   shipped as themes. "Dark storefront" is deliberately wrong on this light
   page — it is the case ADR 0002 says merchants must theme, and it makes the
   contrast gate fire, which is the point. */
const PRESETS = {
  'Aster (default)': null, // null means "restore every default"
  'Modern sans': {
    '--hl-ink': '#141414', '--hl-ink-muted': '#5c5c5c', '--hl-border': '#e2e2e2',
    '--hl-surface': null, '--hl-surface-raised': '#ffffff', '--hl-shimmer': '#0b6b5e',
    '--hl-radius': 10, '--hl-space': 5,
    '--hl-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', ui-sans-serif, sans-serif",
  },
  'Dark storefront': {
    '--hl-ink': '#f2f2f4', '--hl-ink-muted': '#a5a5b0', '--hl-border': '#2a2a33',
    '--hl-surface': null, '--hl-surface-raised': '#1c1c22', '--hl-shimmer': '#ffcd6b',
    '--hl-radius': 10, '--hl-space': 4,
    '--hl-font': "'Helvetica Neue', Arial, sans-serif",
  },
};

/* -------------------------------------------------------------------------
 * Layout
 *
 * Not a token. The nine above are skin — declarative, applied by the browser,
 * costing nothing. Layout is structure, so it is a mount option, and it needs a
 * remount to take effect rather than a style write. That is why it is in its own
 * section here and why the output panel emits two blocks rather than one.
 * ---------------------------------------------------------------------- */
const LAYOUTS = [
  { id: 'distributed', name: 'Distributed', hint: 'Four placements — list, rating, toast, badge' },
  { id: 'list',        name: 'Inline list', hint: 'One list, titles and bodies' },
  { id: 'compact',     name: 'Compact grid', hint: 'Two columns — mark, title, body' },
  { id: 'simple',      name: 'Super simple', hint: 'Three columns — mark and title only' },
  { id: 'accordion',   name: 'Accordion', hint: 'One list, bodies behind a disclosure' },
  { id: 'steps',       name: 'Animated steps', hint: 'Cycles its rows continuously; a click takes over' },
];

/** Layouts that stamp their name on the list, so the panel can tell whether the
 *  widget actually honoured the request. See the handshake in setLayout. */
const STAMPED = ['compact', 'simple', 'accordion', 'steps'];

/* -------------------------------------------------------------------------
 * Contrast — ADR 0002 §3, verbatim
 * ---------------------------------------------------------------------- */

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

/** Accepts `#rgb`, `#rrggbb` and the `rgb()/rgba()` strings getComputedStyle returns. */
function toRgb(value) {
  if (!value) return null;
  const v = String(value).trim();

  if (v[0] === '#') {
    const hex = v.length === 4
      ? v.slice(1).split('').map((c) => c + c).join('')
      : v.slice(1);
    if (hex.length !== 6) return null;
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite) ? parts.slice(0, 3) : null;
}

/**
 * What the list text is actually sitting on.
 *
 * `--hl-surface` defaults to `transparent`, so the effective background is
 * whichever ancestor paints one. Walking up for it is the *bounded* inference
 * ADR 0002 sanctions — background luminance read from elements that always
 * exist, never a guess at a semantic selector like `.btn` or `.AddToCart`.
 */
function pageBackground() {
  for (let el = document.body; el; el = el.parentElement) {
    const rgb = toRgb(getComputedStyle(el).backgroundColor);
    if (rgb && !/rgba\([^)]*,\s*0\s*\)/.test(getComputedStyle(el).backgroundColor)) return rgb;
  }
  return [255, 255, 255];
}

/* -------------------------------------------------------------------------
 * State
 * ---------------------------------------------------------------------- */

/** Current value per token. `null` on a `transparent`-capable field means transparent. */
const state = new Map(FIELDS.map((f) => [f.key, f.transparent ? null : f.def]));

let layout = 'distributed';

/** Re-render every surface. Required for layout, and useful after a type change:
 *  the toast locks its rotator to a measured pixel width, so a new font family
 *  wants a fresh measurement rather than the old box.
 *
 *  The payload URL carries a cache-busting parameter. This is a development
 *  tool, and the content file is the thing most likely to have just been edited;
 *  without it a browser happily serves the copy it fetched before the edit, and
 *  the widget gets blamed for rendering exactly what it was given. The widget
 *  itself deliberately does not do this — a merchant wants their CDN to cache
 *  the payload, and inventing a unique URL per view would defeat that. */
function remountWidget() {
  _reset();
  const slot = document.querySelector(MOUNT);
  slot?.shadowRoot?.replaceChildren();
  const bust = `${CONTENT.includes('?') ? '&' : '?'}v=${Date.now()}`;
  return mount(MOUNT, { url: CONTENT + bust, layout });
}

const isDefault = (f) => (f.transparent ? state.get(f.key) === null : state.get(f.key) === f.def);
const anyChanged = () => FIELDS.some((f) => !isDefault(f));

/** The value as CSS. */
function cssValue(f) {
  const v = state.get(f.key);
  if (f.transparent && v === null) return 'transparent';
  return f.kind === 'range' ? `${v}${f.unit}` : v;
}

/**
 * Every element that hosts a shadow root of the widget's.
 *
 * The mount is named by the merchant; the toast and badge tag themselves with
 * `data-product-highlights` on the way out. A shared ancestor would be tidier,
 * but see the note at the top of this file — the widget declares its defaults
 * on `:host`, so only a rule matching the host element itself can outrank them.
 */
const TARGETS = `${MOUNT}, [data-product-highlights]`;

/**
 * Apply the current state to every surface.
 *
 * Only tokens that actually differ from the default are written, so an
 * untouched panel leaves the page with no inline styles on it at all.
 */
function apply() {
  for (const node of document.querySelectorAll(TARGETS)) {
    for (const f of FIELDS) {
      if (isDefault(f)) node.style.removeProperty(f.key);
      else node.style.setProperty(f.key, cssValue(f));
    }
  }
}

/* The toast and badge are created after mount, and recreated after a dismissal
   or a remount. Rather than re-applying on a timer, catch them arriving. Only
   childList is observed, so `apply()` writing style attributes cannot re-enter
   this. */
new MutationObserver((records) => {
  let dirty = false;
  for (const r of records) {
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1) continue;

      // A single-surface layout has no toast and no badge, so one appearing
      // means something else mounted the widget — on first load the host page's
      // own script tag is racing this panel, and its floating surfaces arrive
      // after ours were cleared. Take them back off rather than leaving two
      // layouts on the page at once.
      if (layout !== 'distributed' && n.matches?.('[data-product-highlights]')) {
        n.remove();
        continue;
      }

      if (n.matches?.(TARGETS) || n.querySelector?.(TARGETS)) dirty = true;
    }
  }
  if (dirty) apply();
}).observe(document.documentElement, { childList: true, subtree: true });

/* -------------------------------------------------------------------------
 * Panel UI
 *
 * In its own shadow root, for the same reason the widget is: this page claims
 * `.card`, `.title`, `.btn` and `.container`, and a configurator that restyled
 * the merchant's add-to-cart button while demonstrating style isolation would
 * be a poor advertisement for it.
 * ---------------------------------------------------------------------- */

const PANEL_CSS = `
:host {
  all: initial;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #1c1c1c;
  /* Above the toast's 9999, so the tool is never the thing that is covered. */
  z-index: 10000;
}

.tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 9px;
  border: 1px solid #ddd6c8;
  border-right: 0;
  border-radius: 8px 0 0 8px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(43, 43, 43, 0.12);
  font: 600 10px/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  cursor: pointer;
  transition: background 160ms ease;
}
.tab:hover { background: #faf8f3; }
.tab .dot { writing-mode: horizontal-tb; width: 9px; height: 9px; border-radius: 50%;
            background: linear-gradient(135deg, #8a5a1f, #e4ddcf); }
:host([data-open]) .tab { display: none; }

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 336px;
  max-width: 100vw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #e6e0d4;
  box-shadow: -8px 0 32px rgba(43, 43, 43, 0.14);
  transform: translateX(100%);
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
:host([data-open]) .drawer { transform: none; }
@media (prefers-reduced-motion: reduce) { .drawer { transition: none; } }

header {
  display: flex; align-items: baseline; gap: 8px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #efeae0;
}
h2 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: -0.01em; }
header p { margin: 0; font-size: 11px; color: #8d8d8d; flex: 1; }
.close {
  all: unset; cursor: pointer; font-size: 17px; line-height: 1; color: #9b9b9b;
  padding: 2px 4px; border-radius: 4px;
}
.close:hover { color: #1c1c1c; background: #f4f1ea; }
.close:focus-visible { outline: 2px solid #8a5a1f; outline-offset: 1px; }

.body { flex: 1; overflow-y: auto; padding: 4px 16px 16px; }

fieldset { border: 0; margin: 0; padding: 14px 0 0; }
legend {
  padding: 0; font-size: 10px; font-weight: 650; letter-spacing: 0.08em;
  text-transform: uppercase; color: #a09a8e;
}

.presets { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.preset {
  all: unset; cursor: pointer; font-size: 11px; padding: 5px 9px;
  border: 1px solid #e0d9cb; border-radius: 999px; background: #fff;
}
.preset:hover { background: #faf8f3; }
.preset:focus-visible { outline: 2px solid #8a5a1f; outline-offset: 1px; }

.layouts { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.layout {
  all: unset; cursor: pointer; display: block;
  padding: 7px 10px; border: 1px solid #e0d9cb; border-radius: 7px;
}
.layout:hover { background: #faf8f3; }
.layout:focus-visible { outline: 2px solid #8a5a1f; outline-offset: 1px; }
.layout[aria-pressed="true"] { border-color: #2b2b2b; background: #faf8f3; }
.layout .lname { display: block; font-size: 12px; }
.layout .lhint { display: block; font-size: 10.5px; color: #a09a8e; margin-top: 1px; }

/* Offered by the panel, not implemented by the build on this page. Shown and
   disabled rather than hidden, so the gap is legible instead of mysterious. */
.layout[aria-disabled="true"] { opacity: 0.42; cursor: not-allowed; }
.layout[aria-disabled="true"]:hover { background: #fff; }
.layout[aria-disabled="true"] .lhint { color: #9a7b4f; }

.row { display: flex; align-items: center; gap: 9px; padding: 8px 0; }
.row + .row { border-top: 1px solid #f4f1ea; }
.row .meta { flex: 1; min-width: 0; }
.row .name { display: block; font-size: 12px; }
.row .hint { display: block; font-size: 10.5px; color: #a09a8e; margin-top: 1px; }
.row code { font-size: 10px; color: #b9b2a4; }

/* Dimmed rather than hidden: a merchant who wonders where the toast colour went
   should be told, not left to hunt for it. */
.row.inert .name, .row.inert .hint { opacity: 0.45; }
.row.inert input, .row.inert select { opacity: 0.35; pointer-events: none; }
.row .why { display: none; }
.row.inert .why {
  display: block; font-size: 10px; color: #9a7b4f; margin-top: 2px;
}

input[type="color"] {
  all: unset; width: 30px; height: 24px; border-radius: 5px; cursor: pointer;
  border: 1px solid #ddd6c8; overflow: hidden;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
input[type="color"]::-webkit-color-swatch { border: 0; border-radius: 3px; }
input[type="color"]:disabled { opacity: 0.3; cursor: not-allowed; }

input[type="range"] { width: 96px; accent-color: #8a5a1f; }
select {
  font: inherit; font-size: 11.5px; max-width: 150px;
  padding: 4px 5px; border: 1px solid #ddd6c8; border-radius: 5px; background: #fff;
}
.val { font-size: 11px; color: #8d8d8d; width: 30px; text-align: right;
       font-variant-numeric: tabular-nums; }

.tcheck { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #8d8d8d; }
.tcheck input { accent-color: #8a5a1f; margin: 0; }

/* --- Contrast gate ------------------------------------------------------- */

.gate { margin-top: 8px; border: 1px solid #efeae0; border-radius: 7px; overflow: hidden; }
.gate .line {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; font-size: 11.5px;
}
.gate .line + .line { border-top: 1px solid #f4f1ea; }
.gate .what { flex: 1; }
.gate .ratio { font-variant-numeric: tabular-nums; color: #6b6b6b; }
.gate .verdict {
  font-size: 9.5px; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 3px;
}
.pass .verdict { background: #e7f3ec; color: #1c6b42; }
.fail .verdict { background: #fdeaea; color: #a3231f; }
.fail { background: #fffafa; }

.gatenote {
  margin: 7px 0 0; font-size: 10.5px; line-height: 1.45; color: #a3231f;
}
.gatenote:empty { display: none; }

/* --- Output -------------------------------------------------------------- */

textarea {
  width: 100%; box-sizing: border-box; margin-top: 8px;
  font: 11px/1.55 ui-monospace, 'SF Mono', Menlo, monospace;
  color: #3a3a3a; background: #faf8f3;
  border: 1px solid #e6e0d4; border-radius: 6px; padding: 9px;
  resize: vertical; min-height: 96px;
}
textarea:focus-visible { outline: 2px solid #8a5a1f; outline-offset: -1px; }

footer { display: flex; gap: 6px; padding: 12px 16px; border-top: 1px solid #efeae0; }
footer button {
  all: unset; cursor: pointer; font-size: 11.5px; text-align: center;
  padding: 7px 10px; border-radius: 6px; border: 1px solid #ddd6c8;
}
footer button:hover { background: #faf8f3; }
footer button:focus-visible { outline: 2px solid #8a5a1f; outline-offset: 1px; }
footer .primary { flex: 1; background: #2b2b2b; color: #fff; border-color: #2b2b2b; }
footer .primary:hover { background: #444; }

.note { margin: 12px 0 0; font-size: 10.5px; line-height: 1.5; color: #a09a8e; }
.note b { color: #8d8d8d; font-weight: 600; }
`;

const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) if (c) n.appendChild(c);
  return n;
};

function build() {
  const host = el('div', { 'data-theme-panel': '' });
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(PANEL_CSS);
  shadow.adoptedStyleSheets = [sheet];

  const open = (on) => (on ? host.setAttribute('data-open', '') : host.removeAttribute('data-open'));

  shadow.appendChild(
    el('button', {
      class: 'tab', type: 'button', 'aria-label': 'Open theme settings',
      onclick: () => open(true),
    }, el('span', { class: 'dot' }), document.createTextNode('Theme')),
  );

  /* --- controls --------------------------------------------------------- */

  const controls = el('fieldset', {}, el('legend', { text: 'Tokens' }));
  const inputs = new Map();
  const rows = new Map();

  for (const f of FIELDS) {
    const row = el('div', { class: 'row' });
    const why = el('span', { class: 'why', text: f.why || '' });
    const meta = el('div', { class: 'meta' },
      el('span', { class: 'name', text: f.label }),
      el('span', { class: 'hint' }, el('code', { text: f.key })),
      why,
    );
    if (f.hint) meta.querySelector('.hint').append(` · ${f.hint}`);
    row.appendChild(meta);
    rows.set(f.key, row);

    if (f.kind === 'color') {
      const input = el('input', {
        type: 'color', value: f.def, 'aria-label': f.label,
        oninput: (e) => { state.set(f.key, e.target.value); refresh(); },
      });
      if (f.transparent) {
        input.disabled = true;
        const box = el('input', {
          type: 'checkbox', id: `t-${f.key}`,
          onchange: (e) => {
            input.disabled = e.target.checked;
            state.set(f.key, e.target.checked ? null : input.value);
            refresh();
          },
        });
        box.checked = true;
        row.appendChild(el('label', { class: 'tcheck', for: `t-${f.key}` }, box,
          document.createTextNode('None')));
      }
      row.appendChild(input);
      inputs.set(f.key, input);
    }

    if (f.kind === 'range') {
      const out = el('span', { class: 'val', text: `${f.def}${f.unit}` });
      const input = el('input', {
        type: 'range', min: f.min, max: f.max, step: 1, value: f.def, 'aria-label': f.label,
        oninput: (e) => {
          state.set(f.key, Number(e.target.value));
          out.textContent = `${e.target.value}${f.unit}`;
          refresh();
        },
      });
      row.append(input, out);
      inputs.set(f.key, input);
    }

    if (f.kind === 'font') {
      const input = el('select', {
        'aria-label': f.label,
        onchange: (e) => { state.set(f.key, e.target.value); refresh(); },
      });
      for (const [name, stack] of FONTS) input.appendChild(el('option', { value: stack, text: name }));
      input.value = f.def;
      row.appendChild(input);
      inputs.set(f.key, input);
    }

    controls.appendChild(row);
  }

  /* --- layout ----------------------------------------------------------- */

  const layouts = el('div', { class: 'layouts' });
  const layoutBtns = new Map();
  /* Reuses the gate's red-note styling; :empty keeps it collapsed when clear. */
  const layoutNote = el('p', { class: 'gatenote' });

  const setLayout = async (id) => {
    if (id === layout) return;
    layout = id;
    for (const [key, btn] of layoutBtns) btn.setAttribute('aria-pressed', String(key === id));
    // A render mode, so it needs a rebuild rather than a style write. Tokens
    // survive it: the mount keeps its inline properties, and the observer above
    // catches the toast and badge as they reappear.
    const host = await remountWidget();

    // Handshake. The grid layouts stamp data-layout on the list, so its absence
    // after a remount means the page is executing a cached copy of the widget
    // that predates the option — which otherwise fails silently and reads as
    // this panel being broken. Say so instead.
    const honoured = !STAMPED.includes(id) ||
      host?.shadowRoot?.querySelector('.list')?.getAttribute('data-layout') === id;
    layoutNote.textContent = honoured ? '' :
      'The widget ignored this layout — the page is running a cached ' +
      'product-highlights.js from before layouts existed. Hard-reload ' +
      '(⌘⇧R) and try again.';
    if (!honoured) console.warn('[theme-panel] stale product-highlights.js cached; hard-reload');

    refresh();
  };

  for (const l of LAYOUTS) {
    const ok = SUPPORTED.includes(l.id);
    const b = el('button', {
      class: 'layout', type: 'button',
      'aria-pressed': String(l.id === layout),
      'aria-disabled': ok ? null : 'true',
      disabled: ok ? null : '',
      onclick: () => { if (ok) setLayout(l.id); },
    },
      el('span', { class: 'lname', text: l.name }),
      el('span', { class: 'lhint', text: ok ? l.hint : 'Not implemented by the build on this page' }),
    );
    layoutBtns.set(l.id, b);
    layouts.appendChild(b);
  }

  /* --- presets ---------------------------------------------------------- */

  const usePreset = (values) => {
    for (const f of FIELDS) {
      state.set(f.key, values ? (f.key in values ? values[f.key] : f.def)
                              : (f.transparent ? null : f.def));
    }
    syncInputs();
    refresh();
  };

  const presets = el('div', { class: 'presets' });
  for (const [name, values] of Object.entries(PRESETS)) {
    presets.appendChild(el('button', {
      class: 'preset', type: 'button', text: name,
      onclick: () => usePreset(values),
    }));
  }

  /* --- gate, output, footer --------------------------------------------- */


  const gate = el('div', { class: 'gate' });
  const gatenote = el('p', { class: 'gatenote' });
  const out = el('textarea', { readonly: '', spellcheck: 'false', 'aria-label': 'Generated CSS' });

  const copy = el('button', {
    class: 'primary', type: 'button', text: 'Copy CSS',
    onclick: async () => {
      try { await navigator.clipboard.writeText(out.value); } catch { out.select(); }
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy CSS'; }, 1400);
    },
  });

  const remount = el('button', {
    type: 'button', text: 'Remount',
    title: 'Re-render every surface so the toast re-measures against the new type',
    onclick: () => remountWidget().then(refresh),
  });

  const reset = el('button', {
    type: 'button', text: 'Reset',
    onclick: async () => {
      for (const f of FIELDS) state.set(f.key, f.transparent ? null : f.def);
      syncInputs();
      await setLayout('distributed');
      refresh();
    },
  });

  shadow.appendChild(
    el('aside', { class: 'drawer', 'aria-label': 'Theme settings' },
      el('header', {},
        el('h2', { text: 'Theme' }),
        el('p', { text: 'ADR 0002 token contract' }),
        el('button', { class: 'close', type: 'button', 'aria-label': 'Close', text: '✕',
                       onclick: () => open(false) }),
      ),
      el('div', { class: 'body' },
        el('fieldset', {}, el('legend', { text: 'Layout' }), layouts, layoutNote),
        el('fieldset', {}, el('legend', { text: 'Presets' }), presets),
        controls,
        el('fieldset', {}, el('legend', { text: 'Legibility' }), gate, gatenote),
        el('fieldset', {}, el('legend', { text: 'Output' }), out,
          el('p', { class: 'note' }, el('b', { text: 'Set on each surface, not on an ancestor.' }),
            document.createTextNode(' The toast attaches to document.body and the badge to your ' +
              'anchor, so neither inherits from the mount — and :root loses to the widget’s own ' +
              ':host defaults. Only a rule matching the host elements wins.')),
        ),
      ),
      el('footer', {}, copy, remount, reset),
    ),
  );

  /* --- sync, gate, output ------------------------------------------------ */

  /** Grey out the tokens the current layout has no surface for, and say why. */
  function syncAvailability() {
    for (const f of FIELDS) {
      const row = rows.get(f.key);
      if (!row) continue;
      row.classList.toggle('inert', !f.in.includes(layout));
    }
  }

  function syncInputs() {
    for (const f of FIELDS) {
      const input = inputs.get(f.key);
      const v = state.get(f.key);
      if (f.kind === 'color') {
        const box = shadow.querySelector(`#t-${CSS.escape(f.key)}`);
        if (box) {
          box.checked = v === null;
          input.disabled = v === null;
        }
        if (v !== null) input.value = v;
      } else if (f.kind === 'range') {
        input.value = v;
        input.nextElementSibling.textContent = `${v}${f.unit}`;
      } else {
        input.value = v;
      }
    }
  }

  /**
   * ADR 0002 §3 — legibility overrides adaptation.
   *
   * The ADR specifies rejecting a failing pair and falling back to the default.
   * A live configurator reports instead: silently discarding what somebody just
   * typed reads as a broken control, and the merchant is right here to fix it.
   * The rejection belongs at the payload boundary, where nobody is watching.
   */
  function checkGate() {
    const ink = toRgb(state.get('--hl-ink'));
    const muted = toRgb(state.get('--hl-ink-muted'));
    const shimmer = toRgb(state.get('--hl-shimmer'));
    const raised = toRgb(state.get('--hl-surface-raised'));
    const listBg = state.get('--hl-surface') === null
      ? pageBackground()
      : toRgb(state.get('--hl-surface'));

    // Only pairs the current layout actually renders. Grading the contrast of a
    // toast that this layout does not draw is a reassuring number about nothing.
    const pairs = [
      ['Title on list', ink, listBg, 4.5, ALL],
      ['Body on list', muted, listBg, 4.5, HAS_BODY],
      ['Toast title', ink, raised, 4.5, ['distributed']],
      ['Sweep peak', shimmer, raised, 4.5, ['distributed']],
    ];

    gate.replaceChildren();
    let failures = 0;

    for (const [what, fg, bg, min, where] of pairs) {
      if (!where.includes(layout)) continue;
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      const ok = ratio >= min;
      if (!ok) failures++;
      gate.appendChild(
        el('div', { class: `line ${ok ? 'pass' : 'fail'}` },
          el('span', { class: 'what', text: what }),
          el('span', { class: 'ratio', text: `${ratio.toFixed(2)}:1` }),
          el('span', { class: 'verdict', text: ok ? 'AA' : 'Fail' }),
        ),
      );
    }

    gatenote.textContent = failures
      ? `${failures} pair${failures > 1 ? 's fall' : ' falls'} below the 4.5:1 AA threshold for ` +
        `body text. Being off-brand is cosmetic; being illegible is not.`
      : '';
  }

  function writeOutput() {
    const blocks = [];

    /* Layout changes what is rendered, so it cannot be a style override — it
       goes on the script tag beside the payload, not in the stylesheet. */
    if (layout !== 'distributed') {
      blocks.push(
        '<!-- Layout is a mount option, not a token. -->\n' +
        '<script type="module" src="/widget/product-highlights.js"\n' +
        `        data-mount="${MOUNT}"\n` +
        `        data-content="${CONTENT}"\n` +
        `        data-layout="${layout}"><\/script>`,
      );
    }

    const changed = FIELDS.filter((f) => !isDefault(f));
    if (changed.length) {
      blocks.push(
        '/* The mount, plus the toast and badge — which attach to\n' +
        '   document.body and to the anchor element, so neither\n' +
        '   inherits from the mount. An ancestor rule such as :root\n' +
        "   would lose to the widget's own :host defaults. */\n" +
        `${MOUNT},\n[data-product-highlights] {\n` +
        changed.map((f) => `  ${f.key}: ${cssValue(f)};`).join('\n') +
        '\n}',
      );
    }

    out.value = blocks.length
      ? blocks.join('\n\n')
      : '/* Defaults throughout — nothing to configure.\n' +
        '   ADR 0002: the bottom layer of the cascade is\n' +
        '   the one that carries the load. */';
  }

  function refresh() {
    apply();
    syncAvailability();
    checkGate();
    writeOutput();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && host.hasAttribute('data-open')) {
      // The widget's toast also closes on Escape. Claim the event so adjusting
      // the theme cannot dismiss the surface being themed.
      e.stopPropagation();
      open(false);
    }
  }, true);

  refresh();

  /* Deep-linkable, so a configured state can be shared or screenshotted:
     ?theme opens the panel, ?theme=<preset> opens it on that preset, and
     &layout=<id> selects a layout. */
  const query = new URLSearchParams(location.search);
  const param = query.get('theme');
  if (param !== null) {
    const match = Object.keys(PRESETS)
      .find((n) => n.toLowerCase().startsWith(param.toLowerCase()) && param !== '');
    if (match) usePreset(PRESETS[match]);
    open(true);
  }
  const wanted = query.get('layout');
  if (wanted && LAYOUTS.some((l) => l.id === wanted)) setLayout(wanted);

  return { syncInputs, refresh };
}

build();
