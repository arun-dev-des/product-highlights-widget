import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';
import { AvatarStack, Icon } from './icons.jsx';
import { dwellFor } from './content.js';
import { useEscape } from './hooks.js';

/**
 * The toast.
 *
 * A floating card pinned to the bottom of the viewport, cycling the lines a
 * merchant declared for it. It is the only surface here that is neither in the
 * page flow nor anchored to anything, so it is also the only one that must be
 * dismissible — and dismissible in every way a shopper might reach for: drag it
 * down, press the close control, or hit Escape.
 *
 * `background-clip: text` needs a transparent colour to show anything, so the
 * sweep is applied only once support is confirmed. Where it is unsupported the
 * line would otherwise render invisible.
 */
const canClip =
  typeof CSS === 'object' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text'));

const ENTER = { type: 'spring', stiffness: 380, damping: 30, mass: 0.9 };
const LAYOUT = { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 };
const FRAME_IN = { duration: 0.42, ease: [0.16, 1, 0.3, 1] };
const FRAME_OUT = { duration: 0.28, ease: [0.4, 0, 1, 1] };

/** Past this, letting go dismisses. A short throw with speed counts as much as
 *  a long slow one, so a flick works without having to drag the full distance. */
const DISMISS_OFFSET = 56;
const DISMISS_VELOCITY = 480;

/**
 * Join the lines into one string for the screen-reader copy.
 *
 * A period is added only where the line does not already end in sentence
 * punctuation. Joining with a bare ". " gives "ships today.. Free returns" for
 * copy that was already punctuated, and joining with " " runs unpunctuated lines
 * together with no pause. Merchant copy is either, so this handles both.
 */
const asSentences = (lines) =>
  lines.map((l) => (/[.!?…]$/.test(l) ? l : `${l}.`)).join(' ');

export function Toast({ item, onDismissed }) {
  const reduced = useReducedMotion();

  // The title is frame zero; declared messages follow it. One line means no
  // rotation at all, which is the correct behaviour for a payload without them.
  const lines = useMemo(() => [item.title, ...item.messages], [item]);
  const rotates = lines.length > 1;

  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [swept, setSwept] = useState(!canClip || reduced);

  const dismiss = useCallback(() => setOpen(false), []);
  useEscape(dismiss, open);

  /* --- Dwell -------------------------------------------------------------
   *
   * One frame loop drives both the rotation and the indicator that shows it
   * coming, because they are the same clock and keeping them as two would mean
   * keeping them in sync. Held while a pointer or focus is inside the card, and
   * — for free, since requestAnimationFrame does not run in a background tab —
   * while the tab is hidden. An endless animation nobody is looking at is just
   * battery.
   */
  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  const paused = useRef(false);
  const cursor = useRef(0);

  const tick = useCallback(
    (_time, delta) => {
      if (!rotates || !open || paused.current) return;
      // Returning from a background tab delivers one enormous delta, which
      // without a clamp would skip a line the instant the shopper comes back.
      elapsed.current += Math.min(delta, 50);

      const dwell = dwellFor(lines[cursor.current]);
      progress.set(Math.min(1, elapsed.current / dwell));

      if (elapsed.current >= dwell) {
        elapsed.current = 0;
        progress.set(0);
        cursor.current = (cursor.current + 1) % lines.length;
        setIndex(cursor.current);
      }
    },
    [rotates, open, lines, progress],
  );
  useAnimationFrame(tick);

  /* The shimmer class makes the text transparent, and only the CSS
     `animationend` takes it off again. If that event never arrives — animations
     disabled at the OS level, a throttled tab, an element that was never
     painted — the line would be invisible for good. The timer guarantees it
     comes back. */
  useEffect(() => {
    if (swept) return undefined;
    const timer = setTimeout(() => setSwept(true), 2000);
    return () => clearTimeout(timer);
  }, [swept]);

  const hold = () => {
    paused.current = true;
  };
  const release = () => {
    paused.current = false;
  };

  // The card has room for the richer treatment; the list's icon well is a fixed
  // 30px gutter, so it keeps the plain glyph.
  const mark = item.icon === 'avatars' ? <AvatarStack /> : <Icon name={item.icon} className="icon toast-icon" />;

  return (
    <AnimatePresence onExitComplete={onDismissed}>
      {open && (
        <motion.div
          className="pill"
          // Smoothly resizes as each line replaces the last. This is what
          // removed the measurement pass the vanilla build needed: nothing here
          // computes a width, locks a height, or freezes a wrap — the card just
          // springs to whatever the current line asks for.
          layout
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.965 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
          transition={reduced ? { duration: 0.2 } : { ...ENTER, layout: LAYOUT }}
          whileHover={reduced ? undefined : { y: -2 }}
          drag={reduced ? false : 'y'}
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          // Asymmetric on purpose. The card sits at the bottom of the viewport,
          // so down is the direction it can leave in; up barely gives, which
          // tells the hand which way to go without any instruction.
          dragElastic={{ top: 0.04, bottom: 0.55 }}
          onDragStart={hold}
          onDragEnd={(_e, info) => {
            release();
            if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) dismiss();
          }}
          onPointerEnter={hold}
          onPointerLeave={release}
          onFocusCapture={hold}
          onBlurCapture={release}
        >
          {mark}

          <div className="text">
            {/* Only one line is in the DOM at a time, so the rotation is hidden
                from assistive technology and the full set is exposed once,
                statically, below. The alternative — announcing each turn — would
                interrupt a shopper mid-sentence every few seconds. */}
            <p className="rotator title" aria-hidden={rotates ? 'true' : undefined}>
              <AnimatePresence initial={false}>
                <motion.span
                  key={index}
                  className={index === 0 && !swept ? 'frame shimmer' : 'frame'}
                  onAnimationEnd={() => setSwept(true)}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.55em' }}
                  animate={{ opacity: 1, y: 0 }}
                  // Taken out of flow as it leaves, so the incoming line
                  // inherits the flow position immediately and the card resizes
                  // around one line rather than two.
                  exit={
                    reduced
                      ? { opacity: 0, position: 'absolute', top: 0, left: 0 }
                      : { opacity: 0, y: '-0.55em', position: 'absolute', top: 0, left: 0, right: 0 }
                  }
                  transition={reduced ? { duration: 0.2 } : { ...FRAME_IN, exit: FRAME_OUT }}
                >
                  {lines[index]}
                </motion.span>
              </AnimatePresence>
            </p>

            {rotates && <span className="sr-only">{asSentences(lines)}</span>}

            {item.body && <p className="body">{item.body}</p>}
          </div>

          <button type="button" className="close" onClick={dismiss} aria-label="Dismiss">
            <Icon name="close" />
          </button>

          {/* Shows how long the current line holds. Without it the rotation is a
              surprise every time; with it the movement is something the shopper
              can see coming, and the pause on hover becomes legible. */}
          {rotates && !reduced && (
            <span className="dwell" aria-hidden="true">
              <motion.i className="dwell-fill" style={{ scaleX: progress }} />
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
