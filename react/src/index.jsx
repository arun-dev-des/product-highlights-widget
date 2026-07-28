import { Component, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { applyOptions, normalise, resolvePlacements } from './content.js';
import { BADGE_STYLES, LIST_STYLES, TOAST_STYLES } from './styles.js';
import { adoptStyles, ShadowPortal } from './shadow.jsx';
import { Highlights } from './Highlights.jsx';
import { Toast } from './Toast.jsx';
import { Badge } from './Badge.jsx';
import { useRevealed } from './hooks.js';

/**
 * Product Highlights — React build
 * --------------------------------
 * An embeddable, self-contained set of product highlights for ecommerce pages.
 *
 * One script, one payload, four presentations. Each highlight declares where it
 * belongs and the widget renders it there:
 *
 *   "list"    the inline list beneath the buy action  (default)
 *   "rating"  a score panel: a claim, a hairline, a counting numeral and stars
 *   "toast"   a floating card pinned to the viewport, cycling its messages
 *   "badge"   a small pill anchored inside an element the merchant names
 *
 * Placement is declared in the data, never derived from `type`. The merchant
 * knows where their product image is; we never do. And anything that cannot be
 * placed falls back to the list — no anchor match, unknown placement, a second
 * item asking for the toast. Every item always ends up somewhere.
 *
 * Three shadow roots, one React tree. The list and rating panel render into a
 * root on the merchant's mount element; the toast and badge are portalled into
 * roots of their own. Isolation is unchanged from the vanilla build — styles go
 * in on `:host` as a constructable stylesheet, and nothing crosses either way.
 *
 * Usage — auto-mount from a script tag:
 *   <script src="product-highlights.react.js"
 *           data-mount="#slot" data-content="highlights.json"></script>
 *
 * Usage — programmatic:
 *   ProductHighlights.mount('#slot', { content: { highlights: [...] } });
 */

/**
 * A third-party widget has no business taking a merchant's page down with it.
 * Each surface is wrapped separately, so a throw inside the toast costs the
 * toast and nothing else — the list stays up, the page stays up.
 */
class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[product-highlights] surface failed:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * One reveal, shared by every surface.
 *
 * The list decides when the set has been seen, and the toast and badge follow
 * it. That ordering is deliberate: the highlights a shopper scrolled to should
 * land before the two that arrive on their own, or all three compete for the
 * same glance.
 */
function Widget({ listItems, rating, toast, badges, label }) {
  const rootRef = useRef(null);
  const revealed = useRevealed(rootRef);
  const [toastLive, setToastLive] = useState(true);

  return (
    <>
      <Boundary>
        <Highlights
          rootRef={rootRef}
          items={listItems}
          rating={rating}
          label={label}
          revealed={revealed}
        />
      </Boundary>

      {toast && revealed && toastLive && (
        <Boundary>
          {/* On the body, not in the mount. `position: fixed` resolves against
              the nearest ancestor with a transform, filter or perspective rather
              than the viewport, and we cannot know what a merchant has applied
              further up their tree. A body-level element has no such ancestor. */}
          <ShadowPortal container={document.body} css={TOAST_STYLES} name="toast">
            <Toast item={toast} onDismissed={() => setToastLive(false)} />
          </ShadowPortal>
        </Boundary>
      )}

      {badges.map(({ item, anchor }, i) => (
        <Boundary key={`${item.title}-${i}`}>
          <ShadowPortal container={anchor} css={BADGE_STYLES} name="badge">
            <Badge item={item} anchor={anchor} revealed={revealed} />
          </ShadowPortal>
        </Boundary>
      ))}
    </>
  );
}

/* One toast per page load, however many widgets are mounted. A second mount does
   not lose its toast item — `applyOptions` returns it to the list, the same path
   an explicit opt-out takes. */
let toastClaimed = false;
const mounted = [];

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
 * @param {boolean} [options.rating]    Set false to keep the rating item in the list.
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
    // Nothing renderable: leave the page exactly as we found it. No empty box,
    // no stray rule, no reserved space.
    if (items.length === 0) return null;

    const resolved = resolvePlacements(items);
    const plan = applyOptions(items, resolved, {
      ...options,
      toast: toastClaimed ? false : options.toast,
    });
    if (plan.toast) toastClaimed = true;

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.replaceChildren();
    adoptStyles(shadow, LIST_STYLES);

    const root = createRoot(shadow);
    root.render(
      <Widget
        listItems={plan.listItems}
        rating={plan.rating}
        toast={plan.toast}
        badges={plan.badges}
        label={options.label || 'Product highlights'}
      />,
    );
    mounted.push(root);

    return host;
  } catch (err) {
    // Report, render nothing, let the page carry on.
    console.warn('[product-highlights] did not render:', err);
    return null;
  }
}

/** Exposed for the dev harness so the surfaces can be replayed. */
export function _reset() {
  mounted.splice(0).forEach((root) => root.unmount());
  document.querySelectorAll('[data-product-highlights]').forEach((n) => n.remove());
  toastClaimed = false;
}

/* -------------------------------------------------------------------------
 * Auto-mount
 *
 * `document.currentScript` is set for the built iife bundle and null inside an
 * ES module, so the tag is located by its data attributes as a fallback — which
 * is the path the dev server takes.
 * ---------------------------------------------------------------------- */
const tag =
  (typeof document !== 'undefined' && document.currentScript) ||
  document.querySelector('script[data-mount][data-content]');

if (tag && tag.dataset && tag.dataset.mount) {
  mount(tag.dataset.mount, {
    url: tag.dataset.content,
    label: tag.dataset.label || undefined,
  });
}
