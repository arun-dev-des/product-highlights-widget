/**
 * Content layer.
 *
 * Ported unchanged in behaviour from the vanilla widget, because it was never
 * the part a framework helps with. These are pure functions from untrusted
 * input to a shape the components can render without defending themselves, and
 * they are the whole resilience story: nothing downstream re-validates, because
 * nothing downstream has to.
 */

export const ICON_NAMES = [
  'truck',
  'shield',
  'star',
  'leaf',
  'ruler',
  'avatars',
  '_fallback',
];

const PLACEMENTS = new Set(['list', 'toast', 'badge', 'rating']);

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

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
export function normalise(content) {
  const list = content && Array.isArray(content.highlights) ? content.highlights : [];

  return list.reduce((items, raw) => {
    if (!raw || typeof raw !== 'object') return items;
    if (!isNonEmptyString(raw.title)) return items; // nothing to label a row with

    const scale = finiteInRange(raw.scale, 1, 100) ?? 5;

    items.push({
      title: raw.title.trim(),
      // An absent body is legitimate — the row is simply title-only.
      body: isNonEmptyString(raw.body) ? raw.body.trim() : null,
      icon: ICON_NAMES.includes(raw.icon) && raw.icon[0] !== '_' ? raw.icon : '_fallback',
      // Unknown or absent placement means the list, which every item can use.
      placement: PLACEMENTS.has(raw.placement) ? raw.placement : 'list',
      anchor: isNonEmptyString(raw.anchor) ? raw.anchor.trim() : null,
      // Structured, so stars can be drawn from a number rather than scraped out
      // of the sentence next to them.
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

/** An anchor selector is merchant input, so an invalid one is a typo and not a
 *  crash. Returns the element, or null for "no such place". */
function matchAnchor(selector) {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * Decide where each item actually renders.
 *
 * The rule that makes distributed placement safe: anything that cannot be
 * placed falls back to the list. A missing anchor, an anchor selector that
 * matches nothing, a second item competing for the toast — all demote rather
 * than disappear. Every item always ends up somewhere.
 */
export function resolvePlacements(items) {
  const list = [];
  const badges = [];
  let toast = null;
  let rating = null;

  for (const item of items) {
    if (item.placement === 'toast' && !toast) {
      toast = item;
      continue;
    }

    // A rating panel without a usable score is just a sentence, so it becomes a
    // list row rather than an empty box with no stars in it.
    if (item.placement === 'rating' && !rating && item.rating !== null) {
      rating = item;
      continue;
    }

    if (item.placement === 'badge' && item.anchor) {
      const anchor = matchAnchor(item.anchor);
      if (anchor) {
        badges.push({ item, anchor });
        continue;
      }
    }

    list.push(item);
  }

  return { list, toast, badges, rating };
}

/**
 * Apply the surface opt-outs, returning items to the list rather than dropping
 * them, so the payload always renders in full whatever is switched off.
 */
export function applyOptions(items, resolved, options) {
  const listItems = [...resolved.list];
  if (options.toast === false && resolved.toast) listItems.push(resolved.toast);
  if (options.badges === false) listItems.push(...resolved.badges.map((b) => b.item));
  if (options.rating === false && resolved.rating) listItems.push(resolved.rating);
  listItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));

  return {
    listItems,
    rating: options.rating === false ? null : resolved.rating,
    toast: options.toast === false ? null : resolved.toast,
    badges: options.badges === false ? [] : resolved.badges,
  };
}

/** How long a line holds before the next scrolls up. Scaled to its length, so a
 *  long sentence is not swapped out before it can be read. */
export const dwellFor = (text) => Math.min(6500, Math.max(2400, (text?.length ?? 0) * 62));
