import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * Page-level entrance: subtle opacity + vertical movement, 180–280ms.
 * Disabled under prefers-reduced-motion.
 */
export function PageFade({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & HTMLMotionProps<"div">) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  y = 10,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.26, delay: reduced ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Short stagger container for card lists. */
export function Stagger({
  children,
  className,
  step = 0.06,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : step } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.26, ease: EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
