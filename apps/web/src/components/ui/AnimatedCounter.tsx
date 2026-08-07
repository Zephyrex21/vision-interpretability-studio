import { useEffect, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import type { RefObject } from 'react';

interface AnimatedCounterProps {
  value: number;
  containerRef: RefObject<Element | null>;
  className?: string;
}

/**
 * Counts up from 0 to `value` once `containerRef` scrolls into view.
 * Takes an external ref rather than creating its own so the whole stat
 * chip (icon + number + label) can share one `useInView` trigger instead
 * of each number ticking independently at slightly different times.
 */
export function AnimatedCounter({ value, containerRef, className }: AnimatedCounterProps) {
  const isInView = useInView(containerRef, { once: true, margin: '-20px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => setDisplay(Math.round(latest)));
    return unsubscribe;
  }, [spring]);

  return <span className={className}>{display}</span>;
}
