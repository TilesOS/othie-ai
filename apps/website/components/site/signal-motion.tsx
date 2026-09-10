"use client";

import { motion, useReducedMotion } from "motion/react";

export function SignalMotion() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="signal-line" aria-hidden="true">
      <span />
      <motion.i
        animate={reduceMotion ? undefined : { left: ["5%", "83%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.6, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 0.7 }}
      />
      <span />
      <span />
    </div>
  );
}
