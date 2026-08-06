import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { MouseEvent, ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. Kept small — this is a subtle "catches the
   *  light" effect, not a full 3D card flip. */
  strength?: number;
}

export function TiltCard({ children, className, strength = 7 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const springConfig = { stiffness: 260, damping: 22 };
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [strength, -strength]), springConfig);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-strength, strength]), springConfig);
  const glowX = useTransform(pointerX, [0, 1], ['0%', '100%']);
  const glowY = useTransform(pointerY, [0, 1], ['0%', '100%']);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        // Exposed as CSS vars so a card's own stylesheet can paint a
        // cursor-following glow (see .card::before below) without this
        // component needing to know anything about that card's design.
        // @ts-expect-error -- custom properties aren't in CSSProperties
        '--glow-x': glowX,
        '--glow-y': glowY,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
