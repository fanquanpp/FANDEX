
export const motionDuration = {
  instant: 0.075,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
  attention: 2.0,
} as const;

export const motionEasing = {
  default: [0.4, 0, 0.2, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
};

export const motionSpring = {
  soft: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 },
  gentle: { type: 'spring' as const, stiffness: 280, damping: 24, mass: 1 },
  snappy: { type: 'spring' as const, stiffness: 520, damping: 34, mass: 1 },
  slow: { type: 'spring' as const, stiffness: 120, damping: 18, mass: 1 },
};

export const motionStagger = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.2,
};

export const motionTravel = {
  micro: 4,
  small: 8,
  medium: 12,
  large: 16,
  section: 32,
};
