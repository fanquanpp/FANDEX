import type { Variants, Transition } from 'motion/react';
import { motionDuration, motionEasing, motionSpring, motionStagger, motionTravel } from './tokens';

const tFast: Transition = { duration: motionDuration.fast, ease: motionEasing.out };

const tNormal: Transition = { duration: motionDuration.normal, ease: motionEasing.out };

const tReveal: Transition = { duration: motionDuration.slow, ease: motionEasing.out };

const tExit: Transition = { duration: motionDuration.fast, ease: motionEasing.in };

export const enterUp: Variants = {
  hidden: { opacity: 0, y: motionTravel.medium },
  visible: { opacity: 1, y: 0, transition: tNormal },
};

export const enterDown: Variants = {
  hidden: { opacity: 0, y: -motionTravel.medium },
  visible: { opacity: 1, y: 0, transition: tNormal },
};

export const enterLeft: Variants = {
  hidden: { opacity: 0, x: motionTravel.medium },
  visible: { opacity: 1, x: 0, transition: tNormal },
};

export const enterRight: Variants = {
  hidden: { opacity: 0, x: -motionTravel.medium },
  visible: { opacity: 1, x: 0, transition: tNormal },
};

export const enterScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: motionSpring.gentle },
};

export const enterFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tNormal },
};

export const exitUp: Variants = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: -motionTravel.small, transition: tExit },
};

export const exitDown: Variants = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: motionTravel.small, transition: tExit },
};

export const exitScale: Variants = {
  visible: { opacity: 1, scale: 1 },
  hidden: { opacity: 0, scale: 0.96, transition: tExit },
};

export const hoverLift: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -motionTravel.micro, scale: 1.01, transition: tFast },
};

export const tapPress: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.98, transition: tFast },
};

export const hoverSignal: Variants = {
  rest: { scaleX: 0 },
  hover: { scaleX: 1, transition: tFast },
};

export const layoutTransition: Transition = motionSpring.gentle;

export const revealUp: Variants = {
  hidden: { opacity: 0, y: motionTravel.large },
  visible: { opacity: 1, y: 0, transition: tReveal },
};

export const revealLeft: Variants = {
  hidden: { opacity: 0, x: motionTravel.section },
  visible: { opacity: 1, x: 0, transition: tReveal },
};

export const revealScale: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: tReveal },
};

export const revealViewport: { once: boolean; amount: number } = {
  once: true,
  amount: 0.2,
};

export function createStaggerContainer(
  stagger: number = motionStagger.normal,
  delayChildren: number = 0
): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const staggerFast: Variants = createStaggerContainer(motionStagger.fast);

export const staggerNormal: Variants = createStaggerContainer(motionStagger.normal);

export const staggerSlow: Variants = createStaggerContainer(motionStagger.slow);

export const attentionBreath: Variants = {
  idle: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: motionDuration.attention,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

export const attentionPulse: Variants = {
  idle: {
    scale: [1, 1.05, 1],
    transition: {
      duration: motionDuration.attention,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

export const revealMasked: Variants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  visible: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0)',
    transition: tReveal,
  },
};

export const pageFade: Variants = {
  hidden: { opacity: 0, y: motionTravel.small },
  visible: { opacity: 1, y: 0, transition: tNormal },
  exit: { opacity: 0, y: -motionTravel.small, transition: tExit },
};

export const marqueeScroll: Transition = {
  duration: 40,
  ease: 'linear',
  repeat: Infinity,
};

export const hoverGlow: Variants = {
  rest: {
    boxShadow: '0 0 0 0 color-mix(in srgb, var(--color-accent-base) 0%, transparent)',
  },
  hover: {
    boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-accent-base) 18%, transparent)',
    transition: tFast,
  },
};

export const tapRipple: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.96, transition: tFast },
};
