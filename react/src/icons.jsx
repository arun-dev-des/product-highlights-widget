/**
 * Icons.
 *
 * Inline SVG rather than an icon font or sprite sheet: no extra request, no
 * FOUT, and they inherit colour and stroke weight from the surrounding text.
 * All drawn on the same 24px grid at a single light stroke weight so they carry
 * equal optical weight down the column.
 *
 * Authored as JSX rather than as markup strings, which is the one place the
 * framework buys real safety: there is no `innerHTML` anywhere in this build, so
 * the question of whether a given string is ours or a merchant's cannot arise.
 */

const PATHS = {
  truck: (
    <>
      <path d="M2.5 6.5h11.5v9.5H2.5z" />
      <path d="M14 10h4.2l3.3 3.4V16H14z" />
      <circle cx="6.75" cy="18" r="2" />
      <circle cx="17.25" cy="18" r="2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 2.8v5.6c0 4.4-3 8.2-7.5 9.6-4.5-1.4-7.5-5.2-7.5-9.6V5.8z" />
      <path d="M9 12l2.2 2.2L15.2 10" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.7 6.2.7-4.6 4.2 1.3 6.1L12 17.1l-5.5 3.1 1.3-6.1L3.2 9.9l6.2-.7z" />,
  leaf: (
    <>
      <path d="M4.5 19.5c0-8 5.5-15 16-15.5.5 10-5.5 16-16 15.5z" />
      <path d="M4.5 19.5C7 15 10.5 11.8 15 9.5" />
    </>
  ),
  ruler: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="1" />
      <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
    </>
  ),
  // Three overlapping avatars. The two behind are drawn as major arcs that stop
  // at their neighbour's edge rather than as full circles knocked out with a
  // fill, so the overlap reads correctly on any background.
  avatars: (
    <>
      <path d="M9.25 8.44A4.5 4.5 0 1 0 9.25 15.56" />
      <path d="M14.75 8.44A4.5 4.5 0 1 0 14.75 15.56" />
      <circle cx="17.5" cy="12" r="4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  // Shown when a merchant sends an icon name we do not recognise. Never a broken
  // image, never an empty gap.
  _fallback: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.5v4.5M12 8h.01" />
    </>
  ),
};

/** A stroked glyph on the shared 24px grid. */
export function Icon({ name, className = 'icon' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name] ?? PATHS._fallback}
      </svg>
    </span>
  );
}

/** The one filled glyph, used five times per row in the score. */
export function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {PATHS.star}
    </svg>
  );
}

/**
 * Three overlapping avatar discs, each holding an anonymous figure.
 *
 * Figures rather than photographs: real portraits would mean loading images from
 * somewhere, which on a third-party widget means an extra request and a privacy
 * question on someone else's page. The silhouette carries the same meaning —
 * "these are people" — at zero cost. Merchant-supplied portraits would be a
 * reasonable extension, and would slot into the same clip path.
 */
export function AvatarStack() {
  return (
    <span className="avatars" aria-hidden="true">
      <svg viewBox="0 0 43 28" fill="none">
        <defs>
          {[0, 1, 2].map((i) => (
            <clipPath key={i} id={`hl-av-${i}`}>
              <circle r="8.6" />
            </clipPath>
          ))}
        </defs>
        {[10, 21.5, 33].map((cx, i) => (
          <g key={i} transform={`translate(${cx} 14)`}>
            <circle className="av-disc" r="8.6" />
            <g clipPath={`url(#hl-av-${i})`}>
              <circle className="av-figure" cy="-2.3" r="3.2" />
              <path className="av-figure" d="M-5.9 10c0-3.8 2.6-5.9 5.9-5.9s5.9 2.1 5.9 5.9z" />
            </g>
            <circle className="av-ring" r="8.6" />
          </g>
        ))}
      </svg>
    </span>
  );
}

/** The list's glyph, seated in its warm well. */
export function Well({ name }) {
  return (
    <span className="well">
      <Icon name={name} />
    </span>
  );
}
