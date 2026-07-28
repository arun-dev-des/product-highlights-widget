import { motion, useReducedMotion } from 'motion/react';
import { Icon } from './icons.jsx';
import { useContainingBlock } from './hooks.js';

/**
 * The badge.
 *
 * A small label inside an element the merchant named — here, the product image.
 * It is appended into that element rather than positioned against it from the
 * body, so it tracks its anchor through every scroll and resize with no
 * listeners, no measurement and no chance of drifting out of place.
 */
export function Badge({ item, anchor, revealed }) {
  const reduced = useReducedMotion();
  useContainingBlock(anchor);

  return (
    <motion.div
      className="pill"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96, filter: 'blur(3px)' }}
      animate={
        revealed
          ? reduced
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
          : undefined
      }
      transition={
        reduced
          ? { duration: 0.2 }
          : // Held back a beat so it lands after the list rather than with it.
            // Two things arriving at once on opposite sides of the page splits
            // the eye; one after the other leads it.
            { type: 'spring', stiffness: 340, damping: 26, mass: 0.8, delay: 0.28 }
      }
    >
      <Icon name={item.icon} />
      {/* The title appears in no other surface, so unlike the toast's rotator it
          is never hidden from assistive technology. */}
      <p className="label">{item.title}</p>
    </motion.div>
  );
}
