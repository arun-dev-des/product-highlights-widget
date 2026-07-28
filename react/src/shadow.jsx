import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Shadow roots, as React portals.
 *
 * The widget renders across three shadow roots — the list and rating panel share
 * the merchant's mount element, the toast lives on the body, the badge inside an
 * element the merchant names. In the vanilla build those were three independent
 * imperative render paths. Here they are one React tree that portals across the
 * boundaries, so state is shared and teardown is automatic.
 *
 * Nothing about the isolation changes. Styles still go in as a constructable
 * stylesheet on `:host`; the host page still cannot reach in and we still cannot
 * reach out.
 */

const supportsAdopted =
  typeof CSSStyleSheet === 'function' &&
  'adoptedStyleSheets' in Document.prototype &&
  'replaceSync' in CSSStyleSheet.prototype;

/** Parse each stylesheet once and share the object across every root that
 *  adopts it, rather than re-parsing the same CSS per surface. */
const sheets = new Map();
function sheetFor(css) {
  let sheet = sheets.get(css);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sheets.set(css, sheet);
  }
  return sheet;
}

export function adoptStyles(root, css) {
  if (supportsAdopted) {
    root.adoptedStyleSheets = [sheetFor(css)];
    return;
  }
  const style = document.createElement('style');
  style.textContent = css;
  root.appendChild(style);
}

/**
 * Mount a fresh host element into `container`, give it a shadow root and this
 * stylesheet, and render `children` inside it.
 *
 * Returns null on the first render, because the root does not exist until the
 * effect has run. Every caller is a surface that animates in anyway, so the
 * extra frame costs nothing visible.
 */
export function ShadowPortal({ container, css, name, children }) {
  const [root, setRoot] = useState(null);

  useEffect(() => {
    if (!container) return undefined;

    const host = document.createElement('div');
    host.setAttribute('data-product-highlights', name);
    const shadow = host.attachShadow({ mode: 'open' });
    adoptStyles(shadow, css);
    container.appendChild(host);
    setRoot(shadow);

    // Takes the host element with it. An invisible fixed-position layer left
    // sitting over a merchant's page is a bug even when it renders nothing.
    return () => {
      setRoot(null);
      host.remove();
    };
  }, [container, css, name]);

  return root ? createPortal(children, root) : null;
}
