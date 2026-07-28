import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Star, Well } from './icons.jsx';

/**
 * The list, and the rating panel that sits above it.
 *
 * Both live in the shadow root attached to the merchant's own mount element, so
 * this is the surface that has to feel like part of the page rather than a thing
 * placed on it. Hairlines above and below, the page's own left edge, no box.
 */

/* Leads the eye down the column in reading order, once, when the set first
   comes into view. Fast enough that a shopper who is already looking does not
   wait for it: five rows are fully in at 320ms. */
const listVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0, 0, 1] } },
};

/* Reduced motion asks for less movement, not less content. Everything still
   appears — it simply arrives rather than rises, all at once, with no stagger to
   sit through. */
const still = { hidden: { opacity: 1, y: 0 }, shown: { opacity: 1, y: 0 } };

function Rating({ item, revealed, reduced }) {
  const pct = Math.max(0, Math.min(100, (item.rating / item.scale) * 100));
  // One decimal place unless the score is whole, so 5 reads as "5" not "5.0".
  const whole = Number.isInteger(item.rating);
  const shown = whole ? String(item.rating) : item.rating.toFixed(1);

  // Counting up rather than appearing is the one flourish in this surface, and
  // it earns its place: it draws the eye to the number that answers "is this
  // any good", and it lands in step with the stars filling beneath it.
  const count = useMotionValue(0);
  const label = useTransform(count, (v) => (whole ? String(Math.round(v)) : v.toFixed(1)));

  useEffect(() => {
    if (!revealed) return undefined;
    if (reduced) {
      count.set(item.rating);
      return undefined;
    }
    const controls = animate(count, item.rating, {
      duration: 0.9,
      delay: 0.12,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [revealed, reduced, item.rating, count]);

  return (
    <motion.div className="rating" variants={reduced ? still : itemVariants}>
      <p className="rating-claim">{item.body || item.title}</p>
      <div className="rating-score" role="img" aria-label={`Rated ${shown} out of ${item.scale}`}>
        {/* The motion value is rendered directly, so the count updates without
            re-rendering the panel on every frame. */}
        <motion.span className="rating-value" aria-hidden="true">
          {label}
        </motion.span>
        <span className="stars" aria-hidden="true">
          <span className="stars-row stars-track">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} />
            ))}
          </span>
          {/* Width, not scaleX: the fill is a clipping window, and scaling it
              would squash the stars inside instead of revealing more of them. */}
          <motion.span
            className="stars-fill"
            initial={{ width: '0%' }}
            animate={{ width: revealed ? `${pct}%` : '0%' }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <span className="stars-row">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} />
              ))}
            </span>
          </motion.span>
        </span>
      </div>
    </motion.div>
  );
}

export function Highlights({ rootRef, items, rating, label, revealed }) {
  const reduced = useReducedMotion();
  const variants = reduced ? still : itemVariants;

  return (
    <motion.div
      ref={rootRef}
      className="root"
      initial="hidden"
      animate={revealed ? 'shown' : 'hidden'}
      variants={reduced ? undefined : listVariants}
    >
      {rating && <Rating item={rating} revealed={revealed} reduced={reduced} />}

      {/* A real list, so assistive technology announces the set and its length
          before reading through it. */}
      <ul className="list" aria-label={label}>
        {items.map((item, i) => (
          <motion.li className="item" key={`${item.title}-${i}`} variants={variants}>
            <Well name={item.icon} />
            <div className="text">
              <p className="title">{item.title}</p>
              {item.body && <p className="body">{item.body}</p>}
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
