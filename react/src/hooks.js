import { useEffect, useRef, useState } from 'react';

/**
 * True once the element has been seen, and never false again.
 *
 * Motion ships `useInView`, and this is deliberately not it. Content that starts
 * hidden pending an animation must never depend on that animation's trigger
 * actually arriving: an observer that is throttled, detached, or watching an
 * element inside a collapsed container would leave the highlights invisible with
 * no way back. So this is an IntersectionObserver with a hard timeout behind it,
 * and the timeout is the point.
 */
export function useRevealed(ref, { amount = 0.15, backstop = 1600 } = {}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return undefined;

    const el = ref.current;
    if (!el || typeof IntersectionObserver !== 'function') {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setRevealed(true);
      },
      { threshold: amount },
    );
    observer.observe(el);

    const timer = setTimeout(() => setRevealed(true), backstop);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ref, revealed, amount, backstop]);

  return revealed;
}

/**
 * Make a merchant's element a containing block, if it is not one already.
 *
 * Anything positioned against an anchor needs this. Setting it only when the
 * computed position is static keeps the change to their element as small as it
 * can be, and it has no visual effect of its own. Reverted on unmount, so we
 * leave their DOM as we found it.
 */
export function useContainingBlock(anchor) {
  useEffect(() => {
    if (!anchor) return undefined;
    if (getComputedStyle(anchor).position !== 'static') return undefined;

    anchor.style.position = 'relative';
    return () => {
      anchor.style.position = '';
    };
  }, [anchor]);
}

/**
 * Escape, captured at the document so it works wherever focus happens to be —
 * including inside the merchant's own markup, which is the usual case for a
 * shopper who has never touched the toast.
 */
export function useEscape(onEscape, active = true) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handler.current();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [active]);
}
